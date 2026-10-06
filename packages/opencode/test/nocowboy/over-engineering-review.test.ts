import { describe, expect, test } from "bun:test"
import {
  hasFindings,
  normalizeCategory,
  OE_CATEGORIES,
  parseFindings,
  renderFindings,
  summarizeFindings,
  type OverEngineeringFinding,
} from "@/nocowboy/review/over-engineering"

describe("normalizeCategory", () => {
  test("maps aliases and normalizes separators", () => {
    expect(normalizeCategory("Dup")).toBe("duplication")
    expect(normalizeCategory("dead code")).toBe("dead-code")
    expect(normalizeCategory("UNNECESSARY_ABSTRACTION")).toBe("unnecessary-abstraction")
    expect(normalizeCategory("Premature Generalization")).toBe("premature-generalization")
  })

  test("unknown categories become other", () => {
    expect(normalizeCategory("naming")).toBe("other")
    expect(normalizeCategory("")).toBe("other")
    expect(OE_CATEGORIES).toContain(normalizeCategory("naming"))
  })
})

describe("parseFindings — bullet format", () => {
  const report = [
    "Reviewed the diff. Findings:",
    "- [duplication] src/a.ts:12 — extract the shared block into one helper",
    "* [unnecessary-abstraction] src/b.ts — inline the single-use wrapper",
    "- [dead code] src/c.ts:40 — delete the unused branch",
    "Trailing prose that is not a finding.",
  ].join("\n")

  test("parses each finding with category, target and suggestion", () => {
    expect(parseFindings(report)).toEqual([
      { category: "duplication", target: "src/a.ts:12", suggestion: "extract the shared block into one helper" },
      { category: "unnecessary-abstraction", target: "src/b.ts", suggestion: "inline the single-use wrapper" },
      { category: "dead-code", target: "src/c.ts:40", suggestion: "delete the unused branch" },
    ])
  })

  test("ignores non-finding lines and returns [] for a clean report", () => {
    expect(parseFindings("No over-engineering found.")).toEqual([])
    expect(hasFindings("No over-engineering found.")).toBe(false)
    expect(hasFindings(report)).toBe(true)
  })

  test("accepts a spaced-hyphen separator", () => {
    expect(parseFindings("- [dup] src/a.ts - merge the two loops")).toEqual([
      { category: "duplication", target: "src/a.ts", suggestion: "merge the two loops" },
    ])
  })
})

describe("parseFindings — fenced JSON", () => {
  test("parses a fenced JSON array and defaults the category", () => {
    const json = ['```json', '[{"target":"src/x.ts","suggestion":"drop it"}]', "```"].join("\n")
    expect(parseFindings(json)).toEqual([{ category: "other", target: "src/x.ts", suggestion: "drop it" }])
  })

  test("falls back to bullets when the fence is not valid JSON", () => {
    const text = ["```json", "not json", "```", "- [dup] a.ts — merge"].join("\n")
    expect(parseFindings(text)).toEqual([{ category: "duplication", target: "a.ts", suggestion: "merge" }])
  })
})

describe("renderFindings / summarizeFindings", () => {
  const findings: OverEngineeringFinding[] = [
    { category: "duplication", target: "a.ts", suggestion: "merge" },
    { category: "duplication", target: "b.ts", suggestion: "merge" },
    { category: "dead-code", target: "c.ts", suggestion: "delete" },
  ]

  test("renders a canonical bullet list that round-trips", () => {
    expect(parseFindings(renderFindings(findings))).toEqual(findings)
  })

  test("summarizes totals by category", () => {
    expect(summarizeFindings(findings)).toEqual({
      total: 3,
      byCategory: { duplication: 2, "dead-code": 1 },
    })
    expect(summarizeFindings([])).toEqual({ total: 0, byCategory: {} })
  })
})
