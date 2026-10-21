//
// High-level NUTAUSIK operations, all delegated to the single MemoryAdapter
// transport (see ./memory-adapter.ts). No raw fetch lives here any more, and
// every call carries an explicit project/session context.
//

import * as Log from "@nocowboy/core/util/log"
import { MemoryAdapter, type MemoryResult } from "./memory-adapter"

const log = Log.create({ service: "nutausik.client" })

/**
 * NUTAUSIK MCP URL. Kept for callers/tests that read it; the transport itself
 * resolves the endpoint through MemoryAdapter (env is read once at import).
 */
export const NUTAUSIK_MCP_URL: string = process.env.NUTAUSIK_MCP_URL ?? "http://127.0.0.1:9210/mcp"

/** Explicit context for every call. projectDir is required; sessionID where owned. */
export interface MemoryContext {
  projectDir: string
  sessionID?: string
  timeoutMs?: number
}

let _nutausikAlive: boolean | null = null
let _lastCheck = 0
const CHECK_INTERVAL = 30_000

/**
 * Check if the NUTAUSIK MCP server is alive and usable. Only a positive result
 * is cached — a failed probe must not pin the server as dead for 30s while its
 * proxy is still starting up. Status is observable via `memoryStatus()`.
 */
export async function hasNutausik(_dir?: string): Promise<boolean> {
  const now = Date.now()
  if (_nutausikAlive === true && now - _lastCheck < CHECK_INTERVAL) return true
  _lastCheck = now
  _nutausikAlive = await MemoryAdapter.probe()
  return _nutausikAlive
}

/** The last observed availability of the memory endpoint. */
export function memoryStatus() {
  return MemoryAdapter.status()
}

export { MemoryAdapter }

/**
 * Call a NUTAUSIK tool. Returns a structured result — callers must branch on
 * `ok` rather than treat an empty string as success (transport, HTTP, JSON-RPC
 * and malformed-response failures are now distinguishable).
 */
export function callTool(
  name: string,
  args: Record<string, unknown> | undefined,
  ctx: MemoryContext,
): Promise<MemoryResult> {
  return MemoryAdapter.callTool(name, args ?? {}, ctx)
}

/**
 * Fire-and-forget lifecycle write. Failures are logged with the structured
 * error code; the call stays tracked in the adapter so a shutdown flush drains it.
 */
function fire(name: string, args: Record<string, unknown>, ctx: MemoryContext): void {
  MemoryAdapter.callTool(name, args, ctx)
    .then((result) => {
      if (!result.ok) log.warn("nutausik call failed", { name, code: result.error.code })
    })
    .catch((error) => log.warn("nutausik call rejected", { name, error: String(error) }))
}

// ---------------------------------------------------------------------------
// Context injection — used by system.ts. These degrade to "" (nothing to
// inject) but the failure is observable through memoryStatus() and the log.
// ---------------------------------------------------------------------------

/** Inject NUTAUSIK context (recent memory block) into the system prompt. */
export async function fetchContext(directory: string): Promise<string> {
  const result = await callTool("nutausik_memory_block", { last: 10 }, { projectDir: directory })
  return result.ok ? result.text : ""
}

/** Run a coherence check against NUTAUSIK. Returns non-empty only if there are conflicts. */
export async function fetchCoherenceCheck(directory: string): Promise<string> {
  const result = await callTool("nutausik_coherence_check", { steps: [] }, { projectDir: directory })
  return result.ok && result.text.includes("FAILED") ? result.text : ""
}

/** Load handoff data from the previous NUTAUSIK session. */
export async function fetchHandoff(directory: string): Promise<string> {
  const result = await callTool("nutausik_handoff_load", {}, { projectDir: directory })
  return result.ok && !result.text.includes("No handoff") ? result.text : ""
}

// ---------------------------------------------------------------------------
// Session lifecycle auto-wiring — used by nutausik-auto-wire.ts
// ---------------------------------------------------------------------------

/**
 * Start the NUTAUSIK session for a new NoCowboy session. No NUTAUSIK task is
 * created per session — session tracking already happens through
 * session_start / session_end, the handoff and the memory writes.
 */
export async function autoStartSession(sessionID: string, directory: string): Promise<void> {
  if (!(await hasNutausik())) return
  const result = await callTool("nutausik_session_start", {}, { projectDir: directory, sessionID })
  if (result.ok) log.info("auto-started NUTAUSIK session", { sessionID })
  else log.warn("nutausik session auto-wire failed", { sessionID, code: result.error.code })
}

/**
 * End the NUTAUSIK session, then save handoff, compact memory and log the close.
 * The follow-up writes are fire-and-forget but tracked by the adapter, so a
 * bounded shutdown flush can still drain them.
 */
export async function autoEndSession(sessionID: string, directory: string): Promise<void> {
  if (!(await hasNutausik())) return
  const ctx: MemoryContext = { projectDir: directory, sessionID }
  const end = await callTool("nutausik_session_end", {}, ctx)
  if (!end.ok) {
    log.warn("nutausik session end failed", { sessionID, code: end.error.code })
    return
  }
  const summary = `Session ${sessionID.slice(0, 8)} ended`
  fire("nutausik_handoff_save", { session_id: sessionID, summary }, ctx)
  fire("nutausik_memory_compact", { last: 10 }, ctx)
  fire("nutausik_task_log", { message: summary, phase: "close" }, ctx)
  log.info("nutausik session auto-ended", { sessionID })
}
