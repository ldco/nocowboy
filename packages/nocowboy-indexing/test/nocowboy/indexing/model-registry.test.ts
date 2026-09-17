import { describe, expect, test } from "bun:test"
import { resolveEmbeddingProfile } from "../../../src/indexing/embedding-profile"
import { getDefaultModelId, getModelDimension, getModelScoreThreshold } from "../../../src/indexing/model-registry"

/**
 * Models below were verified with live requests against the corresponding
 * provider on 15 Sep (see .nocowboy/specs/embedder-openrouter-api.md).
 */
describe("model-registry", () => {
  describe("openrouter", () => {
    test("lists the live-verified hosted models", () => {
      expect(getModelDimension("openrouter", "openai/text-embedding-3-small")).toBe(1536)
      expect(getModelDimension("openrouter", "google/gemini-embedding-001")).toBe(3072)
      expect(getModelDimension("openrouter", "qwen/qwen3-embedding-8b")).toBe(4096)
    })

    test("assigns the code-search score threshold to the new models", () => {
      expect(getModelScoreThreshold("openrouter", "google/gemini-embedding-001")).toBe(0.35)
      expect(getModelScoreThreshold("openrouter", "qwen/qwen3-embedding-8b")).toBe(0.35)
    })

    test("resolves a model selected via indexing.model without a manual dimension override", () => {
      for (const modelId of ["google/gemini-embedding-001", "qwen/qwen3-embedding-8b"]) {
        const profile = resolveEmbeddingProfile("openrouter", modelId)
        const dimension = getModelDimension("openrouter", modelId)
        if (dimension === undefined) throw new Error(`no dimension registered for ${modelId}`)
        expect(profile).toEqual({
          provider: "openrouter",
          modelId,
          dimension,
        })
      }
    })

    test("keeps the openrouter default model unchanged", () => {
      expect(getDefaultModelId("openrouter")).toBe("openai/text-embedding-3-small")
    })
  })

  describe("mistral", () => {
    test("keeps the codestral and mistral embedding models", () => {
      expect(getModelDimension("mistral", "codestral-embed")).toBe(1536)
      expect(getModelDimension("mistral", "mistral-embed")).toBe(1024)
    })
  })

  describe("gemini", () => {
    test("keeps gemini-embedding-001", () => {
      expect(getModelDimension("gemini", "gemini-embedding-001")).toBe(3072)
    })
  })
})
