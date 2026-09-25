import { beforeEach, describe, expect, it } from "bun:test"
import { GoalService, UNBOUNDED_MAX_TURNS } from "@/nocowboy/session/goal"
import { NoCowboySessionPrompt } from "@/nocowboy/session/prompt"

describe("NoCowboySessionPrompt.handleRoadmapCommand", () => {
  beforeEach(() => {
    GoalService.clear("roadmap-cmd-session")
  })

  it("starts an unbounded roadmap run with the roadmap target", () => {
    const result = NoCowboySessionPrompt.handleRoadmapCommand({
      sessionID: "roadmap-cmd-session" as never,
      arguments: "",
    })
    expect(result.kind).toBe("run")
    // The template is rendered with the target, so the conductor is told it is
    // the roadmap even though /roadmap was invoked with no argument.
    if (result.kind === "run") expect(result.arguments).toContain("docs/roadmap.json")

    const goal = GoalService.get("roadmap-cmd-session")
    expect(goal?.auto).toBe(true)
    expect(goal?.roadmap).toBe(true)
    expect(goal?.maxTurns).toBe(UNBOUNDED_MAX_TURNS)
    expect(goal?.condition).toContain("Autopilot run complete")
    expect(goal?.condition).toContain(NoCowboySessionPrompt.DEFAULT_ROADMAP_SCOPE)
    // Unbounded: the turn budget never stops a roadmap run mid-roadmap.
    expect(GoalService.exhausted("roadmap-cmd-session")).toBe(false)
    GoalService.bumpReact("roadmap-cmd-session")
    expect(GoalService.exhausted("roadmap-cmd-session")).toBe(false)
  })

  it("honours an explicit turn budget", () => {
    NoCowboySessionPrompt.handleRoadmapCommand({
      sessionID: "roadmap-cmd-session" as never,
      arguments: "--max-turns 25",
    })
    const goal = GoalService.get("roadmap-cmd-session")
    expect(goal?.maxTurns).toBe(25)
    expect(goal?.roadmap).toBe(true)
  })

  it("never resets an already-active roadmap run", () => {
    NoCowboySessionPrompt.handleRoadmapCommand({
      sessionID: "roadmap-cmd-session" as never,
      arguments: "",
    })
    GoalService.bumpReact("roadmap-cmd-session")
    GoalService.bumpReact("roadmap-cmd-session")

    const again = NoCowboySessionPrompt.handleRoadmapCommand({
      sessionID: "roadmap-cmd-session" as never,
      arguments: "",
    })
    expect(again.kind).toBe("handled")
    if (again.kind === "handled") expect(again.output).toContain("already active")

    const goal = GoalService.get("roadmap-cmd-session")
    expect(goal?.react).toBe(2)
    expect(goal?.roadmap).toBe(true)
    expect(goal?.auto).toBe(true)
  })

  it("re-arms a paused roadmap run without resetting progress", () => {
    NoCowboySessionPrompt.handleRoadmapCommand({
      sessionID: "roadmap-cmd-session" as never,
      arguments: "",
    })
    GoalService.bumpReact("roadmap-cmd-session")
    GoalService.setAuto("roadmap-cmd-session", false)

    const resumed = NoCowboySessionPrompt.handleRoadmapCommand({
      sessionID: "roadmap-cmd-session" as never,
      arguments: "",
    })
    expect(resumed.kind).toBe("run")

    const goal = GoalService.get("roadmap-cmd-session")
    expect(goal?.react).toBe(1)
    expect(goal?.auto).toBe(true)
    expect(goal?.roadmap).toBe(true)
  })

  it("an explicit --max-turns deliberately restarts with a new budget", () => {
    NoCowboySessionPrompt.handleRoadmapCommand({
      sessionID: "roadmap-cmd-session" as never,
      arguments: "",
    })
    GoalService.bumpReact("roadmap-cmd-session")
    NoCowboySessionPrompt.handleRoadmapCommand({
      sessionID: "roadmap-cmd-session" as never,
      arguments: "--max-turns 5",
    })
    const goal = GoalService.get("roadmap-cmd-session")
    expect(goal?.maxTurns).toBe(5)
    expect(goal?.react).toBe(0)
  })

  it("reports status and clears the run", () => {
    const none = NoCowboySessionPrompt.handleRoadmapCommand({
      sessionID: "roadmap-cmd-session" as never,
      arguments: "status",
    })
    expect(none.kind).toBe("handled")
    if (none.kind === "handled") expect(none.output).toContain("No roadmap run")

    NoCowboySessionPrompt.handleRoadmapCommand({
      sessionID: "roadmap-cmd-session" as never,
      arguments: "",
    })
    const status = NoCowboySessionPrompt.handleRoadmapCommand({
      sessionID: "roadmap-cmd-session" as never,
      arguments: "status",
    })
    expect(status.kind).toBe("handled")
    if (status.kind === "handled") expect(status.output).toContain("Roadmap run")

    const stop = NoCowboySessionPrompt.handleRoadmapCommand({
      sessionID: "roadmap-cmd-session" as never,
      arguments: "stop",
    })
    expect(stop.kind).toBe("handled")
    expect(GoalService.get("roadmap-cmd-session")).toBeUndefined()
  })
})

