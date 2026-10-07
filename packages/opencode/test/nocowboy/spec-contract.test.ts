import { describe, expect, test } from "bun:test"
import {
  SPEC_CONTRACT_PARTS,
  contractWarning,
  hasSpecContract,
  renderSpecContract,
  validateSpecContract,
  type SpecContract,
} from "@/nocowboy/spec/contract"

const complete: SpecContract = {
  goal: "Add the widget",
  constraints: ["TypeScript strict", "no new deps"],
  acceptanceCriteria: ["bun test test/widget.test.ts passes"],
  filesToTouch: ["src/widget.ts"],
  filesToNotTouch: ["src/index.ts"],
}

describe("validateSpecContract", () => {
  test("accepts a complete contract", () => {
    expect(validateSpecContract(complete)).toEqual([])
  })

  test("rejects a contract with an empty part (5 parts are required)", () => {
    for (const part of SPEC_CONTRACT_PARTS) {
      const broken: Partial<SpecContract> = { ...complete, [part]: part === "goal" ? "" : [] }
      const problems = validateSpecContract(broken)
      expect(problems.length).toBe(1)
      expect(problems[0]).toContain("missing")
    }
  })

  test("an all-empty contract reports all five parts", () => {
    expect(validateSpecContract({})).toHaveLength(5)
  })

  test("an explicit `none` counts as present", () => {
    expect(validateSpecContract({ ...complete, constraints: "none" })).toEqual([])
    expect(validateSpecContract({ ...complete, filesToNotTouch: ["none"] })).toEqual([])
  })

  test("blank strings are treated as missing", () => {
    expect(validateSpecContract({ ...complete, goal: "   " })).toHaveLength(1)
  })
})

describe("renderSpecContract", () => {
  test("renders all five headings", () => {
    const text = renderSpecContract(complete)
    for (const heading of [
      "## Goal",
      "## Constraints",
      "## Acceptance Criteria",
      "## Files to touch",
      "## Files to NOT touch",
    ]) {
      expect(text).toContain(heading)
    }
  })

  test("an empty part renders as the explicit `none`", () => {
    const text = renderSpecContract({ ...complete, filesToNotTouch: [] })
    expect(text).toContain("## Files to NOT touch\n\n- none")
  })
})

describe("task warning when a contract is absent", () => {
  test("a rendered contract is recognised", () => {
    expect(hasSpecContract(renderSpecContract(complete))).toBe(true)
    expect(contractWarning(renderSpecContract(complete))).toBeUndefined()
  })

  test("a bare prompt is not a contract and yields a warning", () => {
    expect(hasSpecContract("just fix the bug")).toBe(false)
    expect(contractWarning("just fix the bug")).toContain("spec contract")
  })
})
