import { beforeEach, describe, expect, test } from "bun:test"
import { MemoryAdapter } from "@/nocowboy/memory-adapter"

const TEST_URL = "http://memory.test/mcp"

let lastBody: any
let lastUrl: string | undefined

function installFetch(handler: (url: string, init: RequestInit) => Promise<Response>) {
  globalThis.fetch = (async (input: any, init: any) => {
    lastUrl = String(input)
    lastBody = JSON.parse(String(init?.body ?? "{}"))
    return handler(String(input), init as RequestInit)
  }) as unknown as typeof fetch
}

const ok = (text: string) =>
  new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { content: [{ text }] } }), { status: 200 })

const ctx = (over: Partial<{ projectDir: string; sessionID: string }> = {}) => ({
  projectDir: "/proj/a",
  sessionID: "ses_1",
  ...over,
})

beforeEach(() => {
  MemoryAdapter.setEndpoint(TEST_URL)
})

describe("MemoryAdapter.callTool", () => {
  test("returns structured success and marks the endpoint available", async () => {
    installFetch(async () => ok("hello memory"))
    const result = await MemoryAdapter.callTool("nutausik_x", { a: 1 }, ctx())
    expect(result).toEqual({ ok: true, text: "hello memory" })
    expect(MemoryAdapter.status()).toBe("available")
  })

  test("passes projectDir and sessionID explicitly in the JSON-RPC arguments", async () => {
    installFetch(async () => ok("x"))
    await MemoryAdapter.callTool("nutausik_x", { last: 10 }, ctx({ projectDir: "/proj/z", sessionID: "ses_9" }))
    expect(lastUrl).toBe(TEST_URL)
    expect(lastBody.params.name).toBe("nutausik_x")
    expect(lastBody.params.arguments.projectDir).toBe("/proj/z")
    expect(lastBody.params.arguments.sessionID).toBe("ses_9")
    expect(lastBody.params.arguments.last).toBe(10)
  })

  test("rejects a call without projectDir as bad-request (no fetch)", async () => {
    let called = false
    installFetch(async () => {
      called = true
      return ok("x")
    })
    const result = await MemoryAdapter.callTool("nutausik_x", {}, { projectDir: "" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("bad-request")
    expect(called).toBe(false)
  })

  test("turns a transport failure into a structured unavailable error", async () => {
    installFetch(async () => {
      throw new Error("ECONNREFUSED")
    })
    const result = await MemoryAdapter.callTool("nutausik_x", {}, ctx())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("transport")
      expect(result.status).toBe("unavailable")
    }
    expect(MemoryAdapter.status()).toBe("unavailable")
  })

  test("turns an aborted/timeout fetch into a degraded timeout error", async () => {
    installFetch(async () => {
      const err = new Error("timed out")
      err.name = "TimeoutError"
      throw err
    })
    const result = await MemoryAdapter.callTool("nutausik_x", {}, ctx())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("timeout")
      expect(result.status).toBe("degraded")
    }
  })

  test("turns a non-2xx response into a degraded http error", async () => {
    installFetch(async () => new Response("nope", { status: 503 }))
    const result = await MemoryAdapter.callTool("nutausik_x", {}, ctx())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("http")
      expect(result.error.httpStatus).toBe(503)
      expect(result.status).toBe("degraded")
    }
  })

  test("surfaces a JSON-RPC error instead of an empty string", async () => {
    installFetch(async () => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { message: "boom" } }), { status: 200 }))
    const result = await MemoryAdapter.callTool("nutausik_x", {}, ctx())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("rpc")
      expect(result.error.message).toContain("boom")
    }
  })

  test("surfaces a malformed response as invalid-response", async () => {
    installFetch(async () => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: {} }), { status: 200 }))
    const result = await MemoryAdapter.callTool("nutausik_x", {}, ctx())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("invalid-response")
  })
})

