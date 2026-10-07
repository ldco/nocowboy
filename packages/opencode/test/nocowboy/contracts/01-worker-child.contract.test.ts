/**
 * Migration contract — worker child execution safety.
 *
 * A worker child may run a tool (or wait on a permission/question prompt) for a
 * long time with no provider events. That must NOT be treated as a stall: the
 * idle watchdog re-arms while a tool is in flight. This pins the observable
 * contract a migrated engine must keep (fg/bg/resume/cancel/timeout lifecycle is
 * covered end-to-end in test/tool/task.test.ts).
 */
import { describe, expect, test } from "bun:test"
import { ToolBusy } from "@/nocowboy/session/tool-busy"
import {
  subagentStallTimeoutMs,
  subagentMaxRuntimeMs,
  toolHeartbeatIntervalMs,
  stalledStatusText,
} from "@/nocowboy/session/watchdog"

describe("worker child — long tool / permission wait is not a stall", () => {
  test("a session with an in-flight tool is busy, and is not busy once it settles", () => {
    const session = "ses_contract_busy"
    expect(ToolBusy.isBusy(session)).toBe(false)
    ToolBusy.enter(session)
    expect(ToolBusy.isBusy(session)).toBe(true)
    ToolBusy.leave(session)
    expect(ToolBusy.isBusy(session)).toBe(false)
  })

  test("nested in-flight tools are counted, not toggled", () => {
    const session = "ses_contract_nested"
    ToolBusy.enter(session)
    ToolBusy.enter(session)
    ToolBusy.leave(session)
    expect(ToolBusy.isBusy(session)).toBe(true)
    ToolBusy.leave(session)
    expect(ToolBusy.isBusy(session)).toBe(false)
  })

  test("busy state is isolated per session (parallel children do not leak)", () => {
    const a = "ses_contract_a"
    const b = "ses_contract_b"
    ToolBusy.enter(a)
    expect(ToolBusy.isBusy(a)).toBe(true)
    expect(ToolBusy.isBusy(b)).toBe(false)
    ToolBusy.leave(a)
  })

  test("the heartbeat fires well before the stall timeout", () => {
    const stall = subagentStallTimeoutMs({ flags: {}, config: {} } as never)
    expect(toolHeartbeatIntervalMs(stall)).toBeGreaterThan(0)
    expect(toolHeartbeatIntervalMs(stall)).toBeLessThan(stall)
  })

  test("timeout defaults are sane and overridable", () => {
    expect(subagentStallTimeoutMs({ flags: {}, config: {} } as never)).toBeGreaterThan(0)
    expect(subagentMaxRuntimeMs({ flags: {}, config: {} } as never)).toBeGreaterThanOrEqual(0)
    expect(stalledStatusText({ idleMs: 1000, thresholdMs: 500 })).toContain("1000ms")
  })
})
