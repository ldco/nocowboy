import { describe, expect, it } from "bun:test"
import { runLabel } from "@/nocowboy/components/run-label"

// nocowboy_change: the badge is a short mode toggle — ROADMAP vs a custom
// AUTOPILOT goal, armed (▶) or paused (⏸). The step and progress live in the
// sidebar's "Roadmap" section, not in the badge.
describe("runLabel", () => {
  it("shows the bare toggle when there is no goal", () => {
    expect(runLabel(undefined)).toBe("[AUTOPILOT]")
  })

  it("names an armed roadmap run", () => {
    expect(runLabel({ auto: true, roadmap: true })).toBe("[ROADMAP ▶]")
  })

  it("marks a paused roadmap run with ⏸", () => {
    expect(runLabel({ auto: false, roadmap: true })).toBe("[ROADMAP ⏸]")
  })

  it("labels a custom goal as AUTOPILOT", () => {
    expect(runLabel({ auto: true })).toBe("[AUTOPILOT ▶]")
    expect(runLabel({ auto: false })).toBe("[AUTOPILOT ⏸]")
  })
})
