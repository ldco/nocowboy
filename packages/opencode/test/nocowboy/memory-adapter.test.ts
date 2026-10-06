import { describe, expect, test } from "bun:test"
import {
  httpTransport,
  parseToolText,
  MemoryAdapter,
  TransportError,
  type MemoryTransport,
  type TransportRequest,
} from "@/nocowboy/memory/adapter"

function okResponse(text: string): Response {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text }] } }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  )
}

describe("httpTransport", () => {
  test("posts a JSON-RPC tools/call and returns the raw body", async () => {
    let seen: { url: string; body: any } | undefined
    const fetchImpl = (async (url: any, init: any) => {
      seen = { url: String(url), body: JSON.parse(init.body) }
      return okResponse("hello")
    }) as unknown as typeof fetch

    const transport = httpTransport(fetchImpl)
    const res = await transport({ url: "http://x/mcp", tool: "nutausik_memory_block", args: { projectDir: "/p" }, timeoutMs: 1000 })
    expect(res.status).toBe(200)
    expect(parseToolText(res.body)).toBe("hello")
    expect(seen!.url).toBe("http://x/mcp")
    expect(seen!.body.method).toBe("tools/call")
    expect(seen!.body.params.name).toBe("nutausik_memory_block")
    expect(seen!.body.params.arguments).toEqual({ projectDir: "/p" })
  })

  test("throws a TransportError on network failure", async () => {
    const fetchImpl = (async () => {
      throw new Error("ECONNREFUSED")
    }) as unknown as typeof fetch
    await expect(httpTransport(fetchImpl)({ url: "http://x", tool: "t", args: {}, timeoutMs: 1000 })).rejects.toThrow(TransportError)
  })

  test("classifies a timeout as code=timeout", async () => {
    const fetchImpl = (async () => {
      const e = new Error("aborted")
      e.name = "AbortError"
      throw e
    }) as unknown as typeof fetch
    try {
      await httpTransport(fetchImpl)({ url: "http://x", tool: "t", args: {}, timeoutMs: 1000 })
      throw new Error("expected throw")
    } catch (error) {
      expect(error).toBeInstanceOf(TransportError)
      expect((error as TransportError).code).toBe("timeout")
    }
  })
})

describe("MemoryAdapter", () => {
  const calls: TransportRequest[] = []
  const fake = (respond: (req: TransportRequest) => Promise<{ status: number; body: unknown }>): MemoryTransport => {
    return (req) => {
      calls.push(req)
      return respond(req)
    }
  }

  test("returns a structured success and marks status available", async () => {
    calls.length = 0
    const adapter = new MemoryAdapter({ url: "http://x", transport: fake(async () => ({ status: 200, body: { result: { content: [{ text: "ctx" }] } } })) })
    const result = await adapter.call("nutausik_memory_block", { last: 10 }, { project: "/a", session: "s1" })
    expect(result).toEqual({ ok: true, value: "ctx" })
    expect(adapter.status()).toBe("available")
    // namespace is explicit and travels with the call
    expect(calls[0]!.args).toEqual({ projectDir: "/a", sessionID: "s1", last: 10 })
  })

  test("transport failure → structured transport error + unavailable", async () => {
    const adapter = new MemoryAdapter({ url: "http://x", transport: fake(async () => { throw new TransportError("down", "transport") }) })
    const result = await adapter.call("t", {}, { project: "/a" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("transport")
    expect(adapter.status()).toBe("unavailable")
  })

  test("non-2xx / JSON-RPC error → rpc error + degraded", async () => {
    const http500 = new MemoryAdapter({ url: "http://x", transport: fake(async () => ({ status: 500, body: undefined })) })
    expect((await http500.call("t", {}, { project: "/a" })).ok).toBe(false)
    expect(http500.status()).toBe("degraded")

    const rpc = new MemoryAdapter({ url: "http://x", transport: fake(async () => ({ status: 200, body: { error: { message: "bad" } } })) })
    const result = await rpc.call("t", {}, { project: "/a" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("rpc")
  })

  test("tool isError → tool error + degraded", async () => {
    const adapter = new MemoryAdapter({ url: "http://x", transport: fake(async () => ({ status: 200, body: { result: { isError: true, content: [{ text: "nope" }] } } })) })
    const result = await adapter.call("t", {}, { project: "/a" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("tool")
    expect(adapter.status()).toBe("degraded")
  })

  test("two projects never mix namespaces", async () => {
    calls.length = 0
    const adapter = new MemoryAdapter({ url: "http://x", transport: fake(async () => ({ status: 200, body: { result: { content: [{ text: "ok" }] } } })) })
    await adapter.call("nutausik_memory_add", { title: "a" }, { project: "/proj-a", session: "sa" })
    await adapter.call("nutausik_memory_add", { title: "b" }, { project: "/proj-b", session: "sb" })
    expect(calls[0]!.args.projectDir).toBe("/proj-a")
    expect(calls[0]!.args.sessionID).toBe("sa")
    expect(calls[1]!.args.projectDir).toBe("/proj-b")
    expect(calls[1]!.args.sessionID).toBe("sb")
  })

  test("flush is bounded and reports pending in-flight calls", async () => {
    let resolve!: () => void
    const gate = new Promise<void>((r) => (resolve = r))
    const adapter = new MemoryAdapter({
      url: "http://x",
      transport: async () => {
        await gate
        return { status: 200, body: { result: { content: [{ text: "done" }] } } }
      },
    })
    const pending = adapter.call("t", {}, { project: "/a" })
    expect(adapter.pending()).toBe(1)
    const short = await adapter.flush(10)
    expect(short.flushed).toBe(1)
    expect(short.pending).toBe(1) // still in flight — bounded wait elapsed
    resolve()
    await pending
    expect(adapter.pending()).toBe(0)
    expect((await adapter.flush(10)).flushed).toBe(0)
  })

  test("probe reflects server health", async () => {
    const fetchOk = (async () => new Response("{}", { status: 200 })) as unknown as typeof fetch
    const up = new MemoryAdapter({ url: "http://x", fetchImpl: fetchOk })
    expect(await up.probe(1000)).toBe("available")

    const fetchDown = (async () => {
      throw new Error("no")
    }) as unknown as typeof fetch
    const down = new MemoryAdapter({ url: "http://x", fetchImpl: fetchDown })
    expect(await down.probe(1000)).toBe("unavailable")
  })
})
