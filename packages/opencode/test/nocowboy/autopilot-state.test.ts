import { beforeEach, describe, expect, it } from "bun:test"
import {
  autopilotArmed,
  setAutopilotArmed,
  shouldRunAsAutopilot,
} from "@/nocowboy/cli/cmd/tui/context/autopilot-state"

describe("autopilot armed mode", () => {
  beforeEach(() => setAutopilotArmed(false))

  it("is off by default", () => {
    expect(autopilotArmed()).toBe(false)
    expect(shouldRunAsAutopilot("do the thing")).toBe(false)
  })

  it("routes a plain prompt through autopilot when armed", () => {
    setAutopilotArmed(true)
    expect(shouldRunAsAutopilot("implement the feature")).toBe(true)
  })

  it("never hijacks slash commands when armed", () => {
    setAutopilotArmed(true)
    expect(shouldRunAsAutopilot("/goal clear")).toBe(false)
    expect(shouldRunAsAutopilot("  /autopilot x")).toBe(false)
  })

  it("ignores empty input when armed", () => {
    setAutopilotArmed(true)
    expect(shouldRunAsAutopilot("")).toBe(false)
    expect(shouldRunAsAutopilot("   \n  ")).toBe(false)
  })
})
