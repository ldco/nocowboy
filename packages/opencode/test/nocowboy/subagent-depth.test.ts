import { describe, expect, test } from "bun:test"
import { KiloTask } from "@/nocowboy/tool/task"

// Depth policy: delegation stays one level deep. The executor reads
// `KiloTask.nestedTask()` to disable the task tool for a spawned subagent, and
// every subagent session is created with `KiloTask.permissions(...)`, which
// denies `task` outright — two independent guards against recursive chains.
describe("subagent depth policy", () => {
  test("nested tasks are disabled (delegation is one level deep)", () => {
    expect(KiloTask.nestedTask()).toBe(false)
  })

  test("subagent permission sets deny the task tool, so a child cannot delegate further", () => {
    const rules = KiloTask.permissions([])
    expect(rules).toContainEqual({ permission: "task", pattern: "*", action: "deny" })
    expect(rules).toContainEqual({ permission: "question", pattern: "*", action: "deny" })
  })
})