describe("NoCowboySessionPrompt.handleAutopilotCommand", () => {
  beforeEach(() => {
    GoalService.clear("autopilot-cmd-session")
  })

  it("arms the existing goal without resetting its target or budget", () => {
    GoalService.set("autopilot-cmd-session", "lint clean", 10)
    GoalService.bumpReact("autopilot-cmd-session")

    const result = NoCowboySessionPrompt.handleAutopilotCommand({
      sessionID: "autopilot-cmd-session" as never,
      arguments: "",
    })
    expect(result.kind).toBe("run")
    if (result.kind === "run") expect(result.arguments).toBe("lint clean")

    const goal = GoalService.get("autopilot-cmd-session")
    expect(goal?.auto).toBe(true)
    // Target, budget and turn count survive re-arming.
    expect(goal?.condition).toBe("lint clean")
    expect(goal?.maxTurns).toBe(10)
    expect(goal?.react).toBe(1)
    expect(goal?.roadmap).toBe(false)
  })

  it("does not invent a roadmap target when there is no goal", () => {
    const result = NoCowboySessionPrompt.handleAutopilotCommand({
      sessionID: "autopilot-cmd-session" as never,
      arguments: "",
    })
    expect(result.kind).toBe("handled")
    if (result.kind === "handled") expect(result.output).toContain("/roadmap")
    expect(GoalService.get("autopilot-cmd-session")).toBeUndefined()
  })

  it("pauses without clearing the goal", () => {
    GoalService.set("autopilot-cmd-session", "lint clean", 10, true)
    const result = NoCowboySessionPrompt.handleAutopilotCommand({
      sessionID: "autopilot-cmd-session" as never,
      arguments: "off",
    })
    expect(result.kind).toBe("handled")
    const goal = GoalService.get("autopilot-cmd-session")
    expect(goal?.auto).toBe(false)
    expect(goal?.condition).toBe("lint clean")
    expect(goal?.maxTurns).toBe(10)
  })

  it("toggles: arms an idle goal and pauses an armed one", () => {
    GoalService.set("autopilot-cmd-session", "lint clean", 10, false)
    const armed = NoCowboySessionPrompt.handleAutopilotCommand({
      sessionID: "autopilot-cmd-session" as never,
      arguments: "toggle",
    })
    expect(armed.kind).toBe("run")
    expect(GoalService.get("autopilot-cmd-session")?.auto).toBe(true)

    const paused = NoCowboySessionPrompt.handleAutopilotCommand({
      sessionID: "autopilot-cmd-session" as never,
      arguments: "toggle",
    })
    expect(paused.kind).toBe("handled")
    expect(GoalService.get("autopilot-cmd-session")?.auto).toBe(false)
  })

  it("accepts a custom scope and a turn budget", () => {
    const result = NoCowboySessionPrompt.handleAutopilotCommand({
      sessionID: "autopilot-cmd-session" as never,
      arguments: "fix the auth module --max-turns 7",
    })
    expect(result.kind).toBe("run")
    if (result.kind === "run") expect(result.arguments).toBe("fix the auth module")

    const goal = GoalService.get("autopilot-cmd-session")
    expect(goal?.auto).toBe(true)
    // A custom scope has no deterministic roadmap signal, so it stays a judged,
    // bounded run rather than an unbounded roadmap runner.
    expect(goal?.roadmap).toBe(false)
    expect(goal?.condition).toContain("fix the auth module")
    expect(goal?.condition).not.toContain("--max-turns")
    expect(goal?.maxTurns).toBe(7)
  })

  it("resumes an active run without resetting its budget", () => {
    GoalService.set("autopilot-cmd-session", "Autopilot run complete: x.", 20, true)
    GoalService.bumpReact("autopilot-cmd-session")
    GoalService.bumpReact("autopilot-cmd-session")

    const none = NoCowboySessionPrompt.handleAutopilotCommand({
      sessionID: "no-goal-session" as never,
      arguments: "resume",
    })
    expect(none.kind).toBe("handled")
    if (none.kind === "handled") expect(none.output).toContain("No active autopilot run")

    const resumed = NoCowboySessionPrompt.handleAutopilotCommand({
      sessionID: "autopilot-cmd-session" as never,
      arguments: "resume",
    })
    expect(resumed.kind).toBe("run")
    const goal = GoalService.get("autopilot-cmd-session")
    expect(goal?.react).toBe(2)
    expect(goal?.maxTurns).toBe(20)
    expect(goal?.auto).toBe(true)
  })

  it("reports status and clears the run", () => {
    const none = NoCowboySessionPrompt.handleAutopilotCommand({
      sessionID: "autopilot-cmd-session" as never,
      arguments: "status",
    })
    expect(none.kind).toBe("handled")
    if (none.kind === "handled") expect(none.output).toContain("No autopilot run")

    NoCowboySessionPrompt.handleAutopilotCommand({
      sessionID: "autopilot-cmd-session" as never,
      arguments: "docs cleanup",
    })
    const status = NoCowboySessionPrompt.handleAutopilotCommand({
      sessionID: "autopilot-cmd-session" as never,
      arguments: "status",
    })
    expect(status.kind).toBe("handled")
    if (status.kind === "handled") {
      expect(status.output).toContain("docs cleanup")
      expect(status.output).toContain("autopilot")
    }

    const stop = NoCowboySessionPrompt.handleAutopilotCommand({
      sessionID: "autopilot-cmd-session" as never,
      arguments: "stop",
    })
    expect(stop.kind).toBe("handled")
    expect(GoalService.get("autopilot-cmd-session")).toBeUndefined()
  })
})

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

  it("sets a deterministic manual goal for a plain condition", () => {
    NoCowboySessionPrompt.handleGoalCommand({
      sessionID: "goal-cmd-session" as never,
      arguments: "all tests pass",
    })
    const goal = GoalService.get("goal-cmd-session")
    expect(goal?.condition).toBe("all tests pass")
    expect(goal?.auto).toBe(false)
  })

  it("sets an autopilot goal for --auto and shows it in status", () => {
    const result = NoCowboySessionPrompt.handleGoalCommand({
      sessionID: "goal-cmd-session" as never,
      arguments: "--auto keep going --max-turns 5",
    })
    expect(result.kind).toBe("run")

    const goal = GoalService.get("goal-cmd-session")
    expect(goal?.condition).toBe("keep going")
    expect(goal?.auto).toBe(true)
    expect(goal?.maxTurns).toBe(5)

    const status = NoCowboySessionPrompt.handleGoalCommand({
      sessionID: "goal-cmd-session" as never,
      arguments: "status",
    })
    expect(status.kind).toBe("handled")
    if (status.kind === "handled") expect(status.output).toContain("autopilot")
  })

  it("does not treat a condition that starts with a sub-command word as a command", () => {
    const result = NoCowboySessionPrompt.handleGoalCommand({
      sessionID: "goal-cmd-session" as never,
      arguments: "clear the cache",
    })
    expect(result.kind).toBe("run")
    expect(GoalService.get("goal-cmd-session")?.condition).toBe("clear the cache")

    const stop = NoCowboySessionPrompt.handleGoalCommand({
      sessionID: "goal-cmd-session" as never,
      arguments: "stop the flaky test",
    })
    expect(stop.kind).toBe("run")
    expect(GoalService.get("goal-cmd-session")?.condition).toBe("stop the flaky test")
  })

  it("rejects a flags-only goal with usage", () => {
    const result = NoCowboySessionPrompt.handleGoalCommand({
      sessionID: "goal-cmd-session" as never,
      arguments: "--auto",
    })
    expect(result.kind).toBe("handled")
    if (result.kind === "handled") expect(result.output).toContain("Usage")
    expect(GoalService.get("goal-cmd-session")).toBeUndefined()
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
