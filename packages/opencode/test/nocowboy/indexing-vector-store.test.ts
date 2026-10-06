import { describe, expect, test } from "bun:test"
import {
  applyWithRollback,
  checkVectorStore,
  isVectorStore,
  needsRebuild,
  rollbackTarget,
  watchRollback,
  type IndexingHealth,
} from "@/nocowboy/indexing-vector-store"

describe("vector store availability gate", () => {
  test("lancedb is always available (embedded, directory optional)", () => {
    expect(checkVectorStore("lancedb", {})).toEqual({ ok: true })
    expect(checkVectorStore("lancedb", { lancedb: { directory: "/tmp/x" } })).toEqual({ ok: true })
  })

  test("qdrant without a URL is unavailable — the gate the dialog checks before saving", () => {
    const result = checkVectorStore("qdrant", {})
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain("URL")
    expect(checkVectorStore("qdrant", { qdrant: { url: "   " } }).ok).toBe(false)
  })

  test("qdrant with a valid URL is available (apiKey optional)", () => {
    expect(checkVectorStore("qdrant", { qdrant: { url: "http://localhost:6333" } }).ok).toBe(true)
    expect(checkVectorStore("qdrant", { qdrant: { url: "https://q.example:6333", apiKey: "k" } }).ok).toBe(true)
  })

  test("qdrant with an invalid URL is unavailable", () => {
    const result = checkVectorStore("qdrant", { qdrant: { url: "not a url" } })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain("not valid")
  })

  test("an unknown backend is unavailable", () => {
    expect(checkVectorStore("sqlite", {}).ok).toBe(false)
  })

  test("switching backend requires a rebuild; staying on the same one does not", () => {
    expect(needsRebuild("lancedb", "qdrant")).toBe(true)
    expect(needsRebuild("qdrant", "lancedb")).toBe(true)
    expect(needsRebuild("lancedb", "lancedb")).toBe(false)
    expect(needsRebuild("qdrant", "qdrant")).toBe(false)
  })

  test("isVectorStore guards the known backends", () => {
    expect(isVectorStore("lancedb")).toBe(true)
    expect(isVectorStore("qdrant")).toBe(true)
    expect(isVectorStore("sqlite")).toBe(false)
  })
})

describe("vector store rollback", () => {
  const sw = { previous: "lancedb", next: "qdrant" }

  test("rollbackTarget reverts only on a terminal error", () => {
    expect(rollbackTarget(sw, "error")).toBe("lancedb")
    expect(rollbackTarget(sw, "ok")).toBeUndefined()
    expect(rollbackTarget(sw, "building")).toBeUndefined()
    expect(rollbackTarget(undefined, "error")).toBeUndefined()
  })

  function deps(healths: IndexingHealth[], apply: (b: string) => void, sleeps: number[] = []) {
    let i = 0
    return {
      apply: async (b: string) => apply(b),
      health: async () => healths[Math.min(i++, healths.length - 1)]!,
      sleep: async (ms: number) => {
        sleeps.push(ms)
      },
      attempts: healths.length,
      intervalMs: 10,
    }
  }

  test("keeps the new backend when the build succeeds", async () => {
    const applied: string[] = []
    const out = await watchRollback(sw, deps(["building", "ok"], (b) => applied.push(b)))
    expect(out).toEqual({ status: "applied", backend: "qdrant" })
    expect(applied).toEqual([])
  })

  test("reverts to the previous backend when the rebuild errors", async () => {
    const applied: string[] = []
    const out = await watchRollback(sw, deps(["building", "error"], (b) => applied.push(b)))
    expect(out).toEqual({ status: "reverted", backend: "lancedb" })
    expect(applied).toEqual(["lancedb"])
  })

  test("does not revert a slow-but-healthy build (exhaustion keeps the new backend)", async () => {
    const applied: string[] = []
    const sleeps: number[] = []
    const out = await watchRollback(sw, deps(["building", "building", "building"], (b) => applied.push(b), sleeps))
    expect(out).toEqual({ status: "applied", backend: "qdrant" })
    expect(applied).toEqual([])
    expect(sleeps).toHaveLength(2)
  })

  test("applyWithRollback applies the new backend first, then watches", async () => {
    const applied: string[] = []
    const out = await applyWithRollback(sw, deps(["ok"], (b) => applied.push(b)))
    expect(out).toEqual({ status: "applied", backend: "qdrant" })
    expect(applied).toEqual(["qdrant"])
  })
})
