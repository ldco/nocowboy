//
// Centralizes all NUTAUSIK MCP communication into one place.
// Eliminates hardcoded URLs and duplicated raw fetch() patterns
// across system.ts and nutausik-auto-wire.ts.
//
// TODO: Replace raw fetch() calls with the Effect-based MCP client
// framework from src/mcp/index.ts once the client supports
// async (non-Effect) usage patterns or the callers are converted.

import * as Log from "@nocowboy/core/util/log"
import { Instance } from "./instance"

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
  // Only a positive result is cached. A failed probe must not pin the server as
  // dead for 30s while its proxy is still starting up — callers retry during
  // startup and need a fresh answer.
  if (_nutausikAlive === true && now - _lastCheck < CHECK_INTERVAL) return true
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

/** The project a call belongs to. The MCP server is shared by every instance,
 *  so the project must travel with each request. */
function currentProjectDir(): string | undefined {
  try {
    return Instance.directory
  } catch {
    return undefined
  }
}

/** Raw JSON-RPC tool call via fetch. Returns the first content text or "". */
function fireTool(name: string, args: Record<string, unknown> = {}): Promise<string> {
  const id = reqId++
  const projectDir = (args.projectDir as string | undefined) ?? currentProjectDir()
  const payload = projectDir ? { projectDir, ...args } : args
  return fetch(NUTAUSIK_MCP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name, arguments: payload },
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
 * Start the NUTAUSIK session for a new NoCowboy session.
 *
 * This deliberately does NOT create a NUTAUSIK task: nothing ever read those
 * tasks and nothing closed them, so every session left one behind and the
 * backlog filled up with "Session <id> — …" planning rows (39 open when this
 * was fixed). Session tracking already happens through nutausik_session_start /
 * session_end, the handoff and the memory writes.
 *
 * Fire-and-forget: errors are logged but not propagated.
 */
export async function autoStartSession(sessionID: string, directory: string): Promise<void> {
  if (!(await hasNutausik())) return

  callTool("nutausik_session_start", undefined, directory)
    .then((result) => {
      if (result) log.info("auto-started NUTAUSIK session", { sessionID })
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

// ---------------------------------------------------------------------------
// PM (Puppet Master) context injection — called from system.ts
// ---------------------------------------------------------------------------

/**
 * Detect Puppet Master project and inject PM v3 rules + config
 * into the system prompt. Uses the PM MCP server's pm_inject_context tool.
 * Falls back to "" if PM MCP server is not available.
 */
export async function fetchPmContext(dir: string): Promise<string> {
  try {
    const { homedir } = await import("node:os")
    const { readFileSync } = await import("node:fs")
    const { join } = await import("node:path")

    // Check if project has PM config
    if (!readFileSync(join(dir, "project", "puppet-master.config.ts"), "utf-8")) return ""

    // Read PM MCP port from ports.json
    const portsPath = join(homedir(), ".nocowboy", "mcp", "ports.json")
    let port = 9201 // default fallback
    try {
      const portsRaw = readFileSync(portsPath, "utf-8")
      const ports = JSON.parse(portsRaw)
      if (ports.puppetmaster) port = ports.puppetmaster
    } catch {
      // fallback to default port
    }

    const pmUrl = `http://127.0.0.1:${port}/mcp`
    const res = await fetch(pmUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "pm_inject_context", arguments: { projectDir: dir } },
      }),
      signal: AbortSignal.timeout(2000),
    })

    if (!res.ok) return ""
    const data = (await res.json()) as { result?: { content?: Array<{ text?: string }> } }
    return data?.result?.content?.[0]?.text ?? ""
  } catch {
    return ""
  }
}
