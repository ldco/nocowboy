import { describe, expect, it } from "bun:test"
import { StopHooks, STOP_HOOK_MAX } from "@/nocowboy/session/stop-hooks"

const noHook = { continue: false }
const noAC = { continue: false }

describe("StopHooks.decide", () => {
  it("lets the turn end and resets the streak when nothing requests a continuation", () => {
    expect(StopHooks.decide({ stop: noHook, ac: noAC, continues: 3 })).toEqual({
      continue: false,
      count: 0,
    })
  })

  it("really continues the turn when the session.stop hook requests it", () => {
    const out = StopHooks.decide({
      stop: { continue: true, reason: "tests still red" },
      ac: noAC,
      continues: 0,
    })
    expect(out.continue).toBe(true)
    expect(out.count).toBe(1)
    expect(out.reason).toBe("tests still red")
  })

  it("prefers the AC check reason when both channels fire", () => {
    const out = StopHooks.decide({
      stop: { continue: true, reason: "plugin reason" },
      ac: { continue: true, reason: "task T1 unfinished" },
      continues: 2,
    })
    expect(out.continue).toBe(true)
    expect(out.count).toBe(3)
    expect(out.reason).toBe("task T1 unfinished")
  })

  it("continues while the streak is below the cap", () => {
    const out = StopHooks.decide({
      stop: { continue: true, reason: "again" },
      ac: noAC,
      continues: STOP_HOOK_MAX - 1,
    })
    expect(out.continue).toBe(true)
    expect(out.count).toBe(STOP_HOOK_MAX)
  })

  it("stops and resets the streak once the cap is reached", () => {
    const out = StopHooks.decide({
      stop: { continue: true, reason: "again" },
      ac: noAC,
      continues: STOP_HOOK_MAX,
    })
    expect(out.continue).toBe(false)
    expect(out.count).toBe(0)
  })

  it("honours an explicit max", () => {
    expect(StopHooks.decide({ stop: { continue: true }, ac: noAC, continues: 1, max: 2 }).continue).toBe(true)
    expect(StopHooks.decide({ stop: { continue: true }, ac: noAC, continues: 2, max: 2 }).continue).toBe(false)
  })
})

describe("StopHooks.continuationText", () => {
  it("wraps the reason in an explicit stop-hook continuation marker", () => {
    const text = StopHooks.continuationText({ reason: "lint failing", turn: 1, max: 8 })
    expect(text).toContain('<stop-hook-continue turn="1/8">')
    expect(text).toContain("Reason: lint failing")
    expect(text).toContain("</stop-hook-continue>")
  })
})

describe("StopHooks.buildContinuation", () => {
  it("builds a synthetic user message that reuses the previous agent/model/tools", () => {
    const previous = {
      agent: "auto",
      model: { providerID: "prov", modelID: "m1" } as never,
      tools: { bash: true },
    }
    const { info, part } = StopHooks.buildContinuation({
      sessionID: "sess-stop" as never,
      reason: "coverage gate",
      turn: 2,
      previous,
    })
    expect(info.role).toBe("user")
    expect(info.agent).toBe("auto")
    expect(info.model).toEqual(previous.model)
    expect(info.tools).toEqual({ bash: true })
    expect(part.type).toBe("text")
    expect(part.synthetic).toBe(true)
    expect(part.messageID).toBe(info.id)
    expect(part.text).toContain("coverage gate")
    expect(part.text).toContain('<stop-hook-continue turn="2/8">')
  })
})
