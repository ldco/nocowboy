//
// MemoryAdapter — the single transport for every NUTAUSIK/MCP memory call.
//
// Before this, the raw client and the PM MCP path each did their own `fetch`,
// swallowed every failure into an empty string, and the session lifecycle logged
// tool calls by writing a shell/python/curl hook with a literal endpoint. That
// made failures invisible and the endpoint un-overridable. This module is the one
// place that talks to a memory MCP endpoint and it makes three things explicit:
//
//   - status:   available | degraded | unavailable — observable, updated by every
//               probe/call, never inferred from an empty string.
//   - errors:   a structured MemoryError with a code, instead of "".
//   - context:  projectDir (and optional sessionID) travel with every call, so a
//               shared server can never mix two projects or parallel children.
//
// In-flight calls are tracked per namespace and drained by a bounded `flush()`
// on shutdown, so session-end writes are not lost fire-and-forget.
//

import * as Log from "@nocowboy/core/util/log"

const log = Log.create({ service: "nutausik.memory-adapter" })

export type MemoryStatus = "available" | "degraded" | "unavailable"

export type MemoryErrorCode = "transport" | "timeout" | "http" | "rpc" | "invalid-response" | "bad-request"

export interface MemoryError {
  code: MemoryErrorCode
  message: string
  httpStatus?: number
}

export interface MemorySuccess {
  ok: true
  text: string
}

export interface MemoryFailure {
  ok: false
  error: MemoryError
  status: MemoryStatus
}

export type MemoryResult = MemorySuccess | MemoryFailure

/** Every call must name the project it belongs to; the shared server needs it. */
export interface MemoryCallContext {
  projectDir: string
  sessionID?: string
  timeoutMs?: number
}

const DEFAULT_URL = process.env.NUTAUSIK_MCP_URL ?? "http://127.0.0.1:9210/mcp"
const DEFAULT_TIMEOUT_MS = 5000

export namespace MemoryAdapter {
  let endpoint = DEFAULT_URL
  let currentStatus: MemoryStatus = "unavailable"
  let seq = 0
  let rpcId = 0
  const inflight = new Map<number, { namespace: string; promise: Promise<unknown> }>()

  export function url(): string {
    return endpoint
  }

  /** Override the endpoint (env is read once at import; tests use this). */
  export function setEndpoint(next: string): void {
    endpoint = next
  }

  /** The last observed availability of the endpoint. */
  export function status(): MemoryStatus {
    return currentStatus
  }

  function namespace(ctx: MemoryCallContext): string {
    return `${ctx.projectDir}\u0000${ctx.sessionID ?? ""}`
  }

  export function pending(): number {
    return inflight.size
  }

  /** In-flight calls belonging to one project/session namespace. */
  export function pendingFor(ctx: MemoryCallContext): number {
    const ns = namespace(ctx)
    let n = 0
    for (const entry of inflight.values()) if (entry.namespace === ns) n++
    return n
  }

  function fail(error: MemoryError, status: MemoryStatus): MemoryFailure {
    currentStatus = status
    return { ok: false, error, status }
  }

  function track<T>(ctx: MemoryCallContext, promise: Promise<T>): Promise<T> {
    const id = ++seq
    inflight.set(id, { namespace: namespace(ctx), promise })
    return promise.finally(() => {
      inflight.delete(id)
    })
  }

  function resolveError(error: unknown): MemoryError {
    const name = (error as { name?: string } | undefined)?.name
    if (name === "TimeoutError" || name === "AbortError") {
      return { code: "timeout", message: "memory endpoint timed out" }
    }
    return { code: "transport", message: error instanceof Error ? error.message : String(error) }
  }

  /**
   * Shared JSON-RPC transport. All memory/MCP tool calls funnel through here,
   * including the PM endpoint (pass its URL as `target`).
   */
  export function request(
    target: string,
    name: string,
    args: Record<string, unknown>,
    ctx: MemoryCallContext,
  ): Promise<MemoryResult> {
    if (!ctx.projectDir) {
      return Promise.resolve(fail({ code: "bad-request", message: "projectDir is required on every call" }, currentStatus))
    }
    const payload: Record<string, unknown> = {
      projectDir: ctx.projectDir,
      ...(ctx.sessionID ? { sessionID: ctx.sessionID } : {}),
      ...args,
    }
    const timeoutMs = ctx.timeoutMs ?? DEFAULT_TIMEOUT_MS

    const promise = (async (): Promise<MemoryResult> => {
      let res: Response
      try {
        res = await fetch(target, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method: "tools/call", params: { name, arguments: payload } }),
          signal: AbortSignal.timeout(timeoutMs),
        })
      } catch (error) {
        const resolved = resolveError(error)
        return fail(resolved, resolved.code === "timeout" ? "degraded" : "unavailable")
      }

      if (!res.ok) {
        return fail({ code: "http", message: `HTTP ${res.status}`, httpStatus: res.status }, "degraded")
      }

      let data: unknown
      try {
        data = await res.json()
      } catch {
        return fail({ code: "invalid-response", message: "response was not valid JSON" }, "degraded")
      }

      const d = data as { error?: { message?: string }; result?: { content?: Array<{ text?: string }> } }
      if (d?.error) {
        return fail({ code: "rpc", message: d.error.message ?? "JSON-RPC error" }, "degraded")
      }
      const text = d?.result?.content?.[0]?.text
      if (typeof text !== "string") {
        return fail({ code: "invalid-response", message: "missing result.content[0].text" }, "degraded")
      }
      currentStatus = "available"
      return { ok: true, text }
    })()

    return track(ctx, promise)
  }

  /** Call a tool on the configured memory endpoint. */
  export function callTool(name: string, args: Record<string, unknown>, ctx: MemoryCallContext): Promise<MemoryResult> {
    return request(endpoint, name, args, ctx)
  }

  /** Probe the endpoint (tools/list). Updates and returns the observable status. */
  export async function probe(timeoutMs = 3000): Promise<boolean> {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method: "tools/list", params: {} }),
        signal: AbortSignal.timeout(timeoutMs),
      })
      currentStatus = res.ok ? "available" : "degraded"
      return res.ok
    } catch {
      currentStatus = "unavailable"
      return false
    }
  }

  /**
   * Drain in-flight calls, bounded by `timeoutMs`. Returns how many are still
   * pending afterwards, so shutdown can report a bounded (never hanging) flush.
   */
  export async function flush(opts?: { timeoutMs?: number }): Promise<{ drained: number; pending: number; timedOut: boolean }> {
    const timeoutMs = opts?.timeoutMs ?? 2000
    const start = inflight.size
    if (start === 0) return { drained: 0, pending: 0, timedOut: false }

    const all = [...inflight.values()].map((entry) => entry.promise.catch(() => undefined))
    let timer: ReturnType<typeof setTimeout> | undefined
    const completed = await Promise.race([
      Promise.allSettled(all).then(() => true),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs)
        if (typeof timer === "object" && "unref" in timer && typeof timer.unref === "function") timer.unref()
      }),
    ])
    if (timer) clearTimeout(timer)
    if (!completed) log.warn("memory flush timed out", { pending: inflight.size, timeoutMs })
    return { drained: start - inflight.size, pending: inflight.size, timedOut: !completed }
  }
}
