import { describe, expect, test } from "bun:test"
import { EDIT_METHODS, legacyEditMethod, resolveEditMethod } from "@/nocowboy/tool/edit-capability"

describe("legacyEditMethod (compatibility default)", () => {
  test("uses patch for the gpt-* family except oss and gpt-4", () => {
    expect(legacyEditMethod("gpt-5")).toBe("patch")
    expect(legacyEditMethod("gpt-5.1-codex")).toBe("patch")
    expect(legacyEditMethod("gpt-oss-120b")).toBe("edit")
    expect(legacyEditMethod("gpt-4o")).toBe("edit")
    expect(legacyEditMethod("claude-sonnet-4")).toBe("edit")
    expect(legacyEditMethod("deepseek-chat")).toBe("edit")
  })
})

describe("resolveEditMethod", () => {
  test("falls back to the legacy heuristic without a table", () => {
    expect(resolveEditMethod({ modelID: "gpt-5" })).toBe("patch")
    expect(resolveEditMethod({ modelID: "claude-sonnet-4" })).toBe("edit")
  })

  test("an exact model entry overrides the heuristic", () => {
    expect(resolveEditMethod({ modelID: "gpt-5", table: { "gpt-5": "edit" } })).toBe("edit")
    expect(resolveEditMethod({ modelID: "claude-sonnet-4", table: { "claude-sonnet-4": "patch" } })).toBe("patch")
  })

  test("the '*' entry is a global default", () => {
    expect(resolveEditMethod({ modelID: "claude-sonnet-4", table: { "*": "patch" } })).toBe("patch")
  })

  test("an exact entry wins over '*'", () => {
    expect(resolveEditMethod({ modelID: "gpt-5", table: { "*": "edit", "gpt-5": "patch" } })).toBe("patch")
  })

  test("a model absent from the table still uses the heuristic", () => {
    expect(resolveEditMethod({ modelID: "gpt-5", table: { "other": "edit" } })).toBe("patch")
  })

  test("the E2E harness always forces patch", () => {
    expect(resolveEditMethod({ modelID: "claude-sonnet-4", e2e: true, table: { "*": "edit" } })).toBe("patch")
  })

  test("only returns declared edit methods", () => {
    for (const modelID of ["gpt-5", "claude-sonnet-4", "gpt-4o"]) {
      expect(EDIT_METHODS).toContain(resolveEditMethod({ modelID }))
    }
  })
})
