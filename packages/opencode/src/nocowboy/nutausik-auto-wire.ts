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
import { hasNutausik, autoStartSession, autoEndSession, callTool } from "./nutausik-client"
import { runAll as runStartupChecks } from "./startup-checks"
import * as Log from "@nocowboy/core/util/log"
import * as fs from "node:fs"
import * as path from "node:path"
import { homedir } from "node:os"
import { Launcher } from "./mcp/launcher"
import { McpLifecycle } from "./mcp/lifecycle"

const log = Log.create({ service: "nutausik.auto-wire" })

const HOOKS_FILE = path.join(homedir(), ".nocowboy", "hooks.json")

const NUTAUSIK_PORT = 9210

/**
 * Auto-start NUTAUSIK MCP server if it's not running.
 * Delegates to McpLifecycle which handles proxy resolution, PID/port tracking.
 * Called on session creation — fire-and-forget.
 */
async function ensureNutausikRunning(): Promise<void> {
  if (await hasNutausik()) return // already running

  try {
    const cmd = await Launcher.command("nutausik")
    if (!cmd) { log.warn("nutausik auto-start: no launch command found"); return }

    const info = await McpLifecycle.startOne("nutausik", cmd, NUTAUSIK_PORT)
    log.info("nutausik auto-started", { pid: info.pid, port: info.port })
  } catch (e) {
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
        command: "sh",
        args: [
          "-c",
          'cat | python3 -c "\nimport sys,json,subprocess\nctx=json.loads(sys.stdin.read())\ntool=ctx.get(\'tool_name\',\'\')\nargs=ctx.get(\'tool_args\',{})\n# Extract relevant detail from args\nif tool==\'bash\': detail=\'cmd: \' + args.get(\'command\',\'\')[:80]\nelif tool in (\'edit\',\'write\'): detail=\'file: \' + args.get(\'filePath\',args.get(\'file\',\'\'))[:80]\nelif tool==\'search_replace\': detail=\'file: \' + args.get(\'filePath\',\'\')[:80]\nelse: detail=\'\'\nmsg=f\'{tool} — completed ({detail})\' if detail else f\'{tool} — completed\'\nsubprocess.run([\'curl\',\'-s\',\'-X\',\'POST\',\'http://127.0.0.1:9210/mcp\',\'-H\',\'Content-Type: application/json\',\'-d\',json.dumps({\'jsonrpc\':\'2.0\',\'id\':1,\'method\':\'tools/call\',\'params\':{\'name\':\'nutausik_task_log\',\'arguments\':{\'message\':msg,\'phase\':\'execute\'}}})],capture_output=True)\n"',
        ],
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
  autoEndSession(sessionID, directory).catch(() => {})

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
      }).catch(() => {})
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
