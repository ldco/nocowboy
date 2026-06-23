import { describe, expect, test } from "bun:test"
import {
  indexingEnabled,
  INDEXING_PLUGIN,
  resolveIndexingPlugin,
} from "../../src/nocowboy/indexing-feature"

describe("indexing feature — first-class", () => {
  test("detects indexing-enabled configs", () => {
    expect(indexingEnabled({ indexing: { enabled: true } })).toBe(true)
    expect(indexingEnabled({ indexing: { enabled: false } })).toBe(false)
    expect(indexingEnabled({})).toBe(false)
    expect(indexingEnabled(null)).toBe(false)
  })

  test("falls back to package marker when resolver fails", () => {
    const plugin = resolveIndexingPlugin({
      resolve() {
        throw new Error("missing")
      },
    })
    expect(plugin).toBe(INDEXING_PLUGIN)
  })
})
