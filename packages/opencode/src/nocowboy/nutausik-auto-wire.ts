//
// Replaces the manual nutausik-hooks.sh with native code wired into
// the NoCowboy session lifecycle:
//   - SessionStart → auto-create NUTAUSIK session + task (onSessionCreated)
//   - PostToolUse  → log tool calls to the task (via hooks MCP registration)
//   - SessionEnd   → close NUTAUSIK session + save handoff + compact memory
//
// All MCP communication is delegated to nutausik-client.ts.

import { shouldAutoDream, shouldAutoDistill, DREAM_TASK, DISTILL_TASK } from "./session/auto-dream"
import { saveMetrics } from "./session-metrics"
import { hasNutausik, autoStartSession, autoEndSession, callTool, flushMemory } from "./nutausik-client"
import { runAll as runStartupChecks } from "./startup-checks"
import * as Log from "@nocowboy/core/util/log"
import * as fs from "node:fs"
import * as path from "node:path"
import { homedir } from "node:os"
import { Launcher } from "./mcp/launcher"
import { McpLifecycle } from "./mcp/lifecycle"

const log = Log.create({ service: "nutausik.auto-wire" })

const HOOKS_FILE = path.join(homedir(), ".nocowboy", "hooks.json")

/**
 * PostToolUse logging hook body. Dependency-free (Node + global fetch), and it
 * resolves the endpoint from NUTAUSIK_MCP_URL with the same default the client
 * uses — so the env override is honoured instead of a hardcoded shell endpoint.
 */
const TOOL_LOG_HOOK_SCRIPT = [
  'let s="";process.stdin.on("data",d=>s+=d).on("end",async()=>{',
  "  try{",
  '    const ctx=JSON.parse(s||"{}");const tool=ctx.tool_name||"";',
  "    const args=ctx.tool_args||{};let detail=\"\";",
  '    if(tool==="bash")detail=String(args.command||"").slice(0,80);',
  '    else if(["edit","write","search_replace"].includes(tool))detail=String(args.filePath||args.file||"").slice(0,80);',
  '    const msg=detail?tool+" — completed ("+detail+")":tool+" — completed";',
  '    const url=process.env.NUTAUSIK_MCP_URL||"http://127.0.0.1:9210/mcp";',
  '    await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"nutausik_task_log",arguments:{message:msg,phase:"execute",projectDir:process.cwd()}}})});',
  "  }catch(e){void e}",
  "});",
].join("\n")

const NUTAUSIK_PORT = 9210
// The proxy binds the port itself, moments after it is spawned, so the wait only
// needs to cover process startup. It is short on purpose: the instance bootstrap
// awaits this before building MCP state, and a long wait there would stall every
// instance. A failed attempt is not repeated for every instance either.
const READY_TIMEOUT_MS = 3_000
const READY_INTERVAL_MS = 200
const FAILED_RETRY_COOLDOWN_MS = 60_000
let lastFailureAt = 0

/**
 * Auto-start NUTAUSIK MCP server if it's not running.
 * Delegates to McpLifecycle which handles proxy resolution, PID/port tracking.
 * Awaits readiness (bounded) so callers can rely on the port answering.
 */
export async function ensureNutausikRunning(timeoutMs = READY_TIMEOUT_MS): Promise<void> {
  if (await hasNutausik()) return // already running

  // One failed start must not make every later instance pay the full wait.
  if (Date.now() - lastFailureAt < FAILED_RETRY_COOLDOWN_MS) return

  try {
    const cmd = await Launcher.command("nutausik")
    if (!cmd) {
      lastFailureAt = Date.now()
      log.warn("nutausik auto-start: no launch command found")
      return
    }

    const info = await McpLifecycle.startOne("nutausik", cmd, NUTAUSIK_PORT)
    log.info("nutausik auto-started", { pid: info.pid, port: info.port })

    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (await hasNutausik()) return
      await new Promise((resolve) => setTimeout(resolve, READY_INTERVAL_MS))
    }
    lastFailureAt = Date.now()
    log.warn("nutausik auto-start: proxy did not become ready", { timeout: timeoutMs })
  } catch (e) {
    lastFailureAt = Date.now()
    log.warn("nutausik auto-start failed", { error: String(e) })
  }
}

