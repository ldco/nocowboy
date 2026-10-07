import { describe, expect, test } from "bun:test"
import { NoCowboySessionOverflow } from "../../../src/nocowboy/session/overflow"

const model = (context: number, input?: number) => ({ limit: { context, input } }) as any

// Measured 2026-09-15: 5.70B cache_read across 265 sessions with only 6 compactions ever fired,
// because limit() returned the full usable window when no threshold was configured.
describe("NoCowboySessionOverflow.limit", () => {
  test("defaults to 80% of the window when no threshold is configured", () => {
    const cfg = { compaction: {} } as any
    expect(NoCowboySessionOverflow.limit({ cfg, model: model(100_000), usable: 100_000 })).toBe(80_000)
  })

  test("honours an explicit threshold", () => {
    const cfg = { compaction: { threshold_percent: 50 } } as any
    expect(NoCowboySessionOverflow.limit({ cfg, model: model(100_000), usable: 100_000 })).toBe(50_000)
  })

  test("never exceeds the usable window", () => {
    const cfg = { compaction: { threshold_percent: 90 } } as any
    expect(NoCowboySessionOverflow.limit({ cfg, model: model(100_000), usable: 70_000 })).toBe(70_000)
  })

  test("uses the model input limit when present", () => {
    const cfg = { compaction: {} } as any
    expect(NoCowboySessionOverflow.limit({ cfg, model: model(200_000, 100_000), usable: 100_000 })).toBe(80_000)
  })

  test("falls back to the usable window for zero-context models", () => {
    const cfg = { compaction: {} } as any
    expect(NoCowboySessionOverflow.limit({ cfg, model: model(0), usable: 12_345 })).toBe(12_345)
  })
})

describe("NoCowboySessionOverflow.enabled", () => {
  test("is on by default now that the threshold has a default", () => {
    expect(NoCowboySessionOverflow.enabled({ cfg: {} as any, model: model(100_000) })).toBe(true)
  })

  test("honours auto: false", () => {
    expect(NoCowboySessionOverflow.enabled({ cfg: { compaction: { auto: false } } as any, model: model(100_000) })).toBe(
      false,
    )
  })

  test("is off for models with no context window", () => {
    expect(NoCowboySessionOverflow.enabled({ cfg: {} as any, model: model(0) })).toBe(false)
  })
})

import type { Config } from "@/config/config"

// deep-context-2m: the context profile budgets how much of the window may be
// used. These assert the `limit()` wiring (the pure resolver is covered in
// test/nocowboy/context-profile.test.ts).
const profCfg = (input: Record<string, unknown>): Config.Info => input as unknown as Config.Info

describe("NoCowboySessionOverflow.limit — context_profile (deep-context-2m)", () => {
  test("deep raises the threshold to 90% on a window >= 512k", () => {
    const cfg = profCfg({ context_profile: "deep", budget: { max_tokens: 1_000_000 } })
    expect(NoCowboySessionOverflow.limit({ cfg, model: model(1_000_000), usable: 1_000_000 })).toBe(900_000)
  })

  test("deep is clamped by the usable window (never beyond limit.input - reserved)", () => {
    const cfg = profCfg({ context_profile: "deep", budget: { max_tokens: 1_000_000 } })
    expect(NoCowboySessionOverflow.limit({ cfg, model: model(1_000_000), usable: 850_000 })).toBe(850_000)
  })

  test("deep without budget.max_tokens downgrades to standard (80%)", () => {
    const cfg = profCfg({ context_profile: "deep" })
    expect(NoCowboySessionOverflow.limit({ cfg, model: model(1_000_000), usable: 1_000_000 })).toBe(800_000)
  })

  test("deep below the 512k minimum downgrades to standard (80%)", () => {
    const cfg = profCfg({ context_profile: "deep", budget: { max_tokens: 100_000 } })
    expect(NoCowboySessionOverflow.limit({ cfg, model: model(500_000), usable: 500_000 })).toBe(400_000)
  })

  test("compact narrows the window to 50%", () => {
    const cfg = profCfg({ context_profile: "compact" })
    expect(NoCowboySessionOverflow.limit({ cfg, model: model(100_000), usable: 100_000 })).toBe(50_000)
  })

  test("compact never widens an explicit lower threshold", () => {
    const cfg = profCfg({ context_profile: "compact", compaction: { threshold_percent: 30 } })
    expect(NoCowboySessionOverflow.limit({ cfg, model: model(100_000), usable: 100_000 })).toBe(30_000)
  })

  test("no context_profile keeps the previous behaviour (regression)", () => {
    expect(NoCowboySessionOverflow.limit({ cfg: profCfg({ compaction: {} }), model: model(100_000), usable: 100_000 })).toBe(80_000)
    expect(
      NoCowboySessionOverflow.limit({
        cfg: profCfg({ compaction: { threshold_percent: 50 } }),
        model: model(100_000),
        usable: 100_000,
      }),
    ).toBe(50_000)
  })

  test("the decision is deterministic (same inputs -> same limit)", () => {
    const cfg = profCfg({ context_profile: "deep", budget: { max_tokens: 1_000_000 } })
    const a = NoCowboySessionOverflow.limit({ cfg, model: model(1_000_000), usable: 1_000_000 })
    const b = NoCowboySessionOverflow.limit({ cfg, model: model(1_000_000), usable: 1_000_000 })
    expect(a).toBe(b)
  })
})
