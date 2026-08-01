import { describe, expect, it, spyOn } from "bun:test"
import { ACVerificationHook } from "@/nocowboy/task/ac-verification-hook"
import { TaskRegistry } from "@/nocowboy/task/registry"
import { GoalService } from "@/nocowboy/session/goal"

const sessionID = "ac-verify-session"

describe("ACVerificationHook", () => {
  it("does not continue for non-goal agents", () => {
    const result = ACVerificationHook.evaluate({ sessionID, agent: "code" })
    expect(result).toEqual({ continue: false })
  })

  it("does not continue for goal agent without an active goal", () => {
    GoalService.clear(sessionID)
    const result = ACVerificationHook.evaluate({ sessionID, agent: "goal" })
    expect(result).toEqual({ continue: false })
  })

  it("requests continue when the goal agent owns incomplete tasks", () => {
    GoalService.set(sessionID, "all tests pass")
    const spy = spyOn(TaskRegistry, "list").mockReturnValue([
      {
        id: "T1",
        session_id: sessionID,
        status: "in_progress",
        summary: "fix test_auth",
        created_at: Date.now(),
        last_event_at: Date.now(),
      },
      {
        id: "T2",
        session_id: sessionID,
        status: "open",
        summary: "fix test_db",
        created_at: Date.now(),
        last_event_at: Date.now(),
      },
    ])
    try {
      const result = ACVerificationHook.evaluate({ sessionID, agent: "goal" })
      expect(result.continue).toBe(true)
      expect(result.reason).toContain("T1")
      expect(result.reason).toContain("T2")
    } finally {
      spy.mockRestore()
      GoalService.clear(sessionID)
    }
  })

  it("does not continue when all tasks are terminal", () => {
    GoalService.set(sessionID, "all tests pass")
    const spy = spyOn(TaskRegistry, "list").mockReturnValue([
      {
        id: "T1",
        session_id: sessionID,
        status: "done",
        summary: "fix test_auth",
        created_at: Date.now(),
        last_event_at: Date.now(),
      },
    ])
    try {
      const result = ACVerificationHook.evaluate({ sessionID, agent: "goal" })
      expect(result).toEqual({ continue: false })
    } finally {
      spy.mockRestore()
      GoalService.clear(sessionID)
    }
  })
})
