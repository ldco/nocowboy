import { describe, expect, test } from "bun:test"
import { engineAdapter, spawnPolicy } from "@/nocowboy/engine-adapter"
import type { Agent } from "@/agent/agent"

const info = (name: string, mode: "subagent" | "primary" | "all", description?: string) =>
  ({ name, mode, description, permission: [] }) as unknown as Agent.Info

describe("engine-side binding is the single entry point", () => {
  test("spawnPolicy bound to a real roster excludes auto and lists spawnable roles", () => {
    const agents = [info("auto", "primary", "Dispatcher"), info("worker", "all", "Implementation")]
    const policy = spawnPolicy(() => agents)
    expect(policy.spawnable().map((a) => a.name)).toEqual(["worker"])
    expect(policy.canSpawn(info("auto", "primary"))).toBe(false)
    expect(policy.canSpawn(info("worker", "all"))).toBe(true)
  })

  test("engineAdapter exposes spawn/policy/session from injected engine services", () => {
    const agents = [info("auto", "primary"), info("worker", "all", "Implementation")]
    const adapter = engineAdapter({
      agents,
      agent: { name: "build", permission: [] } as unknown as Agent.Info,
      session: { directory: "/proj", agent: "build" },
    })
    expect(adapter.session.context().directory).toBe("/proj")
    expect(adapter.spawn.describe(adapter.spawn.spawnable())).toContain("- worker:")
  })
})
