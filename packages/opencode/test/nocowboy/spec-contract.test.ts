import { describe, expect, test } from "bun:test"
import {
  hasSpecContract,
  missingSpecContractSections,
  renderSpecContract,
  sectionHeading,
  SPEC_CONTRACT_SECTIONS,
  validateSpecContract,
  type SpecContract,
} from "@/nocowboy/spec/contract"

const complete: SpecContract = {
  goal: "Add a spec contract for delegation",
  constraints: ["TypeScript only", "no new dependencies"],
  acceptanceCriteria: ["render emits five sections", "validate rejects an empty part"],
  filesToTouch: ["src/nocowboy/spec/contract.ts", "test/nocowboy/spec-contract.test.ts"],
  filesToNotTouch: ["src/session/prompt.ts"],
}

describe("renderSpecContract", () => {
  test("emits all five sections in a fixed order", () => {
    const text = renderSpecContract(complete)
    for (const section of SPEC_CONTRACT_SECTIONS) expect(text).toContain(sectionHeading(section.key))
    const positions = SPEC_CONTRACT_SECTIONS.map((s) => text.indexOf(sectionHeading(s.key)))
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  test("renders an empty list as an explicit (none), never omitting the section", () => {
    const text = renderSpecContract({ ...complete, constraints: [] })
    expect(text).toContain("### Constraints")
    expect(text).toContain("- (none)")
  })
})

describe("validateSpecContract", () => {
  test("a complete contract has no problems", () => {
    expect(validateSpecContract(complete)).toEqual([])
  })

  test("flags every empty part", () => {
    const problems = validateSpecContract({
      goal: "   ",
      constraints: [],
      acceptanceCriteria: [],
      filesToTouch: [],
      filesToNotTouch: [],
    })
    expect(problems).toHaveLength(5)
    expect(problems.join(" ")).toContain("goal")
    expect(problems.join(" ")).toContain("files to NOT touch")
  })

  test("flags a single missing part precisely", () => {
    expect(validateSpecContract({ ...complete, filesToNotTouch: [] })).toEqual([
      "files to NOT touch is empty (state 'none' explicitly)",
    ])
  })
})

describe("missingSpecContractSections / hasSpecContract", () => {
  test("a rendered contract satisfies the contract", () => {
    const rendered = renderSpecContract(complete)
    expect(missingSpecContractSections(rendered)).toEqual([])
    expect(hasSpecContract(rendered)).toBe(true)
  })

  test("reports exactly the missing sections of a partial prompt", () => {
    const partial = [
      "### Goal",
      "do the thing",
      "",
      "### Constraints",
      "- none",
      "",
      "### Acceptance criteria",
      "- it works",
      "",
      "### Files to touch",
      "- src/a.ts",
    ].join("\n")
    expect(missingSpecContractSections(partial)).toEqual(["files_to_not_touch"])
    expect(hasSpecContract(partial)).toBe(false)
  })

  test("an empty prompt is missing all five sections", () => {
    expect(missingSpecContractSections("")).toEqual(SPEC_CONTRACT_SECTIONS.map((s) => s.key))
  })
})
