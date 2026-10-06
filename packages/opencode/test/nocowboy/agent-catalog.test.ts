import { describe, expect, test } from "bun:test"
import { AgentCatalog } from "@/nocowboy/agent/catalog"

describe("AgentCatalog", () => {
  test("primary agents are not spawnable, all/subagent are", () => {
    expect(AgentCatalog.isSpawnable({ mode: "primary" })).toBe(false)
    expect(AgentCatalog.isSpawnable({ mode: "all" })).toBe(true)
    expect(AgentCatalog.isSpawnable({ mode: "subagent" })).toBe(true)
  })

  test("spawnable filters the listing", () => {
    const list = [
      { name: "auto", mode: "primary" as const },
      { name: "worker", mode: "all" as const },
      { name: "reference", mode: "subagent" as const },
    ]
    expect(AgentCatalog.spawnable(list).map((a) => a.name)).toEqual(["worker", "reference"])
  })

  test("spawnError names the agent and the mode", () => {
    const error = AgentCatalog.spawnError("auto", "primary")
    expect(error.message).toContain("auto")
    expect(error.message).toContain("primary")
    expect(error.message).toContain("not spawnable")
  })
})
