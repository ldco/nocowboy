import { describe, expect, test } from "bun:test"
import {
  buildCommitmentPrompt,
  CommitmentBoundary,
  commitmentInvitation,
  COMMITMENT_VERDICTS,
  COMMITMENT_INVITATION,
  parseCommitmentVerdict,
} from "@/nocowboy/review/commitment"

describe("parseCommitmentVerdict", () => {
  test("reads a labelled verdict", () => {
    expect(parseCommitmentVerdict("Verdict: ship")).toBe("ship")
    expect(parseCommitmentVerdict("Verdict: fix-first")).toBe("fix-first")
    expect(parseCommitmentVerdict("Verdict: rethink")).toBe("rethink")
  })

  test("normalizes spacing and case for fix-first", () => {
    expect(parseCommitmentVerdict("Verdict: Fix First")).toBe("fix-first")
    expect(parseCommitmentVerdict("verdict - FIX_FIRST")).toBe("fix-first")
  })

  test("falls back to the first standalone verdict word", () => {
    expect(parseCommitmentVerdict("Looks fine.\n\nship")).toBe("ship")
    expect(parseCommitmentVerdict("RETHINK this approach")).toBe("rethink")
  })

  test("the labelled line wins over a stray earlier word", () => {
    expect(parseCommitmentVerdict("We could ship later.\nVerdict: fix-first")).toBe("fix-first")
  })

  test("an echoed example inside a fence does not win over the real answer", () => {
    expect(parseCommitmentVerdict("```\nVerdict: rethink\n```\n\nVerdict: ship")).toBe("ship")
  })

  test("does not match a word that merely starts with a verdict", () => {
    expect(parseCommitmentVerdict("the shipwright and the shipwreck")).toBeUndefined()
  })

  test("fixfirst without a separator is not a verdict", () => {
    expect(parseCommitmentVerdict("Verdict: fixfirst")).toBeUndefined()
  })

  test("returns undefined when there is no verdict", () => {
    expect(parseCommitmentVerdict("no decision here")).toBeUndefined()
  })
})

describe("buildCommitmentPrompt", () => {
  test("describes the three verdicts and embeds the diff", () => {
    const prompt = buildCommitmentPrompt({ diff: "+const x = 1", task: "add x" })
    for (const verdict of COMMITMENT_VERDICTS) expect(prompt).toContain(verdict)
    expect(prompt).toContain("add x")
    expect(prompt).toContain("+const x = 1")
    expect(prompt.toLowerCase()).toContain("fresh")
  })
})

describe("CommitmentBoundary (once per deliverable)", () => {
  test("runs once per deliverable id", () => {
    const boundary = new CommitmentBoundary()
    expect(boundary.shouldRun("d1")).toBe(true)
    expect(boundary.shouldRun("d1")).toBe(false)
    expect(boundary.hasReviewed("d1")).toBe(true)
  })

  test("a different deliverable gets its own review", () => {
    const boundary = new CommitmentBoundary()
    expect(boundary.shouldRun("d1")).toBe(true)
    expect(boundary.shouldRun("d2")).toBe(true)
  })

  // This is the exact function complete_task calls, so the wiring is covered
  // without the engine harness.
  test("commitmentInvitation is returned once per deliverable (the complete_task wiring)", () => {
    const slug = `task-${Math.random().toString(36).slice(2)}`
    expect(commitmentInvitation(slug)).toBe(COMMITMENT_INVITATION)
    expect(commitmentInvitation(slug)).toBe("")
    expect(commitmentInvitation(`${slug}-other`)).toBe(COMMITMENT_INVITATION)
  })
})
