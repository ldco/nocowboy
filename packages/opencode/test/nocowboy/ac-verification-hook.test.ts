import { describe, expect, it, spyOn } from "bun:test"
import { ACVerificationHook } from "@/nocowboy/task/ac-verification-hook"
import { TaskRegistry } from "@/nocowboy/task/registry"
import type { TaskStatus } from "@/nocowboy/task/schema"
import { GoalService } from "@/nocowboy/session/goal"
import { StopHooks } from "@/nocowboy/session/stop-hooks"

const sessionID = "ac-verify-session"

function task(id: string, status: TaskStatus, summary: string) {
  return { id, session_id: sessionID, status, summary, created_at: Date.now(), last_event_at: Date.now() }
}

describe("ACVerificationHook", () => {
  it("does not continue for an internal (compaction/title/summary) turn even with a goal", () => {
    GoalService.set(sessionID, "all tests pass")
    const spy = spyOn(TaskRegistry, "list").mockReturnValue([task("T1", "in_progress", "work")])
    try {
      expect(ACVerificationHook.evaluate({ sessionID, agent: "compaction" })).toEqual({ continue: false })
    } finally {
      spy.mockRestore()
      GoalService.clear(sessionID)
    }
  })

  it("does not continue for a real agent without an active goal", () => {
    GoalService.clear(sessionID)
    expect(ACVerificationHook.evaluate({ sessionID, agent: "auto" })).toEqual({ continue: false })
  })

  it("is reachable for a real work agent (auto) with an active goal and unfinished tasks", () => {
    GoalService.set(sessionID, "finish the feature")
    const spy = spyOn(TaskRegistry, "list").mockReturnValue([
      task("T1", "in_progress", "fix test_auth"),
      task("T2", "open", "fix test_db"),
    ])
    try {
      const result = ACVerificationHook.evaluate({ sessionID, agent: "auto" })
      expect(result.continue).toBe(true)
      expect(result.reason).toContain("T1")
      expect(result.reason).toContain("T2")
      // The task summary travels with the reason so the re-entry is actionable.
      expect(result.reason).toContain("fix test_auth")
    } finally {
      spy.mockRestore()
      GoalService.clear(sessionID)
    }
  })

  it("does not continue when all tasks are terminal", () => {
    GoalService.set(sessionID, "all tests pass")
    const spy = spyOn(TaskRegistry, "list").mockReturnValue([task("T1", "done", "fix test_auth")])
    try {
      expect(ACVerificationHook.evaluate({ sessionID, agent: "auto" })).toEqual({ continue: false })
    } finally {
      spy.mockRestore()
      GoalService.clear(sessionID)
    }
  })

  it("a failing AC check blocks the turn end and yields a real continuation", () => {
    // The full stop-hook chain: AC check -> StopHooks.decide -> buildContinuation.
    // This is what SessionPrompt.runLoop persists to keep the turn alive.
    GoalService.set(sessionID, "finish the feature")
    const spy = spyOn(TaskRegistry, "list").mockReturnValue([task("T7", "in_progress", "wire the gate")])
    try {
      const ac = ACVerificationHook.evaluate({ sessionID, agent: "auto" })
      const decision = StopHooks.decide({ stop: { continue: false }, ac, continues: 0 })
      expect(decision.continue).toBe(true)
      const { part } = StopHooks.buildContinuation({
        sessionID: sessionID as never,
        reason: decision.reason,
        turn: decision.count,
        previous: {
          agent: "auto",
          model: { providerID: "test", modelID: "m" } as never,
          tools: undefined,
        },
      })
      expect(part.synthetic).toBe(true)
      expect(part.text).toContain("wire the gate")
    } finally {
      spy.mockRestore()
      GoalService.clear(sessionID)
    }
  })
})
