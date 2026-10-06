import { describe, expect, test } from "bun:test"
import path from "node:path"
import { Permission } from "@/permission"
import type { AgentCatalogPort, SessionPort } from "@/nocowboy/runtime"
import { EngineAdapter } from "@/nocowboy/engine-adapter"
import { findViolations } from "../../../../../scripts/check-engine-adapter"

const root = path.resolve(import.meta.dir, "../../../../..")

describe("EngineAdapter", () => {
  test("agentCatalog binds the concrete spawn policy as an AgentCatalogPort", () => {
    const port: AgentCatalogPort = EngineAdapter.agentCatalog()
    expect(port.isSpawnable({ mode: "all" })).toBe(true)
    expect(port.isSpawnable({ mode: "primary" })).toBe(false)
    expect(port.spawnable([{ name: "auto", mode: "primary" as const }])).toEqual([])
    expect(port.spawnError("auto", "primary").message).toContain("not spawnable")
  })

  test("policy evaluates a ruleset", () => {
    const ruleset = Permission.fromConfig({ edit: { "*": "deny" }, bash: "ask" })
    const policy = EngineAdapter.policy(ruleset)
    expect(policy.evaluate({ permission: "edit", pattern: "src/a.ts" })).toBe("deny")
    expect(policy.evaluate({ permission: "bash", pattern: "rm -rf /" })).toBe("ask")
  })

  test("service-backed ports bind the engine surface unchanged", () => {
    const sessionEngine = {
      create: async () => ({ id: "s1" }),
      get: async () => undefined,
      children: async () => [],
    }
    const port: SessionPort = EngineAdapter.session(sessionEngine)
    expect(port).toBe(sessionEngine)

    const model = EngineAdapter.model({ resolve: async () => ({ providerID: "p", modelID: "m" }) })
    expect(model.resolve({ agent: "worker" })).resolves.toEqual({ providerID: "p", modelID: "m" })

    expect(EngineAdapter.memory({ status: () => "degraded", add: async () => ({ ok: true }) }).status()).toBe("degraded")
    expect(EngineAdapter.telemetry({ emit: () => {} })).toBeDefined()
    expect(EngineAdapter.edit({ apply: async () => ({ outcome: "applied", applied: 1 }) })).toBeDefined()
  })

  test("the engine adapter is the single entry point (architecture check)", () => {
    expect(findViolations(path.join(root, "packages/opencode/src"))).toEqual([])
    const result = Bun.spawnSync(["bun", "run", "scripts/check-engine-adapter.ts", "--check"], { cwd: root })
    expect(result.exitCode).toBe(0)
  })
})
