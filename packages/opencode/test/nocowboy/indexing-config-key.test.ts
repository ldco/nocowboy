import { describe, expect, test } from "bun:test"
import { indexingConfigChanged, indexingConfigKey } from "@/nocowboy/indexing-config-key"

describe("indexing config change detector", () => {
  test("an unchanged config has a stable key", () => {
    expect(indexingConfigKey({ vectorStore: "lancedb" })).toBe(indexingConfigKey({ vectorStore: "lancedb" }))
    expect(indexingConfigChanged({ vectorStore: "lancedb" }, { vectorStore: "lancedb" })).toBe(false)
    expect(indexingConfigChanged(undefined, undefined)).toBe(false)
    expect(indexingConfigChanged({}, undefined)).toBe(false)
  })

  test("the vector store switch is detected", () => {
    expect(indexingConfigChanged({ vectorStore: "lancedb" }, { vectorStore: "qdrant" })).toBe(true)
  })

  test("provider / model / dimension / endpoint changes are detected", () => {
    expect(indexingConfigChanged({ provider: "openai" }, { provider: "ollama" })).toBe(true)
    expect(indexingConfigChanged({ model: "a" }, { model: "b" })).toBe(true)
    expect(indexingConfigChanged({ dimension: 768 }, { dimension: 1536 })).toBe(true)
    expect(indexingConfigChanged({ qdrant: { url: "http://a" } }, { qdrant: { url: "http://b" } })).toBe(true)
    expect(indexingConfigChanged({ lancedb: { directory: "/a" } }, { lancedb: { directory: "/b" } })).toBe(true)
    expect(indexingConfigChanged({ enabled: true }, { enabled: false })).toBe(true)
  })

  test("tuning-only changes do NOT trigger a rebuild", () => {
    expect(indexingConfigChanged({ searchMinScore: 0.3 }, { searchMinScore: 0.6 })).toBe(false)
    expect(indexingConfigChanged({ searchMaxResults: 10 }, { searchMaxResults: 50 })).toBe(false)
    expect(indexingConfigChanged({ embeddingBatchSize: 30 }, { embeddingBatchSize: 90 })).toBe(false)
    expect(indexingConfigChanged({ scannerMaxBatchRetries: 1 }, { scannerMaxBatchRetries: 5 })).toBe(false)
  })
})
