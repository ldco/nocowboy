import { describe, expect, test } from "bun:test"
import { mkdtemp } from "fs/promises"
import { tmpdir } from "os"
import path from "path"
import { CacheManager } from "../../../src/indexing/cache-manager"

describe("CacheManager", () => {
  test("flushes a stable signature used to detect baseline changes", async () => {
    const cacheDir = await mkdtemp(path.join(tmpdir(), "index-cache-"))
    const workspace = path.join(cacheDir, "workspace")
    const first = new CacheManager(cacheDir, workspace)
    await first.initialize()
    first.seedHashes({
      [path.join(workspace, "b.ts")]: "b",
      [path.join(workspace, "a.ts")]: "a",
    })
    await first.flush()

    const second = new CacheManager(cacheDir, workspace)
    await second.initialize()
    expect(second.signature()).toBe(first.signature())

    second.updateHash(path.join(workspace, "a.ts"), "changed")
    expect(second.signature()).not.toBe(first.signature())
  })

  test("scopes the cache file by model id (failover safety)", async () => {
    const cacheDir = await mkdtemp(path.join(tmpdir(), "index-cache-"))
    const workspace = path.join(cacheDir, "workspace")

    const voyage = new CacheManager(cacheDir, workspace, "voyage-code-3")
    await voyage.initialize()
    voyage.seedHashes({ [path.join(workspace, "a.ts")]: "hash-a" })
    await voyage.flush()

    // A different embedding model must not read the cache written by another model,
    // otherwise unchanged files would never be re-embedded after a provider failover.
    const ollama = new CacheManager(cacheDir, workspace, "mxbai-embed-large")
    await ollama.initialize()
    expect(ollama.getHash(path.join(workspace, "a.ts"))).toBeUndefined()
    expect(ollama.getAllHashes()).toEqual({})

    // And the same model id still sees its own cache.
    const again = new CacheManager(cacheDir, workspace, "voyage-code-3")
    await again.initialize()
    expect(again.getHash(path.join(workspace, "a.ts"))).toBe("hash-a")
  })
})
