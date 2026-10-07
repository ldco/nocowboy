import { describe, expect, test } from "bun:test"
import {
  DEFAULT_TOOL_CAPABILITIES,
  selectEditCapability,
} from "@/nocowboy/tool/capabilities"

const pick = (modelID: string, providerID = "openai") =>
  selectEditCapability({ providerID, modelID })

describe("selectEditCapability — capability config, not model-name branching", () => {
  test("reproduces the legacy gpt-* behavior via defaults", () => {
    // gpt-* (not oss, not gpt-4) -> apply_patch
    expect(pick("gpt-5")).toBe("apply_patch")
    expect(pick("gpt-5-codex")).toBe("apply_patch")
    // gpt-4 -> edit
    expect(pick("gpt-4o")).toBe("edit")
    expect(pick("gpt-4.1")).toBe("edit")
    // oss variant -> edit
    expect(pick("gpt-oss-20b")).toBe("edit")
    // anything else -> edit
    expect(pick("claude-sonnet-4", "anthropic")).toBe("edit")
    expect(pick("qwen3-max", "openrouter")).toBe("edit")
  })

  test("force overrides every rule (the E2E override)", () => {
    expect(selectEditCapability({ providerID: "anthropic", modelID: "claude", force: "apply_patch" })).toBe("apply_patch")
    expect(selectEditCapability({ providerID: "openai", modelID: "gpt-5", force: "edit" })).toBe("edit")
  })

  test("a caller config drives the selection", () => {
    const config = {
      edit: [{ match: "**claude**", tool: "apply_patch" as const }],
      default_edit_tool: "apply_patch" as const,
    }
    expect(selectEditCapability({ providerID: "anthropic", modelID: "claude-sonnet-4", config })).toBe("apply_patch")
    expect(selectEditCapability({ providerID: "openai", modelID: "gpt-5", config })).toBe("apply_patch")
    expect(selectEditCapability({ providerID: "x", modelID: "y", config: { edit: [], default_edit_tool: "edit" } })).toBe("edit")
  })

  test("the default rules are ordered (specific before the gpt catch-all)", () => {
    const tools = DEFAULT_TOOL_CAPABILITIES.edit.map((r) => r.tool)
    expect(tools).toEqual(["edit", "edit", "apply_patch"])
  })
})

describe("registry no longer branches on the model name", () => {
  test("registry.ts contains no model-name tool switch", async () => {
    const src = await Bun.file(new URL("../../src/tool/registry.ts", import.meta.url)).text()
    expect(src).not.toContain('.includes("gpt-")')
    expect(src).not.toContain("gpt-oss")
    expect(src).not.toMatch(/modelID\.includes\(/)
    // The selection goes through the capability resolver.
    expect(src).toContain("selectEditCapability")
  })
})
