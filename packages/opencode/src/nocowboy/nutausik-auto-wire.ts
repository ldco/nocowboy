//
// Replaces the manual nutausik-hooks.sh with native code wired into
// the NoCowboy session lifecycle:
//   - SessionStart → auto-create NUTAUSIK session + task (onSessionCreated)
//   - tool logging → the shell PostToolUse hook was removed; it wrote a
//                    literal endpoint and bypassed the client/env override
//   - SessionEnd   → close NUTAUSIK session + save handoff + compact memory
//
// All MCP communication is delegated to nutausik-client.ts.

import { shouldAutoDream, shouldAutoDistill, DREAM_TASK, DISTILL_TASK } from "./session/auto-dream"
import { saveMetrics } from "./session-metrics"
import { hasNutausik, autoStartSession, autoEndSession, callTool } from "./nutausik-client"
import { runAll as runStartupChecks } from "./startup-checks"
import * as Log from "@nocowboy/core/util/log"
import { Launcher } from "./mcp/launcher"
import { McpLifecycle } from "./mcp/lifecycle"
import { PuppetMaster } from "./puppetmaster"

const log = Log.create({ service: "nutausik.auto-wire" })

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

  // Auto-dream memory consolidation (every 7 days)
  if (shouldAutoDream()) {
    try {
      callTool("nutausik_task_quick", {
        title: "Auto Dream",
        goal: DREAM_TASK,
      }, { projectDir: directory }).then((r) => { if (!r.ok) log.warn("auto-dream task failed", { code: r.error.code }) })
    } catch { /* fire-and-forget */ }
  }

  // Auto-distill workflow detection (every 30 days)
  if (shouldAutoDistill()) {
    try {
      callTool("nutausik_task_quick", {
        title: "Auto Distill",
        goal: DISTILL_TASK,
      }, { projectDir: directory }).then((r) => { if (!r.ok) log.warn("auto-distill task failed", { code: r.error.code }) })
    } catch { /* fire-and-forget */ }
  }
}

/**
 * Called when a NoCowboy session is removed/ended.
 * Auto-ends the NUTAUSIK session, saves handoff, compacts memory.
 */
export function onSessionEnded(sessionID: string, directory: string): void {
  autoEndSession(sessionID, directory).catch(() => {})

  // Auto-save PuppetMaster 4 project context as NUTAUSIK memory
  try {
    if (PuppetMaster.isProject(directory)) {
      callTool("nutausik_memory_add", {
        type: "context",
        title: `PM session ${sessionID.slice(0, 8)}`,
        content: `Session completed in PuppetMaster 4 project at ${directory}. PM4: SvelteKit 2 + Svelte 5 runes + Vite 7 + Tailwind v4; typed config src/project/pm.config.ts; ModuleManifest src/lib/config/modules.ts is the single module source; AGENTS.md is authoritative; async libSQL via @libsql/client; Zod on all inputs.`,
        tags: "pm4,sveltekit,tailwind,libsql",
      }, { projectDir: directory, sessionID }).then((r) => { if (!r.ok) log.warn("PM memory add failed", { code: r.error.code }) })
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
