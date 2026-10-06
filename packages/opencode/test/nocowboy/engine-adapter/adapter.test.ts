import { describe, expect, test } from "bun:test"
import { createEngineAdapter, createSpawnPolicy } from "@nocowboy/engine-adapter"

const roster = [
  { name: "auto", mode: "primary" as const, description: "Dispatcher" },
  { name: "worker", mode: "all" as const, description: "Implementation" },
  { name: "reviewer", mode: "all" as const, description: "Verification" },
  { name: "internal", mode: "primary" as const },
]

describe("createSpawnPolicy (engine adapter)", () => {
  test("spawnable delegates to the runtime policy (filters + sorts)", () => {
    const policy = createSpawnPolicy(() => roster)
    expect(policy.spawnable().map((a) => a.name)).toEqual(["reviewer", "worker"])
  })

  test("canSpawn rejects primary/auto and accepts all/subagent", () => {
    const policy = createSpawnPolicy(() => roster)
    expect(policy.canSpawn({ name: "auto", mode: "primary" })).toBe(false)
    expect(policy.canSpawn({ name: "auto", mode: "all" })).toBe(false)
    expect(policy.canSpawn({ name: "worker", mode: "all" })).toBe(true)
  })

  test("describe lists exactly the spawnable roles (single source)", () => {
    const policy = createSpawnPolicy(() => roster)
    const text = policy.describe(policy.spawnable())
    for (const item of roster) {
      expect(text.includes(`- ${item.name}:`)).toBe(policy.canSpawn(item))
    }
    expect(text).not.toContain("- auto:")
  })
})

describe("createEngineAdapter", () => {
  test("binds the runtime ports to injected engine primitives", async () => {
    const adapter = createEngineAdapter({
      listAgents: () => roster,
      evaluatePolicy: (req) => ({ action: req.pattern === "secret" ? "deny" : "allow" }),
      session: () => ({ directory: "/proj", sessionID: "s1" }),
    })

    expect((await adapter.agentCatalog.list()).length).toBe(roster.length)
    expect(adapter.policy.check({ permission: "edit", pattern: "secret" }).action).toBe("deny")
    expect(adapter.policy.check({ permission: "read", pattern: "*" }).action).toBe("allow")
    expect(adapter.session.context()).toEqual({ directory: "/proj", sessionID: "s1" })
    // The spawn policy is exposed on the same single object.
    expect(adapter.spawn.spawnable().map((a) => a.name)).toEqual(["reviewer", "worker"])
  })
})
