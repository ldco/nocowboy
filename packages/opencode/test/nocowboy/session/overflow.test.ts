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

describe("NoCowboySessionOverflow.limit — context profile", () => {
  test("deep raises the threshold to 90% on a large window", () => {
    const cfg = { context_profile: "deep", budget: { max_tokens: 2_000_000 } } as any
    expect(NoCowboySessionOverflow.limit({ cfg, model: model(2_000_000), usable: 2_000_000 })).toBe(1_800_000)
  })

  test("deep never exceeds the usable window (limit.input - reserved)", () => {
    const cfg = { context_profile: "deep", budget: { max_tokens: 2_000_000 } } as any
    // A small usable window must clamp the deep cap.
    expect(NoCowboySessionOverflow.limit({ cfg, model: model(2_000_000, 1_790_000), usable: 100_000 })).toBe(100_000)
    // And the cap is deep's fraction of the input limit when the window allows it.
    expect(NoCowboySessionOverflow.limit({ cfg, model: model(2_000_000, 1_790_000), usable: 1_790_000 })).toBe(
      Math.floor(1_790_000 * 0.9),
    )
  })

  test("deep downgrades to standard on a window below the 512k minimum", () => {
    const cfg = { context_profile: "deep", budget: { max_tokens: 100_000 } } as any
    expect(NoCowboySessionOverflow.limit({ cfg, model: model(100_000), usable: 100_000 })).toBe(80_000)
  })

  test("deep without a token budget is rejected (downgrades to standard)", () => {
    const cfg = { context_profile: "deep" } as any
    expect(NoCowboySessionOverflow.limit({ cfg, model: model(2_000_000), usable: 2_000_000 })).toBe(1_600_000)
  })

  test("compact narrows the window to 50%", () => {
    const cfg = { context_profile: "compact" } as any
    expect(NoCowboySessionOverflow.limit({ cfg, model: model(100_000), usable: 100_000 })).toBe(50_000)
  })

  test("an absent profile keeps the previous behaviour", () => {
    const cfg = { compaction: { threshold_percent: 90 } } as any
    expect(NoCowboySessionOverflow.limit({ cfg, model: model(100_000), usable: 100_000 })).toBe(90_000)
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
