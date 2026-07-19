//
// Centralizes all NUTAUSIK MCP communication into one place.
// Eliminates hardcoded URLs and duplicated raw fetch() patterns
// across system.ts and nutausik-auto-wire.ts.
//
// TODO: Replace raw fetch() calls with the Effect-based MCP client
// framework from src/mcp/index.ts once the client supports
// async (non-Effect) usage patterns or the callers are converted.

import * as Log from "@nocowboy/core/util/log"

const log = Log.create({ service: "nutausik.client" })

/**
 * NUTAUSIK MCP URL.
 * Can be overridden via the NUTAUSIK_MCP_URL env var for testing.
 */
export const NUTAUSIK_MCP_URL: string =
  process.env.NUTAUSIK_MCP_URL ?? "http://127.0.0.1:9210/mcp"

let reqId = 1

/** Проверить, жив ли NUTAUSIK MCP сервер. */
let _nutausikAlive: boolean | null = null
let _lastCheck = 0
const CHECK_INTERVAL = 30_000 // проверять не чаще раза в 30 сек

async function checkNutausikAlive(): Promise<boolean> {
  const now = Date.now()
  if (_nutausikAlive !== null && now - _lastCheck < CHECK_INTERVAL) return _nutausikAlive
  _lastCheck = now
  try {
    const res = await fetch(NUTAUSIK_MCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
      signal: AbortSignal.timeout(3000),
    })
    _nutausikAlive = res.ok
    return _nutausikAlive
  } catch {
    _nutausikAlive = false
    return false
  }
}

/** Raw JSON-RPC tool call via fetch. Returns the first content text or "". */
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

/** Fire a tool call and parse the result as text. */
export async function callTool(name: string, args?: Record<string, unknown>, projectDir?: string): Promise<string> {
  return fireTool(name, { ...(projectDir ? { projectDir } : {}), ...(args ?? {}) })
}

/**
 * Check if NUTAUSIK MCP server is alive and usable.
 * Использует глобальный ping сервера, а не проверку .nutausik/ в проекте.
 */
export async function hasNutausik(_dir?: string): Promise<boolean> {
  return checkNutausikAlive()
}

// ---------------------------------------------------------------------------
// High-level NUTAUSIK operations — used by system.ts and nutausik-auto-wire.ts
// ---------------------------------------------------------------------------

/** Inject NUTAUSIK context (recent memory block) into the system prompt. */
export async function fetchContext(): Promise<string> {
  try {
    return await callTool("nutausik_memory_block", { last: 10 })
  } catch {
    return ""
  }
}

/** Run a coherence check against NUTAUSIK. Returns non-empty only if there are conflicts. */
export async function fetchCoherenceCheck(): Promise<string> {
  try {
    const result = await callTool("nutausik_coherence_check", { steps: [] })
    return result.includes("FAILED") ? result : ""
  } catch {
    return ""
  }
}

/** Load handoff data from the previous NUTAUSIK session. */
export async function fetchHandoff(): Promise<string> {
  try {
    const result = await callTool("nutausik_handoff_load")
    return result.includes("No handoff") ? "" : result
  } catch {
    return ""
  }
}

// ---------------------------------------------------------------------------
// Session lifecycle auto-wiring — used by nutausik-auto-wire.ts
// ---------------------------------------------------------------------------

/**
 * Auto-create a NUTAUSIK task for a new session, then start the NUTAUSIK session.
 * Fire-and-forget: errors are logged but not propagated.
 */
export async function autoCreateTask(sessionID: string, title: string, directory: string): Promise<void> {
  if (!(await hasNutausik())) return

  const taskTitle = `Session ${sessionID.slice(0, 8)}${title ? ` — ${title}` : ""}`

  callTool("nutausik_task_quick", {
    title: taskTitle,
    goal: `Auto-created task for session ${sessionID}`,
    acceptance_criteria: "Session completed with all goals met",
  }, directory)
    .then((result) => {
      if (result) {
        log.info("auto-created NUTAUSIK task", { sessionID, taskTitle })
        callTool("nutausik_session_start", undefined, directory).then((sr) => {
          if (sr) log.info("auto-started NUTAUSIK session", { sessionID })
        })
      }
    })
    .catch(() => log.warn("nutausik session auto-wire failed", { sessionID }))
}

/**
 * End the NUTAUSIK session, save handoff, compact memory, and log tool summary.
 * Fire-and-forget: errors are logged but not propagated.
 */
export async function autoEndSession(sessionID: string, directory: string): Promise<void> {
  if (!(await hasNutausik())) return

  callTool("nutausik_session_end", undefined, directory)
    .then(() => {
      const summary = `Session ${sessionID.slice(0, 8)} ended`
      callTool("nutausik_handoff_save", {
        session_id: sessionID,
        summary,
      }, directory)
      callTool("nutausik_memory_compact", { last: 10 })
      callTool("nutausik_task_log", {
        message: summary,
        phase: "close",
      })
      log.info("nutausik session auto-ended", { sessionID })
    })
    .catch(() => log.warn("nutausik session end failed", { sessionID }))
}

/**
 * Log tool usage to the NUTAUSIK task.
 * Fire-and-forget: errors are logged but not propagated.
 */
export function logToolCall(toolName: string, status: string, sessionID?: string): void {
  callTool("nutausik_task_log", {
    message: `Tool: ${toolName} — ${status}`,
    phase: status === "completed" ? "execute" : "error",
  })
    .then(() => log.debug("tool call logged", { toolName, status, sessionID }))
    .catch(() => {})
}
