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

  test("deepseek author reviews with the mapped qwen model, with no implicit second phase", () => {
    const result = resolveReviewCascade({
      config: { enabled: true, map },
      author: { providerID: "deepseek", modelID: "deepseek-v4-flash" },
    })
    expect(result.primary).toEqual({ providerID: "openrouter", modelID: "qwen3-max" })
    // The author model is never reused implicitly in phase 2.
    expect(result.secondary).toBeUndefined()
  })

  test("qwen author reviews with the mapped deepseek model, no implicit second phase", () => {
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
  test("flags a reviewer config that matches the author/worker", () => {
    const author = { providerID: "deepseek", modelID: "deepseek-v4-pro" }
    const diagnostics = diagnoseReviewIndependence({
      author,
      resolution: { primary: { providerID: "deepseek", modelID: "deepseek-v4-pro" } },
    })
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]!.code).toBe("reviewer-matches-author")
    expect(diagnostics[0]!.severity).toBe("warning")
  })

  test("a different-family reviewer is clean", () => {
    const diagnostics = diagnoseReviewIndependence({
      author: { providerID: "deepseek", modelID: "deepseek-v4-pro" },
      resolution: { primary: { providerID: "openrouter", modelID: "qwen3-max" } },
    })
    expect(diagnostics).toEqual([])
  })

  test("the second phase cannot reuse the author without explicit opt-in", () => {
    const author = { providerID: "deepseek", modelID: "deepseek-v4-pro" }
    // Default resolution never reuses the author.
    const implicit = resolveReviewCascade({ config: { enabled: true, map }, author })
    expect(implicit.secondary).toBeUndefined()

    // Explicit opt-in does, and is reported as a warning.
    const explicit = resolveReviewCascade({ config: { enabled: true, map, second_phase: "author" }, author })
    expect(explicit.secondary).toEqual(author)
    const diagnostics = diagnoseReviewIndependence({ author, resolution: explicit })
    expect(diagnostics.some((d) => d.code === "second-phase-matches-author")).toBe(true)
  })
})
