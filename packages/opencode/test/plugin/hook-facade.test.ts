import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import path from "node:path"
import { ADAPTER_SEAM_HOOKS, HOOK_FACADE_VERSION, isSupportedHook, SUPPORTED_HOOKS } from "@nocowboy/plugin"

// Hooks the facade must cover (roadmap item plugin-hook-facade).
const REQUIRED = [
  "tool.definition",
  "tool.execute.before",
  "tool.execute.after",
  "experimental.chat.system.transform",
  "experimental.session.compacting",
  "experimental.compaction.autocontinue",
  "session.stop",
] as const

describe("plugin hook facade", () => {
  test("declares a semantic version", () => {
    expect(HOOK_FACADE_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })

  test("covers every required hook", () => {
    for (const hook of REQUIRED) expect(SUPPORTED_HOOKS as readonly string[]).toContain(hook)
  })

  test("the supported surface is non-empty and has no duplicates", () => {
    expect(SUPPORTED_HOOKS.length).toBeGreaterThan(0)
    expect(new Set(SUPPORTED_HOOKS).size).toBe(SUPPORTED_HOOKS.length)
  })

  test("isSupportedHook guards the surface", () => {
    expect(isSupportedHook("session.stop")).toBe(true)
    expect(isSupportedHook("not.a.hook")).toBe(false)
  })

  test("session.stop is declared an explicit adapter seam", () => {
    expect(ADAPTER_SEAM_HOOKS as readonly string[]).toContain("session.stop")
    for (const seam of ADAPTER_SEAM_HOOKS) expect(isSupportedHook(seam)).toBe(true)
  })

  test("every supported hook is actually dispatched in the engine", () => {
    const src = path.resolve(import.meta.dir, "../../src")
    const files = [
      "tool/registry.ts",
      "session/prompt.ts",
      "session/compaction.ts",
      "agent/agent.ts",
      "session/llm.ts",
    ]
    const source = files.map((file) => readFileSync(path.join(src, file), "utf8")).join("\n")
    for (const hook of SUPPORTED_HOOKS) {
      expect(source, `hook "${hook}" is not dispatched in the engine`).toContain(`"${hook}"`)
    }
  })
})
