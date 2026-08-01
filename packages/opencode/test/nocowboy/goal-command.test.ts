import { beforeEach, describe, expect, it } from "bun:test"
import { GoalService } from "@/nocowboy/session/goal"
import { NoCowboySessionPrompt } from "@/nocowboy/session/prompt"

describe("NoCowboySessionPrompt.handleGoalCommand", () => {
  beforeEach(() => {
    GoalService.clear("goal-cmd-session")
  })

  it("returns 'run' for a real goal condition", () => {
    const result = NoCowboySessionPrompt.handleGoalCommand({
      sessionID: "goal-cmd-session" as never,
      arguments: "all tests pass",
    })
    expect(result.kind).toBe("run")
  })

  it("reports no active goal for status", () => {
    const result = NoCowboySessionPrompt.handleGoalCommand({
      sessionID: "goal-cmd-session" as never,
      arguments: "status",
    })
    expect(result.kind).toBe("handled")
    if (result.kind === "handled") {
      expect(result.output).toContain("No active goal")
    }
  })

  it("reports active goal status with turn progress", () => {
    GoalService.set("goal-cmd-session", "lint clean", 10)
    GoalService.bumpReact("goal-cmd-session")
    GoalService.bumpReact("goal-cmd-session")
    const result = NoCowboySessionPrompt.handleGoalCommand({
      sessionID: "goal-cmd-session" as never,
      arguments: "status",
    })
    expect(result.kind).toBe("handled")
    if (result.kind === "handled") {
      expect(result.output).toContain("lint clean")
      expect(result.output).toContain("2/10")
    }
  })

  it("reports exhausted budget in status", () => {
    GoalService.set("goal-cmd-session", "lint clean", 2)
    GoalService.bumpReact("goal-cmd-session")
    GoalService.bumpReact("goal-cmd-session")
    const result = NoCowboySessionPrompt.handleGoalCommand({
      sessionID: "goal-cmd-session" as never,
      arguments: "status",
    })
    expect(result.kind).toBe("handled")
    if (result.kind === "handled") {
      expect(result.output).toContain("exhausted")
    }
  })

  it("clears the goal for 'clear'", () => {
    GoalService.set("goal-cmd-session", "lint clean")
    const result = NoCowboySessionPrompt.handleGoalCommand({
      sessionID: "goal-cmd-session" as never,
      arguments: "clear",
    })
    expect(result.kind).toBe("handled")
    if (result.kind === "handled") {
      expect(result.output).toContain("Goal cleared")
    }
    expect(GoalService.get("goal-cmd-session")).toBeUndefined()
  })

  it("clears the goal for 'cancel' and 'stop' aliases", () => {
    GoalService.set("goal-cmd-session", "lint clean")
    const result = NoCowboySessionPrompt.handleGoalCommand({
      sessionID: "goal-cmd-session" as never,
      arguments: "stop",
    })
    expect(result.kind).toBe("handled")
    expect(GoalService.get("goal-cmd-session")).toBeUndefined()
  })
})
