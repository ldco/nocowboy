import { describe, expect, test } from "bun:test"
import {
  isSafetyInvariant,
  parseFindings,
  reviewOverEngineering,
  splitFindings,
} from "@/nocowboy/review/over-engineering"

describe("parseFindings — canonical format", () => {
  test("parses `- [category] target — suggestion`", () => {
    const findings = parseFindings("- [duplication] src/a.ts — merge the two helpers into one")
    expect(findings).toHaveLength(1)
    expect(findings[0]).toEqual({
      category: "duplication",
      target: "src/a.ts",
      suggestion: "merge the two helpers into one",
      raw: "- [duplication] src/a.ts — merge the two helpers into one",
    })
  })

  test("parses many findings and ignores non-canonical lines", () => {
    const text = [
      "## Over-engineering review",
      "",
      "- [dead-code] src/old.ts — delete the unused export",
      "some prose that is not a finding",
      "- [unneeded-dependency] package.json — drop `lodash`, use native map",
      "- a bare bullet without a category",
    ].join("\n")
    const findings = parseFindings(text)
    expect(findings.map((f) => f.category)).toEqual(["dead-code", "unneeded-dependency"])
  })

  test("tolerates a hyphen separator and a longer target with hyphens", () => {
    const findings = parseFindings("- [over-configuration] src/config/loader.ts - remove the second config layer")
    expect(findings[0]).toMatchObject({
      category: "over-configuration",
      target: "src/config/loader.ts",
      suggestion: "remove the second config layer",
    })
  })

  test("returns nothing for a review with no findings", () => {
    expect(parseFindings("Looks clean, nothing to remove.")).toEqual([])
  })
})

describe("safety invariants are never actionable", () => {
  test("a finding touching validation/security is protected, not actionable", () => {
    const text = [
      "- [dead-code] src/util/validate.ts — remove the redundant validation",
      "- [duplication] src/dedupe.ts — merge the two helpers",
    ].join("\n")
    const { actionable, protected: protectedFindings } = reviewOverEngineering(text)
    expect(protectedFindings).toHaveLength(1)
    expect(protectedFindings[0]!.target).toBe("src/util/validate.ts")
    expect(actionable).toHaveLength(1)
    expect(actionable[0]!.category).toBe("duplication")
  })

  test("isSafetyInvariant covers the documented invariant families", () => {
    for (const word of ["trust-boundary validation", "data-loss handling", "security", "error handling", "accessibility a11y"]) {
      expect(isSafetyInvariant({ category: "x", target: "src/x.ts", suggestion: word, raw: "" })).toBe(true)
    }
    expect(isSafetyInvariant({ category: "x", target: "src/x.ts", suggestion: "rename the variable", raw: "" })).toBe(false)
  })

  test("splitFindings keeps order and classifies each finding once", () => {
    const findings = parseFindings(
      [
        "- [dead-code] a.ts — delete",
        "- [duplication] b.ts — merge (keep rollback semantics)",
        "- [over-engineering] c.ts — simplify",
      ].join("\n"),
    )
    const { actionable, protected: protectedFindings } = splitFindings(findings)
    expect(protectedFindings).toHaveLength(1)
    expect(actionable.map((f) => f.category)).toEqual(["dead-code", "over-engineering"])
  })
})
