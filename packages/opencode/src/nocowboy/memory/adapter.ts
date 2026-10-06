import { withMemoryScope } from "./scope"

/**
 * MemoryAdapter — the single transport + lifecycle for NUTAUSIK memory.
 *
 * Before this, NUTAUSIK was reached through several independent raw `fetch`
 * calls (`nutausik-client.ts`, `tool/complete_task.ts`) plus an external
 * shell/python/curl hook, each with its own literal endpoint — so a transport
 * failure surfaced as an empty string and the env override could be bypassed.
 *
 * This module is the one place that:
 *   - speaks the raw JSON-RPC transport (`httpTransport`);
 *   - returns STRUCTURED results/errors instead of "" on failure;
 *   - exposes an observable `available | degraded | unavailable` status;
 *   - carries `project`/`session` explicitly on every call (no implicit global);
 *   - tracks in-flight work so shutdown can do a BOUNDED flush.
 *
 * It is dependency-light (only the global `fetch`) so it can be unit-tested with
 * an injected transport.
 */

export const MEMORY_STATUSES = ["available", "degraded", "unavailable"] as const
export type MemoryStatus = (typeof MEMORY_STATUSES)[number]

export interface MemoryNamespace {
  /** The project a call belongs to. The MCP server is shared, so this travels with every call. */
  project: string
  /** The session, when the operation is session-scoped. */
  session?: string
}

export type MemoryErrorCode = "transport" | "timeout" | "rpc" | "tool"

export interface MemoryError {
  code: MemoryErrorCode
  message: string
}

export type MemoryResult<T> = { ok: true; value: T } | { ok: false; error: MemoryError }

export interface TransportRequest {
  url: string
  tool: string
  args: Record<string, unknown>
  timeoutMs: number
  signal?: AbortSignal
}

export interface TransportResponse {
  status: number
  body: unknown
}

/** A transport turns a tool call into a raw JSON-RPC response, or throws on transport failure. */
export type MemoryTransport = (request: TransportRequest) => Promise<TransportResponse>

/**
 * Delegates to the CURRENT global `fetch` at call time, so a test that replaces
 * `globalThis.fetch` after import is still honoured (a captured reference would
 * pin the pre-test fetch).
 */
const defaultFetch = ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args)) as typeof fetch

/** The raw JSON-RPC transport over `fetch`. Throws `TransportError` on network/timeout. */
export class TransportError extends Error {
  constructor(
    message: string,
    readonly code: Extract<MemoryErrorCode, "transport" | "timeout">,
  ) {
    super(message)
    this.name = "TransportError"
  }
}

export function httpTransport(fetchImpl: typeof fetch = defaultFetch): MemoryTransport {
  return async (request) => {
    let response: Response
    try {
      response = await fetchImpl(request.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: request.tool, arguments: request.args },
        }),
        signal: request.signal ?? AbortSignal.timeout(request.timeoutMs),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
      throw new TransportError(message, timedOut ? "timeout" : "transport")
    }
    const body = await response.json().catch(() => undefined)
    return { status: response.status, body }
  }
}

/** Pull the first text part out of a JSON-RPC tools/call response. */
export function parseToolText(body: unknown): string | undefined {
  const result = (body as { result?: { content?: Array<{ text?: string }> } } | undefined)?.result
  return result?.content?.[0]?.text
}

function rpcError(body: unknown): string | undefined {
  const error = (body as { error?: { message?: string } } | undefined)?.error
  return error?.message ?? (error ? JSON.stringify(error) : undefined)
}

function toolErrorFlag(body: unknown): boolean {
  return (body as { result?: { isError?: boolean } } | undefined)?.result?.isError === true
}

export interface MemoryAdapterOptions {
  transport?: MemoryTransport
  url?: string
  defaultTimeoutMs?: number
  /** Injectable for tests; defaults to the current global fetch. */
  fetchImpl?: typeof fetch
}

export class MemoryAdapter {
  private readonly transport: MemoryTransport
  private readonly url: string
  private readonly defaultTimeoutMs: number
  private readonly fetchImpl: typeof fetch
  private readonly inflight = new Set<Promise<unknown>>()
  private current: MemoryStatus = "unavailable"

  constructor(options: MemoryAdapterOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? defaultFetch
    this.transport = options.transport ?? httpTransport(this.fetchImpl)
    this.url = options.url ?? "http://127.0.0.1:9210/mcp"
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 5000
  }

  /** Observable transport health from the last probe/call. */
  status(): MemoryStatus {
    return this.current
  }