/**
 * Register a PostToolUse hook that logs tool calls to NUTAUSIK.
 * Writes directly to ~/.nocowboy/hooks.json — the hooks MCP reads it dynamically.
 */
/**
 * Register a PostToolUse hook that logs tool calls to NUTAUSIK.
 * Writes directly to ~/.nocowboy/hooks.json — the hooks MCP reads it dynamically.
 */
function registerToolLoggingHook(): void {
  try {
    if (!fs.existsSync(HOOKS_FILE)) {
      fs.writeFileSync(HOOKS_FILE, JSON.stringify({ hooks: {} }, null, 2))
    }
    const config = JSON.parse(fs.readFileSync(HOOKS_FILE, "utf-8"))
    if (!config.hooks) config.hooks = {}
    if (!config.hooks.PostToolUse) config.hooks.PostToolUse = []

    if (!config.hooks.PostToolUse.some((h: any) => h.id === "nutausik-log")) {
      config.hooks.PostToolUse.push({
        id: "nutausik-log",
        event: "PostToolUse",
        matcher: "*",
        type: "command",
        // One-line Node script: no python/curl, and the endpoint honours the same
        // NUTAUSIK_MCP_URL override the in-process client uses (no literal bypass).
        command: "node",
        args: ["-e", TOOL_LOG_HOOK_SCRIPT],
      })
      fs.writeFileSync(HOOKS_FILE, JSON.stringify(config, null, 2))
      log.info("registered PostToolUse logging hook")
    }
  } catch (e) {
    log.warn("failed to register PostToolUse hook", { error: String(e) })
  }
}

/**
 * Called when a NoCowboy session is created.
 * Auto-starts the NUTAUSIK MCP server if needed, starts the NUTAUSIK session and
 * registers a PostToolUse hook. No task is created per session — see
 * autoStartSession().
 */
export function onSessionCreated(sessionID: string, title: string, directory: string): void {
  // Single flight: ensureNutausikRunning guards against duplicate proxy startup
  // (two parallel startOne() calls raced and one failed with EADDRINUSE on the port).
  const ready = ensureNutausikRunning()

  ready
    .then(() => autoStartSession(sessionID, directory))
    .catch(() => {})

  ready
    .then(() => runStartupChecks(directory))
    .catch(() => {})

  registerToolLoggingHook()

  // Auto-dream memory consolidation (every 7 days)
  if (shouldAutoDream()) {
    try {
      callTool("nutausik_task_quick", {
        title: "Auto Dream",
        goal: DREAM_TASK,
      }).catch(() => {})
    } catch { /* fire-and-forget */ }
  }

  // Auto-distill workflow detection (every 30 days)
  if (shouldAutoDistill()) {
    try {
      callTool("nutausik_task_quick", {
        title: "Auto Distill",
        goal: DISTILL_TASK,
      }).catch(() => {})
    } catch { /* fire-and-forget */ }
  }
}

/**
 * Called when a NoCowboy session is removed/ended.
 * Auto-ends the NUTAUSIK session, saves handoff, compacts memory.
 */
export function onSessionEnded(sessionID: string, directory: string): void {
  // Bounded shutdown flush: wait (up to 2s) for the session-end writes before the
  // process goes away, then stop — never blocks indefinitely.
  autoEndSession(sessionID, directory)
    .then(() => flushMemory(2000))
    .catch(() => {})

  // Auto-save PM project context as NUTAUSIK memory
  try {
    const { existsSync } = require("node:fs")
    const { join } = require("node:path")
    const configPath = join(directory, "project", "puppet-master.config.ts")
    if (existsSync(configPath)) {
      callTool("nutausik_memory_add", {
        type: "context",
        title: `PM session ${sessionID.slice(0, 8)}`,
        content: `Session completed in PM v3 project at ${directory}. PM rules: Tailwind-only, clsx+twMerge, no global CSS, .dark {} class-based, $state/$derived.`,
        tags: "pm,sveltekit,tailwind",
      }, directory).catch(() => {})
    }
  } catch {} // fire-and-forget
  // Save session metrics (non-blocking, errors ignored)
  try {
    saveMetrics({
      sessionID,
      title: "",
      agent: "",
      startTime: 0,
      endTime: Date.now(),
      durationMs: 0,
      messageCount: 0,
      toolCallCount: 0,
      inputTokens: 0,
      outputTokens: 0,
    })
  } catch { /* fire-and-forget */ }
}
