import { describe, expect, test } from "bun:test"
import { AgentCatalog } from "@/nocowboy/agent/catalog"

const agents = [
  { name: "auto", mode: "primary", description: "Dispatcher" },
  { name: "worker", mode: "all", description: "Implementation" },
  { name: "reviewer", mode: "all", description: "Verification" },
  { name: "planner", mode: "all", description: "Planning" },
  { name: "nocowboy", mode: "all", description: "Companion" },
  { name: "hidden-only", mode: "subagent", description: "Subagent-only" },
  { name: "internal", mode: "primary", description: "Primary only" },
]

describe("AgentCatalog.isSpawnable", () => {
  test("a primary role is never spawnable", () => {
    expect(AgentCatalog.isSpawnable({ name: "internal", mode: "primary" })).toBe(false)
  })

  test("auto is never spawnable even if its mode were all", () => {
    expect(AgentCatalog.isSpawnable({ name: "auto", mode: "primary" })).toBe(false)
    expect(AgentCatalog.isSpawnable({ name: "auto", mode: "all" })).toBe(false)
  })

  test("subagent/all roles are spawnable (companion nocowboy included)", () => {
    expect(AgentCatalog.isSpawnable({ name: "worker", mode: "all" })).toBe(true)
    expect(AgentCatalog.isSpawnable({ name: "reviewer", mode: "all" })).toBe(true)
    expect(AgentCatalog.isSpawnable({ name: "nocowboy", mode: "all" })).toBe(true)
    expect(AgentCatalog.isSpawnable({ name: "child", mode: "subagent" })).toBe(true)
  })
})

describe("AgentCatalog.spawnable", () => {
  test("filters and name-sorts", () => {
    expect(AgentCatalog.spawnable(agents).map((a) => a.name)).toEqual([
      "hidden-only",
      "nocowboy",
      "planner",
      "reviewer",
      "worker",
    ])
  })
})

describe("AgentCatalog is one policy for listing and executor", () => {
  test("the listing contains exactly the spawnable roles", () => {
    const listed = AgentCatalog.spawnable(agents)
    const text = AgentCatalog.describe(listed)
    for (const agent of agents) {
      const present = text.includes(`- ${agent.name}:`)
      // Listed if and only if the executor would allow the spawn.
      expect(present).toBe(AgentCatalog.isSpawnable(agent))
    }
    expect(text).not.toContain("- auto:")
    expect(text).toContain("- worker: Implementation")
  })

  test("the fallback description is used for a role without one", () => {
    expect(AgentCatalog.describe([{ name: "x" }])).toContain(
      "- x: This subagent should only be called manually by the user.",
    )
  })
})
