import { describe, expect, test } from "bun:test"
import {
  CONTEXT_PROFILES,
  DEEP_MIN_CONTEXT,
  PROFILE_FRACTION,
  profileLabel,
  resolveContextProfile,
  validateContextProfile,
} from "@/nocowboy/session/context-profile"

describe("validateContextProfile (deep requires a token budget)", () => {
  test("deep without budget.max_tokens is rejected", () => {
    expect(validateContextProfile({ profile: "deep" })).toContain("budget.max_tokens")
    expect(validateContextProfile({ profile: "deep", budgetMaxTokens: 0 })).toContain("budget.max_tokens")
  })

  test("deep with a positive budget is accepted", () => {
    expect(validateContextProfile({ profile: "deep", budgetMaxTokens: 2_000_000 })).toBeNull()
  })

  test("compact and standard never need a budget", () => {
    expect(validateContextProfile({ profile: "compact" })).toBeNull()
    expect(validateContextProfile({ profile: "standard" })).toBeNull()
    expect(validateContextProfile({})).toBeNull()
  })
})

describe("resolveContextProfile", () => {
  test("defaults to standard when nothing is requested", () => {
    const resolved = resolveContextProfile({ modelContext: 1_000_000 })
    expect(resolved.profile).toBe("standard")
    expect(resolved.fraction).toBe(PROFILE_FRACTION.standard)
    expect(resolved.downgradedFrom).toBeUndefined()
  })

  test("deep on a large window with a budget stays deep at 90%", () => {
    const resolved = resolveContextProfile({
      requested: "deep",
      modelContext: DEEP_MIN_CONTEXT,
      budgetMaxTokens: 1_800_000,
    })
    expect(resolved.profile).toBe("deep")
    expect(resolved.fraction).toBe(0.9)
    expect(resolved.downgradedFrom).toBeUndefined()
  })

  test("deep without a budget downgrades to standard, with a reason (never silent)", () => {
    const resolved = resolveContextProfile({ requested: "deep", modelContext: 2_000_000 })
    expect(resolved.profile).toBe("standard")
    expect(resolved.downgradedFrom).toBe("deep")
    expect(resolved.reason).toContain("budget.max_tokens")
  })

  test("deep on a window below the minimum downgrades to standard, with a reason", () => {
    const resolved = resolveContextProfile({
      requested: "deep",
      modelContext: DEEP_MIN_CONTEXT - 1,
      budgetMaxTokens: 400_000,
    })
    expect(resolved.profile).toBe("standard")
    expect(resolved.downgradedFrom).toBe("deep")
    expect(resolved.reason).toContain(String(DEEP_MIN_CONTEXT))
  })

  test("compact narrows the window to 50%", () => {
    expect(resolveContextProfile({ requested: "compact", modelContext: 200_000 }).fraction).toBe(0.5)
  })

  // Cache-friendly stable prefix: resolution is a pure function of (requested,
  // window, budget) — it carries no per-turn state, so two turns with the same
  // inputs resolve identically and the stable prefix is not perturbed.
  test("resolution is turn-independent (same inputs -> same result)", () => {
    const input = { requested: "deep" as const, modelContext: 1_000_000, budgetMaxTokens: 900_000 }
    expect(resolveContextProfile(input)).toEqual(resolveContextProfile(input))
  })
})

describe("profileLabel", () => {
  test("labels every profile", () => {
    expect(CONTEXT_PROFILES.map(profileLabel)).toEqual(["Compact", "Standard", "Deep"])
  })
})
