import { describe, expect, it } from "bun:test"
import { StopHooks, STOP_HOOK_MAX_BLOCKS } from "@/nocowboy/session/stop-hooks"

const base = {
  requested: true,
  reason: "not done",
  continues: 0,
  finished: true,
  blocked: false,
  followupPending: false,
}

describe("StopHooks.decide", () => {
  it("does not block when nothing requested it", () => {
    expect(StopHooks.decide({ ...base, requested: false })).toEqual({ block: false })
  })

  it("does not block a mid-turn step (not finished)", () => {
    expect(StopHooks.decide({ ...base, finished: false })).toEqual({ block: false })
  })

  it("does not override a blocked or compacted turn", () => {
    expect(StopHooks.decide({ ...base, blocked: true })).toEqual({ block: false })
  })

  it("does not override a queued follow-up", () => {
    expect(StopHooks.decide({ ...base, followupPending: true })).toEqual({ block: false })
  })

  it("blocks a finished turn and carries the reason", () => {
    expect(StopHooks.decide(base)).toEqual({ block: true, reason: "not done" })
  })

  it("stops blocking once the consecutive cap is reached", () => {
    expect(StopHooks.decide({ ...base, continues: STOP_HOOK_MAX_BLOCKS - 1 }).block).toBe(true)
    expect(StopHooks.decide({ ...base, continues: STOP_HOOK_MAX_BLOCKS })).toEqual({ block: false })
    expect(StopHooks.decide({ ...base, continues: STOP_HOOK_MAX_BLOCKS + 5 })).toEqual({ block: false })
  })

  it("honours a custom cap", () => {
    expect(StopHooks.decide({ ...base, continues: 2, max: 3 }).block).toBe(true)
    expect(StopHooks.decide({ ...base, continues: 3, max: 3 }).block).toBe(false)
  })
})

describe("StopHooks.continuationText", () => {
  it("tags the continuation and includes the reason", () => {
    const text = StopHooks.continuationText("acceptance criteria not met")
    expect(text).toContain("<stop-hook-continue>")
    expect(text).toContain("acceptance criteria not met")
    expect(text).toContain("</stop-hook-continue>")
  })

  it("omits the reason line when none is given", () => {
    expect(StopHooks.continuationText()).not.toContain("Reason:")
  })
})

describe("StopHooks.buildContinuation", () => {
  it("builds a synthetic user message that resolves like the previous turn", () => {
    const { info, part } = StopHooks.buildContinuation({
      sessionID: "ses_stop_hook" as never,
      previous: {
        agent: "build",
        model: { providerID: "test", modelID: "test-model" } as never,
        tools: undefined,
      },
      reason: "still not done",
    })
    expect(info.role).toBe("user")
    expect(info.agent).toBe("build")
    expect(String(info.model?.modelID)).toBe("test-model")
    expect(part.type).toBe("text")
    expect(part.synthetic).toBe(true)
    expect(part.text).toContain("still not done")
    expect(part.messageID).toBe(info.id)
  })
})
