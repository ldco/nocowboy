import { describe, expect, test } from "bun:test"
import {
  DEFAULT_LAYER_RULES,
  LAYER_LEGEND,
  UNKNOWN_LAYER,
  defaultLayerProvider,
  groupByLayer,
} from "@/nocowboy/knowledge-graph/layers"

const provider = defaultLayerProvider()

describe("layer(file) — configurable path rules, first match wins", () => {
  test("classifies API paths", () => {
    expect(provider.layer("src/api/users.ts")).toBe("API")
    expect(provider.layer("src/routes/users.ts")).toBe("API")
    expect(provider.layer("packages/x/controller.ts")).toBe("API")
  })

  test("classifies Service paths", () => {
    expect(provider.layer("src/services/auth.ts")).toBe("Service")
    expect(provider.layer("src/domain/user.ts")).toBe("Service")
  })

  test("classifies Data paths", () => {
    expect(provider.layer("src/db/user.ts")).toBe("Data")
    expect(provider.layer("src/models/user.ts")).toBe("Data")
    expect(provider.layer("src/repositories/user.ts")).toBe("Data")
  })

  test("classifies UI paths", () => {
    expect(provider.layer("src/components/Button.tsx")).toBe("UI")
    expect(provider.layer("src/ui/card.tsx")).toBe("UI")
    expect(provider.layer("src/tui/dialog.tsx")).toBe("UI")
  })

  test("an unknown path returns null — no layer is invented", () => {
    expect(provider.layer("src/util/helpers.ts")).toBeNull()
    expect(provider.layer("README.md")).toBeNull()
    // segment anchoring: "rapid" is not "api"
    expect(provider.layer("src/rapid.ts")).toBeNull()
    expect(provider.layer("")).toBeNull()
  })

  test("rules are configurable and first-match wins", () => {
    const custom = defaultLayerProvider([
      { pattern: /^src\/special\//, layer: "Special" },
      { pattern: /(^|\/)(api)(\/|$)/i, layer: "API" },
    ])
    expect(custom.layer("src/special/x.ts")).toBe("Special")
    expect(custom.layer("src/api/x.ts")).toBe("API")
    expect(custom.layer("src/other/x.ts")).toBeNull()
  })
})

describe("groupByLayer — dashboard grouping + legend", () => {
  test("groups files by layer in legend order, unknown last", () => {
    const groups = groupByLayer(provider, [
      "src/util/x.ts",
      "src/api/users.ts",
      "src/db/user.ts",
      "src/components/B.tsx",
      "src/services/auth.ts",
    ])
    expect(groups.map((g) => g.layer)).toEqual(["API", "Service", "Data", "UI", UNKNOWN_LAYER])
    expect(groups.find((g) => g.layer === "API")!.files).toEqual(["src/api/users.ts"])
    expect(groups.find((g) => g.layer === UNKNOWN_LAYER)!.files).toEqual(["src/util/x.ts"])
  })

  test("every group carries a legend colour", () => {
    const groups = groupByLayer(provider, ["src/api/a.ts", "src/none/b.ts"])
    for (const group of groups) {
      expect(group.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(LAYER_LEGEND.some((entry) => entry.layer === group.layer)).toBe(true)
    }
    expect(groups.find((g) => g.layer === UNKNOWN_LAYER)!.color).toBe("#6b7280")
  })

  test("default rules are ordered specific to general", () => {
    expect(DEFAULT_LAYER_RULES.length).toBeGreaterThanOrEqual(4)
    expect(LAYER_LEGEND.map((e) => e.layer)).toEqual(["API", "Service", "Data", "UI", UNKNOWN_LAYER])
  })
})
