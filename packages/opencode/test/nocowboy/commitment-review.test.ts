import { describe, expect, test } from "bun:test"
import {
  COMMITMENT_PROMPT,
  canCloseDeliverable,
  checkCommitmentGate,
  parseCommitmentVerdict,
} from "@/nocowboy/review/commitment"

const author = { providerID: "deepseek", modelID: "deepseek-v4-pro" }
const other = { providerID: "openrouter", modelID: "qwen3-max" }

describe("parseCommitmentVerdict", () => {
  test("parses an explicit VERDICT line", () => {
    expect(parseCommitmentVerdict("notes...\nVERDICT: ship\nlooks good")).toEqual({
      verdict: "ship",
      summary: "VERDICT: ship",
    })
  })

  test("parses fix-first and rethink, including the spaced form", () => {
    expect(parseCommitmentVerdict("VERDICT: fix-first")?.verdict).toBe("fix-first")
    expect(parseCommitmentVerdict("verdict - rethink")?.verdict).toBe("rethink")
    expect(parseCommitmentVerdict("Fix first: the cache key is wrong")?.verdict).toBe("fix-first")
  })

  test("returns undefined without a verdict", () => {
    expect(parseCommitmentVerdict("I looked at the diff, seems fine.")).toBeUndefined()
    expect(parseCommitmentVerdict("")).toBeUndefined()
  })

  test("the prompt asks for a single verdict", () => {
    expect(COMMITMENT_PROMPT).toContain("ship")
    expect(COMMITMENT_PROMPT).toContain("fix-first")
    expect(COMMITMENT_PROMPT).toContain("rethink")
  })
})

describe("checkCommitmentGate — a deliverable cannot close without a review", () => {
  test("blocks when there is no verdict", () => {
    const result = checkCommitmentGate({ reviewer: other, author })
    expect(result.ok).toBe(false)
    expect(result.reason).toContain("no commitment verdict")
  })

  test("blocks when the reviewer is the author's own model", () => {
    const result = checkCommitmentGate({
      report: { verdict: "ship", summary: "VERDICT: ship" },
      reviewer: author,
      author,
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toContain("matches the author")
  })

  test("passes with an independent reviewer and a verdict", () => {
    expect(
      checkCommitmentGate({ report: { verdict: "fix-first", summary: "" }, reviewer: other, author }).ok,
    ).toBe(true)
  })

  test("the author model is allowed only as an explicit opt-in", () => {
    const report = { verdict: "ship" as const, summary: "" }
    expect(checkCommitmentGate({ report, reviewer: author, author, allowSameModel: true }).ok).toBe(true)
  })
})

describe("canCloseDeliverable", () => {
  test("only `ship` closes the deliverable", () => {
    expect(canCloseDeliverable({ verdict: "ship", summary: "" })).toBe(true)
    expect(canCloseDeliverable({ verdict: "fix-first", summary: "" })).toBe(false)
    expect(canCloseDeliverable({ verdict: "rethink", summary: "" })).toBe(false)
    expect(canCloseDeliverable(undefined)).toBe(false)
  })
})
