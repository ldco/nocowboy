import { describe, expect, it, beforeEach } from "bun:test"
import { GoalService, DEFAULT_MAX_TURNS } from "@/nocowboy/session/goal"

describe("GoalService", () => {
  beforeEach(() => {
    GoalService.clear("test-session-1")
    GoalService.clear("test-session-2")
  })

  it("sets and gets a goal with default max turns", () => {
    GoalService.set("test-session-1", "all tests pass")
    const goal = GoalService.get("test-session-1")
    expect(goal).toBeDefined()
    expect(goal?.condition).toBe("all tests pass")
    expect(goal?.react).toBe(0)
    expect(goal?.maxTurns).toBe(DEFAULT_MAX_TURNS)
    expect(goal?.createdAt).toBeGreaterThan(0)
  })

  it("sets and gets a goal with custom max turns", () => {
    GoalService.set("test-session-1", "lint is clean", 5)
    const goal = GoalService.get("test-session-1")
    expect(goal?.maxTurns).toBe(5)
  })

  it("returns undefined for unknown session", () => {
    expect(GoalService.get("nonexistent")).toBeUndefined()
  })

  it("clears a goal", () => {
    GoalService.set("test-session-1", "all tests pass")
    GoalService.clear("test-session-1")
    expect(GoalService.get("test-session-1")).toBeUndefined()
  })

  it("bumpReact increments the counter", () => {
    GoalService.set("test-session-1", "all tests pass")
    expect(GoalService.bumpReact("test-session-1")).toBe(1)
    expect(GoalService.bumpReact("test-session-1")).toBe(2)
    expect(GoalService.get("test-session-1")?.react).toBe(2)
  })

  it("bumpReact returns 0 for unknown session", () => {
    expect(GoalService.bumpReact("nonexistent")).toBe(0)
  })

  it("exhausted is false before budget is spent", () => {
    GoalService.set("test-session-1", "all tests pass", 3)
    expect(GoalService.exhausted("test-session-1")).toBe(false)
    GoalService.bumpReact("test-session-1")
    GoalService.bumpReact("test-session-1")
    expect(GoalService.exhausted("test-session-1")).toBe(false)
    GoalService.bumpReact("test-session-1")
    expect(GoalService.exhausted("test-session-1")).toBe(true)
  })

  it("exhausted is false for unknown session", () => {
    expect(GoalService.exhausted("nonexistent")).toBe(false)
  })

  it("sessions are isolated", () => {
    GoalService.set("test-session-1", "goal one", 2)
    GoalService.set("test-session-2", "goal two", 10)
    GoalService.bumpReact("test-session-1")
    GoalService.bumpReact("test-session-1")
    expect(GoalService.exhausted("test-session-1")).toBe(true)
    expect(GoalService.exhausted("test-session-2")).toBe(false)
    expect(GoalService.get("test-session-2")?.condition).toBe("goal two")
  })
})
