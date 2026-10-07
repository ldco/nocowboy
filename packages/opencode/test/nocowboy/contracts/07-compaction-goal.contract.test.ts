/**
 * Migration contract — compaction/checkpoint boundary and goal persistence.
 *
 * The checkpoint boundary keeps recent turns; a roadmap goal is unbounded and a
 * goal restored after a restart is announced (not silently auto-continued).
 */
import { describe, expect, test } from "bun:test"
import { computeBoundary, userMsgText } from "@/nocowboy/session/checkpoint"
import {
  DEFAULT_MAX_TURNS,
  UNBOUNDED_MAX_TURNS,
  formatMaxTurns,
  isRestoredFromPreviousRun,
  isUnbounded,
  restoredGoalNotice,
  type Goal,
} from "@/nocowboy/session/goal"

function msg(id: string, role: "user" | "assistant", finish?: string, text?: string) {
  return { info: { id, role, ...(finish ? { finish } : {}) }, parts: text ? [{ type: "text", text }] : [] }
}

describe("compaction / checkpoint", () => {
  test("boundary is empty for no messages and points into the transcript otherwise", () => {
    expect(computeBoundary([])).toBe("")
    const msgs = [msg("u1", "user"), msg("a1", "assistant", "stop"), msg("u2", "user"), msg("a2", "assistant", "stop")]
    const boundary = computeBoundary(msgs)
    expect(msgs.some((m) => m.info.id === boundary)).toBe(true)
  })

  test("userMsgText excludes synthetic parts", () => {
    expect(userMsgText([{ type: "text", text: "real" }, { type: "text", text: "auto", synthetic: true }])).toBe("real")
  })
})

describe("goal persistence", () => {
  const goal: Goal = { condition: "all tests pass", react: 3, maxTurns: DEFAULT_MAX_TURNS, createdAt: 100, auto: false }

  test("a roadmap goal is unbounded", () => {
    expect(isUnbounded({ roadmap: true, maxTurns: UNBOUNDED_MAX_TURNS })).toBe(true)
    expect(isUnbounded({ roadmap: false, maxTurns: DEFAULT_MAX_TURNS })).toBe(false)
    expect(formatMaxTurns(UNBOUNDED_MAX_TURNS)).toBe("∞")
    expect(formatMaxTurns(5)).toBe("5")
  })

  test("a goal created before process start is restored, not auto-continued", () => {
    expect(isRestoredFromPreviousRun(goal, 200)).toBe(true)
    expect(isRestoredFromPreviousRun(goal, 50)).toBe(false)
    expect(restoredGoalNotice(goal)).toContain("restored after a restart")
  })
})
