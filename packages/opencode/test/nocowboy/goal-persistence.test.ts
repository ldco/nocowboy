import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { GoalService, UNBOUNDED_MAX_TURNS, isRestoredFromPreviousRun, restoredGoalNotice } from "../../src/nocowboy/session/goal"

// Goals are persisted so an autonomous run survives a restart (docs/adr/005).
// The module reads the directory per call, so pointing the env at a temp dir is
// enough to keep the test off the real data directory.
let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nocowboy-goals-"))
  process.env.NOCOWBOY_GOALS_DIR = dir
})

afterEach(() => {
  delete process.env.NOCOWBOY_GOALS_DIR
  rmSync(dir, { recursive: true, force: true })
})

describe("GoalService persistence", () => {
  test("a set goal is written to disk and read back", () => {
    GoalService.set("ses_abc", "all tests pass", 7)

    const goal = GoalService.get("ses_abc")
    expect(goal?.condition).toBe("all tests pass")
    expect(goal?.maxTurns).toBe(7)
    expect(goal?.react).toBe(0)

    // The state is on disk, not in a process-local map: a restart reads it.
    const files = readdirSync(dir)
    expect(files).toEqual(["ses_abc.json"])
    const onDisk = JSON.parse(readFileSync(join(dir, "ses_abc.json"), "utf-8"))
    expect(onDisk.condition).toBe("all tests pass")
    expect(onDisk.react).toBe(0)
  })

  test("autopilot mode is persisted and read back", () => {
    GoalService.set("ses_auto", "keep going", 5, true)
    expect(GoalService.get("ses_auto")?.auto).toBe(true)

    const onDisk = JSON.parse(readFileSync(join(dir, "ses_auto.json"), "utf-8"))
    expect(onDisk.auto).toBe(true)
  })

  test("a roadmap run is persisted and read back", () => {
    GoalService.set("ses_roadmap", "run the roadmap", UNBOUNDED_MAX_TURNS, true, true)
    const goal = GoalService.get("ses_roadmap")
    expect(goal?.roadmap).toBe(true)
    expect(goal?.maxTurns).toBe(UNBOUNDED_MAX_TURNS)

    const onDisk = JSON.parse(readFileSync(join(dir, "ses_roadmap.json"), "utf-8"))
    expect(onDisk.roadmap).toBe(true)
  })

  test("a legacy goal file without the roadmap flag is not a roadmap run", () => {
    writeFileSync(
      join(dir, "ses_legacy_roadmap.json"),
      JSON.stringify({ condition: "old", react: 1, maxTurns: 4, createdAt: 1, auto: true }),
      "utf-8",
    )
    expect(GoalService.get("ses_legacy_roadmap")?.roadmap).toBe(false)
  })

  test("an unbounded goal is never exhausted, however many turns it reacts", () => {
    GoalService.set("ses_unbounded", "run the roadmap", UNBOUNDED_MAX_TURNS, true, true)
    expect(GoalService.exhausted("ses_unbounded")).toBe(false)
    for (let i = 0; i < 50; i++) GoalService.bumpReact("ses_unbounded")
    expect(GoalService.get("ses_unbounded")?.react).toBe(50)
    expect(GoalService.exhausted("ses_unbounded")).toBe(false)
  })

  test("a non-roadmap goal with a zero budget still stops immediately", () => {
    GoalService.set("ses_zero", "keep going", 0, true, false)
    expect(GoalService.exhausted("ses_zero")).toBe(true)
  })

  test("a goal set without auto is a manual goal", () => {
    GoalService.set("ses_manual", "keep going")
    expect(GoalService.get("ses_manual")?.auto).toBe(false)
  })

  test("a legacy goal file without auto reads back as manual", () => {
    writeFileSync(
      join(dir, "ses_legacy.json"),
      JSON.stringify({ condition: "old", react: 1, maxTurns: 4, createdAt: 1 }),
      "utf-8",
    )
    const goal = GoalService.get("ses_legacy")
    expect(goal?.condition).toBe("old")
    expect(goal?.auto).toBe(false)
  })

  test("lists all persisted goals", () => {
    GoalService.set("ses_one", "first", 4, true)
    GoalService.set("ses_two", "second", 2)

    const list = GoalService.list()
    expect(list.map((x) => x.sessionID).sort()).toEqual(["ses_one", "ses_two"])
    const one = list.find((x) => x.sessionID === "ses_one")
    expect(one?.goal.condition).toBe("first")
    expect(one?.goal.auto).toBe(true)
    expect(one?.goal.maxTurns).toBe(4)
    expect(list.find((x) => x.sessionID === "ses_two")?.goal.auto).toBe(false)
  })

  test("lists nothing when there are no goals", () => {
    expect(GoalService.list()).toEqual([])
  })

  test("the turn counter is persisted on every bump", () => {
    GoalService.set("ses_abc", "done", 3)
    expect(GoalService.bumpReact("ses_abc")).toBe(1)
    expect(GoalService.bumpReact("ses_abc")).toBe(2)

    const onDisk = JSON.parse(readFileSync(join(dir, "ses_abc.json"), "utf-8"))
    expect(onDisk.react).toBe(2)
    expect(GoalService.get("ses_abc")?.react).toBe(2)
  })

  test("the turn budget is exhausted at maxTurns", () => {
    GoalService.set("ses_abc", "done", 2)
    expect(GoalService.exhausted("ses_abc")).toBe(false)
    GoalService.bumpReact("ses_abc")
    expect(GoalService.exhausted("ses_abc")).toBe(false)
    GoalService.bumpReact("ses_abc")
    expect(GoalService.exhausted("ses_abc")).toBe(true)
  })

  test("clear removes the goal and its file", () => {
    GoalService.set("ses_abc", "done")
    GoalService.clear("ses_abc")
    expect(GoalService.get("ses_abc")).toBeUndefined()
    expect(readdirSync(dir)).toEqual([])
  })

  test("an unknown session has no goal, and bumping it is a no-op", () => {
    expect(GoalService.get("ses_missing")).toBeUndefined()
    expect(GoalService.bumpReact("ses_missing")).toBe(0)
    expect(GoalService.exhausted("ses_missing")).toBe(false)
  })

  test("a corrupt file is treated as no goal instead of throwing", () => {
    writeFileSync(join(dir, "ses_broken.json"), "{not json", "utf-8")
    expect(() => GoalService.get("ses_broken")).not.toThrow()
    expect(GoalService.get("ses_broken")).toBeUndefined()
  })

  test("session ids are sanitised into safe file names", () => {
    GoalService.set("ses/../weird id", "done")
    expect(GoalService.get("ses/../weird id")?.condition).toBe("done")
    expect(readdirSync(dir)).toEqual(["ses_.._weird_id.json"])
  })

  test("two sessions keep separate goals", () => {
    GoalService.set("ses_a", "goal a")
    GoalService.set("ses_b", "goal b")
    expect(GoalService.get("ses_a")?.condition).toBe("goal a")
    expect(GoalService.get("ses_b")?.condition).toBe("goal b")
    GoalService.clear("ses_a")
    expect(GoalService.get("ses_b")?.condition).toBe("goal b")
  })
})

describe("restored goal detection", () => {
  const goal = { condition: "all tests pass", react: 3, maxTurns: 20, createdAt: 1_000, auto: false }

  test("a goal created before the process started counts as restored", () => {
    expect(isRestoredFromPreviousRun(goal, 2_000)).toBe(true)
  })

  test("a goal created in this run is not restored", () => {
    expect(isRestoredFromPreviousRun(goal, 500)).toBe(false)
    expect(isRestoredFromPreviousRun(goal, 1_000)).toBe(false)
  })

  test("the notice names the condition and the turn budget", () => {
    const notice = restoredGoalNotice(goal)
    expect(notice).toContain("all tests pass")
    expect(notice).toContain("turn 3/20")
    expect(notice).toContain("/goal clear")
  })

  test("the notice shows an unbounded budget as ∞", () => {
    const notice = restoredGoalNotice({ ...goal, maxTurns: UNBOUNDED_MAX_TURNS, roadmap: true })
    expect(notice).toContain("turn 3/∞")
  })
})
