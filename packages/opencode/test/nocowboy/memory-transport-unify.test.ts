import { describe, expect, test } from "bun:test"
import { isProjectScopedServer, withMemoryScope } from "../../src/nocowboy/memory/scope"
import { MemoryAdapter, sharedMemoryAdapter } from "../../src/nocowboy/memory/adapter"

describe("memory scope seam", () => {
  test("only nutausik is project-scoped", () => {
    expect(isProjectScopedServer("nutausik")).toBe(true)
    expect(isProjectScopedServer("puppetmaster")).toBe(false)
    expect(isProjectScopedServer("")).toBe(false)
  })

  test("caller-supplied projectDir wins by default (MCP transport contract)", () => {
    expect(withMemoryScope({ last: 10 }, { project: "/repo/a" })).toEqual({ last: 10, projectDir: "/repo/a" })
    expect(withMemoryScope({ projectDir: "/repo/b" }, { project: "/repo/a" })).toEqual({ projectDir: "/repo/b" })
    expect(withMemoryScope(undefined, { project: "/repo/a" })).toEqual({ projectDir: "/repo/a" })
    expect(withMemoryScope({ last: 1 }, { project: undefined })).toEqual({ last: 1 })
  })

  test("override makes the scope authoritative (MemoryAdapter contract)", () => {
    expect(withMemoryScope({ projectDir: "/stray" }, { project: "/repo/a" }, { override: true })).toEqual({
      projectDir: "/repo/a",
    })
  })

  test("attaches a session when set, and never mutates the input args", () => {
    const args = { last: 5 }
    const out = withMemoryScope(args, { project: "/p", session: "s1" })
    expect(out).toEqual({ last: 5, projectDir: "/p", sessionID: "s1" })
    expect(args).toEqual({ last: 5 })
    expect(withMemoryScope({ sessionID: "keep" }, { session: "s1" })).toEqual({ sessionID: "keep" })
  })
})

describe("memory adapter — shared lifecycle for the SDK transport", () => {
  test("trackExternal registers the call in the bounded flush set", async () => {
    const adapter = new MemoryAdapter()
    let done = false
    const promise = adapter.trackExternal(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      done = true
      return 42
    })
    expect(adapter.pending()).toBe(1)
    const result = await promise
    expect(result).toBe(42)
    expect(done).toBe(true)
    expect(adapter.pending()).toBe(0)
  })

  test("flush waits for an external call, bounded by the timeout", async () => {
    const adapter = new MemoryAdapter()
    const promise = adapter.trackExternal(() => new Promise((resolve) => setTimeout(resolve, 30)))
    const flushed = await adapter.flush(1000)
    expect(flushed.flushed).toBe(1)
    expect(flushed.pending).toBe(0)
    await promise
  })

  test("note records an external transport health observation", () => {
    const adapter = new MemoryAdapter()
    expect(adapter.status()).toBe("unavailable")
    expect(adapter.note("degraded")).toBe("degraded")
    expect(adapter.status()).toBe("degraded")
    adapter.note("available")
    expect(adapter.status()).toBe("available")
  })

  test("sharedMemoryAdapter is a single shared instance", () => {
    expect(sharedMemoryAdapter()).toBe(sharedMemoryAdapter())
  })
})
