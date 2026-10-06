import { describe, expect, test } from "bun:test"
import {
  diagnoseReviewIndependence,
  parseCascadeModel,
  resolveReviewCascade,
  secondPhasePrompt,
} from "../../src/nocowboy/review/cascade"

const map = {
  deepseek: "openrouter/qwen3-max",
  qwen: "deepseek/deepseek-v4-pro",
}

describe("parseCascadeModel", () => {
  test("splits provider and model, keeping model slashes", () => {
    expect(parseCascadeModel("openrouter/qwen/qwen3-max")).toEqual({
      providerID: "openrouter",
      modelID: "qwen/qwen3-max",
    })
  })
  test("rejects ids without a provider part", () => {
    expect(parseCascadeModel("qwen3-max")).toBeUndefined()
    expect(parseCascadeModel("/model")).toBeUndefined()
    expect(parseCascadeModel("provider/")).toBeUndefined()
  })
})

describe("resolveReviewCascade", () => {
  test("is inert when disabled", () => {
    expect(resolveReviewCascade({ config: { enabled: false, map }, author: { providerID: "deepseek", modelID: "x" } })).toEqual({})
    expect(resolveReviewCascade({ author: { providerID: "deepseek", modelID: "x" } })).toEqual({})
  })

  test("deepseek author reviews with the mapped qwen model; no second phase by default", () => {
    const result = resolveReviewCascade({
      config: { enabled: true, map },
      author: { providerID: "deepseek", modelID: "deepseek-v4-flash" },
    })
    expect(result.primary).toEqual({ providerID: "openrouter", modelID: "qwen3-max" })
    expect(result.secondary).toBeUndefined()
  })

  test("qwen author reviews with the mapped deepseek model; no second phase by default", () => {
    const result = resolveReviewCascade({
      config: { enabled: true, map },
      author: { providerID: "openrouter", modelID: "qwen/qwen3-max" },
    })
    expect(result.primary).toEqual({ providerID: "deepseek", modelID: "deepseek-v4-pro" })
    expect(result.secondary).toBeUndefined()
  })

  test("an explicit third model drives the second phase", () => {
    const result = resolveReviewCascade({
      config: { enabled: true, map, second_phase: "anthropic/claude-sonnet-4" },
      author: { providerID: "deepseek", modelID: "deepseek-v4-pro" },
    })
    expect(result.secondary).toEqual({ providerID: "anthropic", modelID: "claude-sonnet-4" })
  })

  test("second_phase=author reuses the author model", () => {
    const result = resolveReviewCascade({
      config: { enabled: true, map, second_phase: "author" },
      author: { providerID: "deepseek", modelID: "deepseek-v4-pro" },
    })
    expect(result.secondary).toEqual({ providerID: "deepseek", modelID: "deepseek-v4-pro" })
  })

  test("no author-family match leaves the reviewer model to the agent default", () => {
    const result = resolveReviewCascade({
      config: { enabled: true, map },
      author: { providerID: "anthropic", modelID: "claude-sonnet-4" },
    })
    expect(result).toEqual({})
  })

  test("an empty keyword never matches", () => {
    const result = resolveReviewCascade({
      config: { enabled: true, map: { "": "openrouter/qwen3-max" } },
      author: { providerID: "deepseek", modelID: "deepseek-v4-pro" },
    })
    expect(result).toEqual({})
  })

  test("drops a second phase identical to the first", () => {
    const result = resolveReviewCascade({
      config: { enabled: true, map, second_phase: "openrouter/qwen3-max" },
      author: { providerID: "deepseek", modelID: "deepseek-v4-pro" },
    })
    expect(result.primary).toEqual({ providerID: "openrouter", modelID: "qwen3-max" })
    expect(result.secondary).toBeUndefined()
  })

  test("second_phase=off disables the second phase", () => {
    const result = resolveReviewCascade({
      config: { enabled: true, map, second_phase: "off" },
      author: { providerID: "deepseek", modelID: "deepseek-v4-pro" },
    })
    expect(result.primary).toBeDefined()
    expect(result.secondary).toBeUndefined()
  })
})

describe("secondPhasePrompt", () => {
  test("keeps the original task and embeds the first review", () => {
    const prompt = secondPhasePrompt("Review the diff", "Finding: bug at line 3")
    expect(prompt).toContain("Review the diff")
    expect(prompt).toContain("Finding: bug at line 3")
    expect(prompt).toContain("First review")
  })
})

describe("diagnoseReviewIndependence", () => {
  const worker = { providerID: "deepseek", modelID: "deepseek-v4-flash" }
  const reviewer = { providerID: "moonshotai", modelID: "kimi-k3" }

  test("independent when the reviewer is a different model from the worker", () => {
    expect(diagnoseReviewIndependence({ worker, reviewer }).independent).toBe(true)
  })

  test("flags a reviewer that resolves to the worker's model", () => {
    const result = diagnoseReviewIndependence({ worker, reviewer: { ...worker } })
    expect(result.independent).toBe(false)
    expect(result.code).toBe("reviewer-equals-worker")
    expect(result.message).toContain("deepseek/deepseek-v4-flash")
  })

  test("flags a reviewer that resolves to the author's model", () => {
    const result = diagnoseReviewIndependence({ reviewer: { ...reviewer }, author: { ...reviewer } })
    expect(result.independent).toBe(false)
    expect(result.code).toBe("reviewer-equals-author")
  })

  test("an explicit allowSameModel suppresses the diagnosis", () => {
    expect(diagnoseReviewIndependence({ worker, reviewer: { ...worker }, allowSameModel: true }).independent).toBe(true)
  })

  test("independent when models are unknown (cannot prove a collision)", () => {
    expect(diagnoseReviewIndependence({}).independent).toBe(true)
    expect(diagnoseReviewIndependence({ reviewer }).independent).toBe(true)
  })
})
