import { describe, expect, test } from "bun:test"
import { canMergeInPlace, loadProfile, resolveBaseBranch } from "./config"

test("resolves HEAD to the current branch", () => {
  expect(resolveBaseBranch("HEAD", "session/agent-123")).toBe("session/agent-123")
})

test("keeps explicit base branch names", () => {
  expect(resolveBaseBranch("main", "session/agent-123")).toBe("main")
  expect(resolveBaseBranch(undefined, "session/agent-123")).toBeUndefined()
})

test("rejects HEAD when detached", () => {
  expect(() => resolveBaseBranch("HEAD", "HEAD")).toThrow("--base-branch HEAD requires a named branch")
})

describe("merge profiles", () => {
  test("the NoCowboy profile never rewrites @nocowboy/* to @kilocode/*", () => {
    const cfg = loadProfile("nocowboy")
    const renamesOwn = cfg.packageMappings.filter((m) => m.from.startsWith("@nocowboy") && m.to.startsWith("@kilocode"))
    expect(renamesOwn).toEqual([])
    expect(cfg.packageMappings).toEqual([])
  })

  test("the NoCowboy profile treats upstream as a read-only reference", () => {
    const cfg = loadProfile("nocowboy")
    expect(cfg.readOnlyUpstream).toBe(true)
    expect(cfg.takeTheirsAndTransform).toEqual([])
  })

  test("the legacy Kilo profile is preserved for reference", () => {
    const cfg = loadProfile("kilocode")
    expect(cfg.packageMappings.some((m) => m.from === "@nocowboy/cli" && m.to === "@kilocode/cli")).toBe(true)
  })

  test("loadProfile defaults to nocowboy and rejects unknown names", () => {
    expect(loadProfile().readOnlyUpstream).toBe(true)
    expect(() => loadProfile("nope" as never)).toThrow("unknown merge profile")
  })
})

describe("canMergeInPlace", () => {
  test("the NoCowboy profile refuses the in-place merge; Kilo allows it", () => {
    expect(canMergeInPlace(loadProfile("nocowboy"))).toBe(false)
    expect(canMergeInPlace(loadProfile("kilocode"))).toBe(true)
  })
})
