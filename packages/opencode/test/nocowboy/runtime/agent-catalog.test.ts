import { describe, expect, test } from "bun:test"
import { AgentCatalog } from "@nocowboy/runtime"

const agents = [
  { name: "auto", mode: "primary", description: "Dispatcher" },
  { name: "worker", mode: "all", description: "Implementation" },
  { name: "reviewer", mode: "all", description: "Verification" },
  { name: "nocowboy", mode: "all", description: "Companion" },
  { name: "internal", mode: "primary", description: "Primary only" },
]

describe("AgentCatalog policy (runtime port)", () => {
  test("primary roles and auto are never spawnable", () => {
    expect(AgentCatalog.isSpawnable({ name: "internal", mode: "primary" })).toBe(false)
    expect(AgentCatalog.isSpawnable({ name: "auto", mode: "primary" })).toBe(false)
    expect(AgentCatalog.isSpawnable({ name: "auto", mode: "all" })).toBe(false)
  })

  test("spawnable filters and sorts", () => {
    expect(AgentCatalog.spawnable(agents).map((a) => a.name)).toEqual(["nocowboy", "reviewer", "worker"])
  })

  test("a role is listed iff the executor would allow it (single source)", () => {
    const text = AgentCatalog.describe(AgentCatalog.spawnable(agents))
    for (const agent of agents) {
      expect(text.includes(`- ${agent.name}:`)).toBe(AgentCatalog.isSpawnable(agent))
    }
  })
})
