import { describe, expect, it } from "bun:test"
import { resolveRunCommand } from "@/nocowboy/cli/cmd/run-autopilot"

function ok(input: Parameters<typeof resolveRunCommand>[0]) {
  const result = resolveRunCommand(input)
  if (!result.ok) throw new Error(`expected ok, got error: ${result.error}`)
  return result.value
}

describe("resolveRunCommand", () => {
  it("maps --agent goal to the autopilot command and drops the pseudo-agent", () => {
    expect(ok({ agent: "goal", message: "run the roadmap" })).toEqual({
      command: "autopilot",
      agent: undefined,
      arguments: "run the roadmap",
    })
  })

  it("maps --autopilot to the autopilot command and forwards --max-turns", () => {
    expect(ok({ autopilot: true, maxTurns: 7, message: "docs cleanup" })).toEqual({
      command: "autopilot",
      agent: undefined,
      arguments: "docs cleanup --max-turns 7",
    })
  })

  it("forwards --max-turns even with an empty scope", () => {
    expect(ok({ autopilot: true, maxTurns: 3, message: "" }).arguments).toBe("--max-turns 3")
  })

  it("does not append --max-turns for a non-autopilot command", () => {
    expect(ok({ command: "review", maxTurns: 5, message: "focus tests" })).toEqual({
      command: "review",
      agent: undefined,
      arguments: "focus tests",
    })
  })

  it("passes a normal prompt through untouched", () => {
    expect(ok({ agent: "worker", message: "hello" })).toEqual({
      command: undefined,
      agent: "worker",
      arguments: "hello",
    })
  })

  it("rejects --autopilot combined with another command", () => {
    const result = resolveRunCommand({ autopilot: true, command: "review", message: "x" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("--autopilot")
  })

  it("resumes an interrupted autopilot run when resuming with no message", () => {
    expect(ok({ resume: true, message: "" })).toEqual({
      command: "autopilot",
      agent: undefined,
      arguments: "resume",
    })
  })

  it("does not treat a resume with a message as a resume", () => {
    expect(ok({ resume: true, message: "now do X" })).toEqual({
      command: undefined,
      agent: undefined,
      arguments: "now do X",
    })
  })

  it("lets an explicit command win over resume", () => {
    expect(ok({ resume: true, command: "review", message: "" }).command).toBe("review")
  })
})