describe("MemoryAdapter in-flight tracking (isolation + flush)", () => {
  test("tracks in-flight calls per project/session namespace", async () => {
    let releaseA: (r: Response) => void = () => {}
    let releaseB: (r: Response) => void = () => {}
    installFetch(async (url, init) => {
      const dir = JSON.parse(String(init.body)).params.arguments.projectDir
      return new Promise<Response>((resolve) => {
        if (dir === "/proj/a") releaseA = resolve
        else releaseB = resolve
      })
    })
    const a = MemoryAdapter.callTool("x", {}, { projectDir: "/proj/a", sessionID: "s1" })
    const b = MemoryAdapter.callTool("x", {}, { projectDir: "/proj/b", sessionID: "s1" })
    // Two different projects must not share a namespace bucket.
    expect(MemoryAdapter.pending()).toBe(2)
    releaseA(ok("a"))
    releaseB(ok("b"))
    await Promise.all([a, b])
    expect(MemoryAdapter.pending()).toBe(0)
  })

  test("flush drains in-flight calls within the bound", async () => {
    installFetch(async () => ok("done"))
    const a = MemoryAdapter.callTool("x", {}, ctx())
    const flushed = await MemoryAdapter.flush({ timeoutMs: 1000 })
    expect(flushed.timedOut).toBe(false)
    expect(flushed.drained).toBe(1)
    expect(await a).toEqual({ ok: true, text: "done" })
    expect(MemoryAdapter.pending()).toBe(0)
  })

  test("flush is bounded — a hanging call is reported as timed out, not awaited forever", async () => {
    installFetch(async () => new Promise<Response>(() => {}))
    const hanging = MemoryAdapter.callTool("x", {}, ctx())
    const flushed = await MemoryAdapter.flush({ timeoutMs: 30 })
    expect(flushed.timedOut).toBe(true)
    expect(flushed.pending).toBeGreaterThanOrEqual(1)
    expect(MemoryAdapter.pending()).toBeGreaterThanOrEqual(1)
    void hanging // still pending; never awaited
  })
})

describe("MemoryAdapter.probe", () => {
  test("updates the observable status", async () => {
    installFetch(async () => new Response("", { status: 500 }))
    expect(await MemoryAdapter.probe()).toBe(false)
    expect(MemoryAdapter.status()).toBe("degraded")

    installFetch(async () => ok("[]"))
    expect(await MemoryAdapter.probe()).toBe(true)
    expect(MemoryAdapter.status()).toBe("available")

    installFetch(async () => {
      throw new Error("down")
    })
    expect(await MemoryAdapter.probe()).toBe(false)
    expect(MemoryAdapter.status()).toBe("unavailable")
  })
})

describe("memory lifecycle transport", () => {
  test("the NUTAUSIK lifecycle registers no shell/curl logging endpoint", async () => {
    const src = await Bun.file(new URL("../../src/nocowboy/nutausik-auto-wire.ts", import.meta.url)).text()
    expect(src).not.toContain("registerToolLoggingHook")
    expect(src).not.toContain("hooks.json")
    expect(src).not.toContain("python3")
  })

  test("nutausik-client has no raw fetch (all calls go through MemoryAdapter)", async () => {
    const src = await Bun.file(new URL("../../src/nocowboy/nutausik-client.ts", import.meta.url)).text()
    expect(src).not.toMatch(/\bfetch\s*\(/)
    expect(src).toContain("MemoryAdapter")
  })
})

describe("MemoryAdapter parallel children isolation", () => {
  test("parallel child sessions of one project track in separate namespaces", async () => {
    const releasers: Record<string, (r: Response) => void> = {}
    installFetch(async (_url, init) => {
      const sid = JSON.parse(String(init.body)).params.arguments.sessionID
      return new Promise<Response>((resolve) => {
        releasers[sid] = resolve
      })
    })
    const a = MemoryAdapter.callTool("x", {}, { projectDir: "/proj/same", sessionID: "child-a" })
    const b = MemoryAdapter.callTool("x", {}, { projectDir: "/proj/same", sessionID: "child-b" })

    // Same project, different sessions → independent namespace buckets.
    expect(MemoryAdapter.pendingFor({ projectDir: "/proj/same", sessionID: "child-a" })).toBe(1)
    expect(MemoryAdapter.pendingFor({ projectDir: "/proj/same", sessionID: "child-b" })).toBe(1)
    expect(MemoryAdapter.pendingFor({ projectDir: "/proj/same", sessionID: "child-c" })).toBe(0)

    releasers["child-a"](ok("a"))
    releasers["child-b"](ok("b"))
    await Promise.all([a, b])
    expect(MemoryAdapter.pendingFor({ projectDir: "/proj/same", sessionID: "child-a" })).toBe(0)
  })
})
