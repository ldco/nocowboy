import { afterAll, describe, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { Schema } from "effect"
import type { AgentCatalogPort } from "@/nocowboy/runtime"
import {
  AgentMode,
  EditOutcome,
  EditRequest,
  MemoryNamespace,
  MemoryRecord,
  MemoryStatus,
  ModelRef,
  PolicyAction,
  PolicyRequest,
  TelemetryEvent,
} from "@/nocowboy/runtime"
import { AgentCatalog } from "@/nocowboy/agent/catalog"
import { findViolations } from "../../../../../scripts/check-runtime-boundary"

const root = path.resolve(import.meta.dir, "../../../../..")

describe("@nocowboy/runtime port contracts", () => {
  test("AgentCatalog implements the AgentCatalogPort contract", () => {
    const port: AgentCatalogPort = AgentCatalog
    expect(port.isSpawnable({ mode: "all" })).toBe(true)
    expect(port.isSpawnable({ mode: "primary" })).toBe(false)
    expect(port.spawnable([{ name: "auto", mode: "primary" as const }, { name: "worker", mode: "all" as const }]).map((a) => a.name)).toEqual([
      "worker",
    ])
  })

  test("AgentMode / PolicyAction / EditOutcome / MemoryStatus literals decode", () => {
    expect(Schema.decodeUnknownSync(AgentMode)("all")).toBe("all")
    expect(() => Schema.decodeUnknownSync(AgentMode)("root")).toThrow()
    expect(Schema.decodeUnknownSync(PolicyAction)("ask")).toBe("ask")
    expect(() => Schema.decodeUnknownSync(PolicyAction)("maybe")).toThrow()
    expect(Schema.decodeUnknownSync(EditOutcome)("ambiguous")).toBe("ambiguous")
    expect(() => Schema.decodeUnknownSync(EditOutcome)("done")).toThrow()
    expect(Schema.decodeUnknownSync(MemoryStatus)("degraded")).toBe("degraded")
    expect(() => Schema.decodeUnknownSync(MemoryStatus)("slow")).toThrow()
  })

  test("PolicyRequest / EditRequest / ModelRef decode", () => {
    expect(Schema.decodeUnknownSync(PolicyRequest)({ permission: "edit", pattern: "src/*" })).toEqual({
      permission: "edit",
      pattern: "src/*",
    })
    expect(Schema.decodeUnknownSync(EditRequest)({ path: "a.ts", blocks: [{ search: "x", replace: "y" }] }).blocks).toHaveLength(1)
    expect(Schema.decodeUnknownSync(ModelRef)({ providerID: "deepseek", modelID: "deepseek-v4-pro" }).modelID).toBe("deepseek-v4-pro")
    expect(() => Schema.decodeUnknownSync(EditRequest)({ path: "a.ts" })).toThrow()
  })

  test("MemoryNamespace / MemoryRecord / TelemetryEvent decode", () => {
    expect(Schema.decodeUnknownSync(MemoryNamespace)({ project: "p", session: "s" }).project).toBe("p")
    expect(Schema.decodeUnknownSync(MemoryRecord)({ type: "pattern", title: "t", content: "c" }).type).toBe("pattern")
    expect(Schema.decodeUnknownSync(TelemetryEvent)({ name: "evt", properties: { a: 1 } }).properties).toEqual({ a: 1 })
    expect(() => Schema.decodeUnknownSync(TelemetryEvent)({ name: "evt" })).toThrow()
  })
})

describe("@nocowboy/runtime boundary", () => {
  test("the real runtime dir imports only effect/zod and its own files", () => {
    const violations = findViolations(path.join(root, "packages/opencode/src/nocowboy/runtime"))
    expect(violations).toEqual([])
  })

  test("the detector flags a forbidden engine import", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "runtime-boundary-"))
    try {
      writeFileSync(path.join(dir, "bad.ts"), 'import { Session } from "@/session/session"\nexport const x = Session\n')
      const violations = findViolations(dir)
      expect(violations).toHaveLength(1)
      expect(violations[0]?.spec).toBe("@/session/session")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test("the detector flags a relative import that escapes the runtime dir", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "runtime-boundary-"))
    mkdirSync(path.join(dir, "nested"), { recursive: true })
    try {
      writeFileSync(path.join(dir, "nested", "bad.ts"), 'import { x } from "../../outside"\nexport const y = x\n')
      const violations = findViolations(dir)
      expect(violations).toHaveLength(1)
      expect(violations[0]?.reason).toContain("escapes")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test("the boundary check command passes", () => {
    const result = Bun.spawnSync(["bun", "run", "scripts/check-runtime-boundary.ts", "--check"], { cwd: root })
    expect(result.exitCode).toBe(0)
  })
})
