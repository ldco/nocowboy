/**
 * Migration contract — memory transport availability + namespace isolation.
 *
 * The memory endpoint reports available/degraded/unavailable, recovers after a
 * failure, and never mixes two projects/sessions.
 */
import { beforeEach, describe, expect, test } from "bun:test"
import { MemoryAdapter } from "@/nocowboy/memory-adapter"

const URL = "http://contract.memory/mcp"
let mode: "ok" | "fail" = "ok"

function install() {
  globalThis.fetch = (async (input: any, init: any) => {
    const body = JSON.parse(String(init?.body ?? "{}"))
    if (mode === "fail") throw new Error("ECONNREFUSED")
    if (body.method === "tools/list") return new Response("{}", { status: 200 })
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { content: [{ text: "ok" }] } }), { status: 200 })
  }) as unknown as typeof fetch
}

beforeEach(() => {
  MemoryAdapter.setEndpoint(URL)
  install()
})

describe("memory transport", () => {
  test("goes unavailable on failure and recovers", async () => {
    mode = "fail"
    const down = await MemoryAdapter.callTool("x", {}, { projectDir: "/p" })
    expect(down.ok).toBe(false)
    expect(MemoryAdapter.status()).toBe("unavailable")

    mode = "ok"
    const up = await MemoryAdapter.callTool("x", {}, { projectDir: "/p" })
    expect(up.ok).toBe(true)
    expect(MemoryAdapter.status()).toBe("available")
  })

  test("requires an explicit projectDir", async () => {
    const result = await MemoryAdapter.callTool("x", {}, { projectDir: "" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("bad-request")
  })

  test("namespaces are isolated per project/session", async () => {
    const releasers: Record<string, (r: Response) => void> = {}
    globalThis.fetch = (async (_i: any, init: any) => {
      const key = JSON.parse(String(init.body)).params.arguments.sessionID
      return new Promise<Response>((resolve) => {
        releasers[key] = resolve
      })
    }) as unknown as typeof fetch
    const a = MemoryAdapter.callTool("x", {}, { projectDir: "/same", sessionID: "a" })
    const b = MemoryAdapter.callTool("x", {}, { projectDir: "/same", sessionID: "b" })
    expect(MemoryAdapter.pendingFor({ projectDir: "/same", sessionID: "a" })).toBe(1)
    expect(MemoryAdapter.pendingFor({ projectDir: "/same", sessionID: "b" })).toBe(1)
    expect(MemoryAdapter.pendingFor({ projectDir: "/same", sessionID: "c" })).toBe(0)
    releasers["a"](new Response(JSON.stringify({ result: { content: [{ text: "x" }] } }), { status: 200 }))
    releasers["b"](new Response(JSON.stringify({ result: { content: [{ text: "x" }] } }), { status: 200 }))
    await Promise.all([a, b])
  })
})
