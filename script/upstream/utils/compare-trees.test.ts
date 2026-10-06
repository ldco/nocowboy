import { describe, expect, test } from "bun:test"
import { assertNoLegacyRewrite, defaultConfig, nocowboyConfig, resolveProfile } from "./config"
import { buildMergeDryRunReport, compareTrees, normalizePackageName, normalizePath } from "./compare-trees"

describe("normalizePackageName", () => {
  test("collapses brand scopes to one canonical scope", () => {
    expect(normalizePackageName("@nocowboy/cli")).toBe("@engine/cli")
    expect(normalizePackageName("@kilocode/cli")).toBe("@engine/cli")
    expect(normalizePackageName("@opencode-ai/sdk")).toBe("@engine/sdk")
  })

  test("keeps subpaths and collapses the bare CLI packages", () => {
    expect(normalizePackageName("@nocowboy/sdk/v2")).toBe("@engine/sdk/v2")
    expect(normalizePackageName("opencode-ai")).toBe("engine")
    expect(normalizePackageName("kilocode")).toBe("engine")
  })

  test("leaves unrelated packages untouched", () => {
    expect(normalizePackageName("@modelcontextprotocol/sdk")).toBe("@modelcontextprotocol/sdk")
  })
})

describe("normalizePath", () => {
  test("collapses branding segments before comparison", () => {
    expect(normalizePath("packages/opencode/src/nocowboy/session")).toBe("packages/engine/src/engine/session")
    expect(normalizePath("packages/opencode/src/kilocode/session")).toBe("packages/engine/src/engine/session")
  })

  test("does not touch non-brand segments", () => {
    expect(normalizePath("packages/opencode/src/tool/task.ts")).toBe("packages/engine/src/tool/task.ts")
  })
})

describe("compareTrees", () => {
  test("a renamed package/path is not reported as an add/remove", () => {
    const diff = compareTrees(
      ["packages/opencode/src/nocowboy/foo.ts", "packages/opencode/src/only/ours.ts"],
      ["packages/kilocode/src/kilocode/foo.ts", "packages/opencode/src/only/theirs.ts"],
    )
    expect(diff.common).toContain("packages/engine/src/engine/foo.ts")
    expect(diff.onlyOurs).toEqual(["packages/engine/src/only/ours.ts"])
    expect(diff.onlyTheirs).toEqual(["packages/engine/src/only/theirs.ts"])
  })
})

describe("NoCowboy merge profile", () => {
  test("never rewrites @nocowboy/* into @kilocode/*", () => {
    expect(() => assertNoLegacyRewrite(nocowboyConfig)).not.toThrow()
  })

  test("the legacy profile is rejected by the guard", () => {
    expect(() => assertNoLegacyRewrite(defaultConfig)).toThrow("@kilocode")
  })

  test("treats upstream as a read-only reference", () => {
    expect(nocowboyConfig.upstreamReadOnly).toBe(true)
    expect(nocowboyConfig.packageMappings.every((m) => !m.from.includes("nocowboy"))).toBe(true)
  })

  test("resolveProfile picks the right profile", () => {
    expect(resolveProfile("nocowboy")).toBe(nocowboyConfig)
    expect(resolveProfile("legacy-kilo")).toBe(defaultConfig)
  })

  test("dry-run report states the read-only posture and touches nothing", () => {
    const report = buildMergeDryRunReport()
    expect(report).toContain("read-only")
    expect(report).toContain("@kilocode → @nocowboy")
    expect(report).toContain("No files were modified")
  })
})
