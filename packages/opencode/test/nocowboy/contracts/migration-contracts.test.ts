import { describe, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import path from "node:path"
import { REQUIRED_SCENARIOS } from "./scenarios"

const root = path.resolve(import.meta.dir, "../../..") // packages/opencode

describe("migration contract manifest", () => {
  test("every required scenario has at least one automated test", () => {
    for (const scenario of REQUIRED_SCENARIOS) {
      expect(scenario.tests.length, `${scenario.id} has no tests`).toBeGreaterThan(0)
    }
    // ids are unique
    expect(new Set(REQUIRED_SCENARIOS.map((s) => s.id)).size).toBe(REQUIRED_SCENARIOS.length)
  })

  test("every referenced test file exists (the gate cannot rot silently)", () => {
    const missing: string[] = []
    for (const scenario of REQUIRED_SCENARIOS) {
      for (const rel of scenario.tests) {
        if (!existsSync(path.join(root, rel))) missing.push(`${scenario.id}: ${rel}`)
      }
    }
    expect(missing).toEqual([])
  })

  test("the in-directory contract tests are referenced by the manifest", () => {
    const referenced = new Set(REQUIRED_SCENARIOS.flatMap((s) => s.tests))
    for (const rel of [
      "test/nocowboy/contracts/worker-child.contract.test.ts",
      "test/nocowboy/contracts/mutation-policy.contract.test.ts",
      "test/nocowboy/contracts/tui-navigation.contract.test.ts",
    ]) {
      expect(referenced.has(rel), `${rel} is not mapped to a scenario`).toBe(true)
    }
  })
})