  /** Number of calls still in flight (for diagnostics/tests). */
  pending(): number {
    return this.inflight.size
  }

  /** Probe the server with tools/list and update the status. */
  async probe(timeoutMs = 3000): Promise<MemoryStatus> {
    return this.track(async () => {
      try {
        const response = await this.fetchImpl(this.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
          signal: AbortSignal.timeout(timeoutMs),
        })
        this.current = response.ok ? "available" : "degraded"
      } catch {
        this.current = "unavailable"
      }
      return this.current
    })
  }

  /**
   * Call a tool with an EXPLICIT namespace. `project` (and `session`, when set)
   * are always forwarded so two projects / parallel children never mix. The
   * params are built through the shared {@link withMemoryScope} seam so the two
   * transports cannot drift.
   */
  async call(tool: string, args: Record<string, unknown>, ns: MemoryNamespace): Promise<MemoryResult<string>> {
    return this.track(async (): Promise<MemoryResult<string>> => {
      // ns is authoritative: the explicit namespace wins over any projectDir in
      // args, so two projects can never be crossed by a stray argument.
      const payload = withMemoryScope(args, { project: ns.project, session: ns.session }, { override: true })

      let response: TransportResponse
      try {
        response = await this.transport({ url: this.url, tool, args: payload, timeoutMs: this.defaultTimeoutMs })
      } catch (error) {
        const code = error instanceof TransportError ? error.code : "transport"
        this.current = "unavailable"
        return { ok: false, error: { code, message: error instanceof Error ? error.message : String(error) } }
      }

      const rpc = rpcError(response.body)
      if (response.status < 200 || response.status >= 300 || rpc) {
        this.current = "degraded"
        return { ok: false, error: { code: "rpc", message: rpc ?? `HTTP ${response.status}` } }
      }
      if (toolErrorFlag(response.body)) {
        this.current = "degraded"
        return { ok: false, error: { code: "tool", message: parseToolText(response.body) ?? "tool error" } }
      }

      this.current = "available"
      return { ok: true, value: parseToolText(response.body) ?? "" }
    })
  }

  /**
   * Bounded shutdown flush: wait up to `timeoutMs` for in-flight calls. Returns
   * how many were awaited and how many are still pending (never blocks forever).
   */
  async flush(timeoutMs = 2000): Promise<{ flushed: number; pending: number }> {
    const snapshot = [...this.inflight]
    if (snapshot.length === 0) return { flushed: 0, pending: 0 }
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        Promise.allSettled(snapshot),
        new Promise((resolve) => {
          timer = setTimeout(resolve, timeoutMs)
        }),
      ])
    } finally {
      if (timer) clearTimeout(timer) // don't hold the event loop after an early settle
    }
    return { flushed: snapshot.length, pending: this.inflight.size }
  }

  /**
   * Track an EXTERNAL call (e.g. the MCP SDK transport for a project-scoped
   * server) in the same in-flight set, so shutdown's bounded flush covers it
   * too — the SDK transport is no longer a blind spot.
   */
  trackExternal<T>(run: () => Promise<T>): Promise<T> {
    return this.track(run)
  }

  /** Record a transport health observation from an external caller. */
  note(status: MemoryStatus): MemoryStatus {
    this.current = status
    return this.current
  }

  private track<T>(run: () => Promise<T>): Promise<T> {
    const promise = run().finally(() => this.inflight.delete(promise))
    this.inflight.add(promise)
    return promise
  }
}

/** The default adapter bound to the env-overridable NUTAUSIK endpoint. */
export function memoryUrl(): string {
  return process.env.NUTAUSIK_MCP_URL ?? "http://127.0.0.1:9210/mcp"
}

let shared: MemoryAdapter | undefined

/**
 * Create a NUTAUSIK adapter. Called WITHOUT a `fetchImpl` it returns the one
 * shared instance, so the direct JSON-RPC path and the MCP SDK transport share
 * `status()`/`flush()`; with an explicit `fetchImpl` it returns a fresh
 * instance, for tests.
 */
export function createNutausikAdapter(fetchImpl?: typeof fetch): MemoryAdapter {
  if (fetchImpl) return new MemoryAdapter({ url: memoryUrl(), fetchImpl })
  return (shared ??= new MemoryAdapter({ url: memoryUrl() }))
}

/**
 * The one adapter instance shared by the direct JSON-RPC path and the MCP SDK
 * transport, so `status()` and `flush()` describe the whole NUTAUSIK surface
 * instead of only the direct path.
 */
export function sharedMemoryAdapter(): MemoryAdapter {
  return createNutausikAdapter()
}
