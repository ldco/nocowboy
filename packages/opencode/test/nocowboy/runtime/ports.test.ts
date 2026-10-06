import { describe, expect, test } from "bun:test"
import { Schema } from "effect"
import {
  AgentCatalog,
  AgentCatalogEntry,
  EditBlock,
  EditPlan,
  MemoryCallContext,
  MemoryResult,
  ModelRef,
  PolicyDecision,
  PolicyRule,
  SessionContext,
  TelemetryEvent,
} from "@nocowboy/runtime"

const decode = Schema.decodeUnknownSync

describe("@nocowboy/runtime — the seven ports are described by contracts", () => {
  test("AgentCatalog port (entry schema + policy)", () => {
    expect(decode(AgentCatalogEntry)({ name: "worker", mode: "all" }).name).toBe("worker")
    expect(typeof AgentCatalog.isSpawnable).toBe("function")
    expect(AgentCatalog.NEVER_SPAWNABLE).toEqual(["auto"])
  })

  test("PolicyPort (rule + decision schema)", () => {
    expect(decode(PolicyRule)({ permission: "edit", pattern: "*", action: "deny" }).action).toBe("deny")
    expect(decode(PolicyDecision)({ action: "ask" }).action).toBe("ask")
  })

  test("SessionPort (context schema)", () => {
    expect(decode(SessionContext)({ directory: "/proj" }).directory).toBe("/proj")
  })

  test("EditPort (plan + block schema)", () => {
    const plan = decode(EditPlan)({ filePath: "a.ts", oldContent: "a", newContent: "b", encoding: "utf-8", bom: false })
    expect(plan.filePath).toBe("a.ts")
    expect(decode(EditBlock)({ search: "a", replace: "b" }).search).toBe("a")
  })

  test("ModelPort (ref schema)", () => {
    expect(decode(ModelRef)({ providerID: "p", modelID: "m" }).modelID).toBe("m")
  })

  test("MemoryPort (result + context schema)", () => {
    expect(decode(MemoryResult)({ ok: true, text: "hi" })).toEqual({ ok: true, text: "hi" })
    expect(decode(MemoryResult)({ ok: false, error: { code: "transport", message: "x" }, status: "unavailable" }).ok).toBe(false)
    expect(decode(MemoryCallContext)({ projectDir: "/p", sessionID: "s" }).projectDir).toBe("/p")
  })

  test("TelemetryPort (event schema)", () => {
    expect(decode(TelemetryEvent)({ name: "llm.completion", data: { tokens: 1 } }).name).toBe("llm.completion")
  })
})
