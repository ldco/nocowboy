import { describe, expect, test } from "bun:test"
import {
  subagentMaxRuntimeMs,
  subagentStallTimeoutMs,
  streamIdleTimeoutMs,
  toolHeartbeatIntervalMs,
} from "@/nocowboy/session/watchdog"

const flags = {} as Parameters<typeof streamIdleTimeoutMs>[0]["flags"]
const config = { experimental: {} } as Parameters<typeof streamIdleTimeoutMs>[0]["config"]

describe("watchdog timeout resolution", () => {
  test("falls back to defaults", () => {
    expect(streamIdleTimeoutMs({ flags, config })).toBe(300_000)
    expect(subagentStallTimeoutMs({ flags, config })).toBe(600_000)
    expect(subagentMaxRuntimeMs({ flags, config })).toBe(0)
  })

  test("env flags override config, 0 disables", () => {
    const flags0 = { streamIdleTimeoutMs: 0, subagentStallTimeoutMs: 0 } as typeof flags
    const cfg = { experimental: { stream_idle_timeout_ms: 1234, subagent_stall_timeout_ms: 4321 } } as typeof config
    expect(streamIdleTimeoutMs({ flags: flags0, config: cfg })).toBe(0)
    expect(subagentStallTimeoutMs({ flags: flags0, config: cfg })).toBe(0)
  })

  test("config is used when the flag is unset", () => {
    const cfg = { experimental: { stream_idle_timeout_ms: 1234, subagent_stall_timeout_ms: 4321 } } as typeof config
    expect(streamIdleTimeoutMs({ flags, config: cfg })).toBe(1234)
    expect(subagentStallTimeoutMs({ flags, config: cfg })).toBe(4321)
  })
})

describe("toolHeartbeatIntervalMs", () => {
  test("is disabled when the stall watchdog is disabled", () => {
    expect(toolHeartbeatIntervalMs(0)).toBe(0)
  })

  test("stays above the 1s Activity throttle and below 60s", () => {
    // max(1000, floor(stall/3))
    expect(toolHeartbeatIntervalMs(1_500)).toBe(1_000)
    // min(60000, floor(stall/3))
    expect(toolHeartbeatIntervalMs(600_000)).toBe(60_000)
    expect(toolHeartbeatIntervalMs(30_000)).toBe(10_000)
  })
})
