import { describe, expect, it } from "bun:test"
import path from "path"
import { Autopilot, AUTO_CONTINUE_MAX } from "@/nocowboy/session/autopilot"
import { autopilotCommand } from "@/nocowboy/autopilot/command"
import type { Goal } from "@/nocowboy/session/goal"
import { tmpdir } from "../fixture/fixture"

const goal: Goal = {
  condition: "all tests pass",
  react: 3,
  maxTurns: 10,
  createdAt: 1_000,
  auto: true,
}

describe("Autopilot.shouldContinue", () => {
  const base = {
    auto: true,
    stopped: true,
    blocked: false,
    continues: 0,
    followupPending: false,
  }

  it("continues an autopilot run when the model stopped without meeting the goal", () => {
    expect(Autopilot.shouldContinue(base)).toBe(true)
  })

  it("never continues a manual goal", () => {
    expect(Autopilot.shouldContinue({ ...base, auto: false })).toBe(false)
  })

  it("does not continue mid-turn (model has not stopped)", () => {
    expect(Autopilot.shouldContinue({ ...base, stopped: false })).toBe(false)
  })

  it("does not override a blocked/errored turn", () => {
    expect(Autopilot.shouldContinue({ ...base, blocked: true })).toBe(false)
  })

  it("does not pile up when a newer prompt is already queued", () => {
    expect(Autopilot.shouldContinue({ ...base, followupPending: true })).toBe(false)
  })

  it("stops at the per-turn cap", () => {
    expect(Autopilot.shouldContinue({ ...base, continues: AUTO_CONTINUE_MAX - 1 })).toBe(true)
    expect(Autopilot.shouldContinue({ ...base, continues: AUTO_CONTINUE_MAX })).toBe(false)
    expect(Autopilot.shouldContinue({ ...base, continues: 2, max: 2 })).toBe(false)
    expect(Autopilot.shouldContinue({ ...base, continues: 1, max: 2 })).toBe(true)
  })
})

describe("autopilotCommand", () => {
  it("is a built-in conductor command that runs under the auto agent", () => {
    const cmd = autopilotCommand()
    expect(cmd.name).toBe("autopilot")
    expect(cmd.agent).toBe("auto")
    expect(cmd.template).toContain("$ARGUMENTS")
    expect(cmd.template).toContain('task(subagent_type: "worker"')
    expect(cmd.template).toContain('task(subagent_type: "reviewer"')
    expect(cmd.hints).toContain("$ARGUMENTS")
  })

  it("enforces the reviewer gate: feature + tests + an up-to-date roadmap before the next stage", () => {
    const template = autopilotCommand().template as string
    // The gate is explicit and blocks the next stage.
    expect(template).toContain("A stage is NOT finished")
    expect(template).toContain("The next stage does not start before that")
    // The reviewer must confirm the roadmap is current, not just the code.
    expect(template).toContain("the roadmap is up to date for it")
    expect(template).toContain("bun run scripts/verify-roadmap.ts")
    // It must prove the tests actually run, and never mark done on its own.
    expect(template).toContain("the tests that prove it actually pass")
    expect(template).toContain("Do not mark `done` yet")
    // Never ask the human to continue.
    expect(template).toContain("end a turn by asking the user to continue")
  })
})

describe("Autopilot.buildContinuation", () => {
  const previous = {
    agent: "worker",
    model: { providerID: "test", modelID: "test-model" } as never,
    tools: { read: true },
  }

  it("builds a synthetic user message that carries the goal", () => {
    const { info, part } = Autopilot.buildContinuation({
      sessionID: "ses_auto" as never,
      goal,
      previous,
      now: 4242,
    })

    expect(info.role).toBe("user")
    expect(info.sessionID).toBe("ses_auto" as never)
    expect(info.agent).toBe("worker")
    expect(info.model).toEqual(previous.model)
    expect(info.time.created).toBe(4242)
    expect(info.id.startsWith("msg")).toBe(true)

    expect(part.type).toBe("text")
    expect(part.synthetic).toBe(true)
    expect(part.messageID).toBe(info.id)
    expect(part.text).toContain("all tests pass")
    expect(part.text).toContain("<autopilot-continue")
    expect(part.text).toContain("3/10")
    // Every harness continuation carries the deterministic stage gate.
    expect(part.text).toContain("No roadmap item is in progress")
  })

  it("tells the run to finish the in-progress stage before starting another", () => {
    const { part } = Autopilot.buildContinuation({
      sessionID: "ses_auto" as never,
      goal,
      previous,
      inProgress: ["goal-agent", "goal-headless"],
    })
    expect(part.text).toContain("A stage is still in progress")
    expect(part.text).toContain("goal-agent, goal-headless")
    expect(part.text).toContain("Do NOT start another roadmap item")
  })
})

describe("Autopilot stage gate", () => {
  it("computes in-progress ids from a roadmap", () => {
    expect(
      Autopilot.inProgressFromRoadmap({
        features: [
          { id: "a", status: "in_progress" },
          { id: "b", status: "done" },
          { id: "c", status: "in_progress" },
          { status: "in_progress" },
        ],
      }),
    ).toEqual(["a", "c"])
  })

  it("returns no ids for a missing or malformed roadmap", () => {
    expect(Autopilot.inProgressFromRoadmap(undefined)).toEqual([])
    expect(Autopilot.inProgressFromRoadmap({})).toEqual([])
    expect(Autopilot.inProgressFromRoadmap({ features: "nope" })).toEqual([])
  })

  it("reads the in-progress stage from docs/roadmap.json", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(
          path.join(dir, "docs", "roadmap.json"),
          JSON.stringify({ features: [{ id: "x", status: "in_progress" }, { id: "y", status: "planned" }] }),
        )
      },
    })
    expect(await Autopilot.readInProgress(tmp.path)).toEqual(["x"])
  })

  it("degrades to no in-progress stage when the roadmap is absent", async () => {
    await using tmp = await tmpdir()
    expect(await Autopilot.readInProgress(tmp.path)).toEqual([])
  })
})
