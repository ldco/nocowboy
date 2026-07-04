// nocowboy_change — NUTAUSIK session auto-wiring
//
// Replaces the manual nutausik-hooks.sh with native code wired into
// the NoCowboy session lifecycle:
//   - SessionStart → auto-create NUTAUSIK session + task (onSessionCreated)
//   - PostToolUse  → log tool calls to the task (via hooks MCP registration)
//   - SessionEnd   → close NUTAUSIK session + save handoff + compact memory

import * as Log from "@opencode-ai/core/util/log"

const log = Log.create({ service: "nutausik.auto-wire" })
const NUTAUSIK_MCP_URL = "http://127.0.0.1:9210/mcp"

let reqId = 1

/** Fire a NUTAUSIK MCP tool call as a raw promise (fire-and-forget). */
function fireTool(name: string, args: Record<string, unknown> = {}): Promise<string> {
  const id = reqId++
  return fetch(NUTAUSIK_MCP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name, arguments: args },
    }),
    signal: AbortSignal.timeout(5000),
  })
    .then((res) => (res.ok ? res.json() : ""))
    .then((data: unknown) => {
      const d = data as { result?: { content?: Array<{ text?: string }> } }
      return d?.result?.content?.[0]?.text ?? ""
    })
    .catch(() => "")
}

/** Check if .nutausik/ exists in the project directory. */
function hasNutausik(dir: string): boolean {
  try {
    const fs = require("node:fs") as typeof import("node:fs")
    const path = require("node:path") as typeof import("node:path")
    return fs.existsSync(path.join(dir, ".nutausik", "nutausik.db"))
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Session lifecycle — fire-and-forget async functions (no Effect scope needed)
// ---------------------------------------------------------------------------

/**
 * Called when a NoCowboy session is created.
 * Auto-creates a NUTAUSIK task and starts a NUTAUSIK session.
 * Replaces the manual nutausik-hooks.sh SessionStart handler.
 */
export function onSessionCreated(sessionID: string, title: string, directory: string): void {
  if (!hasNutausik(directory)) return

  const taskTitle = `Session ${sessionID.slice(0, 8)}${title ? ` — ${title}` : ""}`

  fireTool("nutausik_task_quick", {
    title: taskTitle,
    goal: `Auto-created task for session ${sessionID}`,
    acceptance_criteria: "Session completed with all goals met",
  })
    .then((result) => {
      if (result) {
        log.info("auto-created NUTAUSIK task", { sessionID, taskTitle })
        fireTool("nutausik_session_start").then((sr) => {
          if (sr) log.info("auto-started NUTAUSIK session", { sessionID })
        })
      }
    })
    .catch(() => log.warn("nutausik session auto-wire failed", { sessionID }))
}

/**
 * Called when a NoCowboy session is removed/ended.
 * Auto-ends the NUTAUSIK session, saves handoff, compacts memory.
 * Replaces the manual nutausik-hooks.sh SessionEnd handler.
 */
export function onSessionEnded(sessionID: string, directory: string): void {
  if (!hasNutausik(directory)) return

  fireTool("nutausik_session_end")
    .then(() => {
      fireTool("nutausik_handoff_save", {
        session_id: sessionID,
        summary: `Session ${sessionID.slice(0, 8)} ended`,
      })
      // Compact memory — deduplicate and clean (moved from hooks.sh)
      fireTool("nutausik_memory_compact", { last: 10 })
      log.info("nutausik session auto-ended", { sessionID })
    })
    .catch(() => log.warn("nutausik session end failed", { sessionID }))
}
