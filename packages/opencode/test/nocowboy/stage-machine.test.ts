import { describe, expect, test } from "bun:test"
import {
  advance,
  EVIDENCE_FOR,
  gate,
  missingEvidence,
  roadmapGate,
  STAGES,
  stageSatisfied,
  stopRequest,
  type StageEvidence,
} from "@/nocowboy/session/stage-machine"

describe("stage machine — artifact/result gate", () => {
  test("the chain is design → plan → implement → verify → accept", () => {
    expect([...STAGES]).toEqual(["design", "plan", "implement", "verify", "accept"])
  })

  test("a stage is satisfied only by its own artifact, never by a word", () => {
    const evidence: StageEvidence = { plan: true }
    expect(stageSatisfied("plan", evidence)).toBe(true)
    expect(stageSatisfied("implement", evidence)).toBe(false)
    // No amount of "APPROVED"/"DONE" text is evidence — only the artifact counts.
    expect(gate("implement", evidence).ok).toBe(false)
    expect(gate("implement", evidence).required).toBe("changed")
    expect(EVIDENCE_FOR.verify).toBe("verified")
  })

  test("missingEvidence lists every stage without its artifact, in chain order", () => {
    expect(missingEvidence({})).toEqual(["design", "plan", "implement", "verify", "accept"])
    expect(missingEvidence({ design: true, plan: true })).toEqual(["implement", "verify", "accept"])
    expect(missingEvidence({ design: true, plan: true, changed: true, verified: true, accepted: true })).toEqual([])
  })
})

describe("advance — the barrier", () => {
  test("never reaches implement without a recorded plan", () => {
    expect(advance("plan", { design: true })).toBe("plan")
    expect(advance("plan", { plan: true })).toBe("implement")
  })

  test("never advances past verify without verification evidence", () => {
    expect(advance("verify", { changed: true })).toBe("verify")
    expect(advance("verify", { verified: true })).toBe("accept")
  })

  test("stays at accept once accepted and steps forward only with evidence", () => {
    expect(advance("accept", { accepted: true })).toBe("accept")
    expect(advance("design", {})).toBe("design")
    expect(advance("design", { design: true })).toBe("plan")
  })
})

describe("stopRequest — turn-level adapter", () => {
  test("blocks while the stage's artifact is missing, naming the artifact", () => {
    const request = stopRequest("verify", { changed: true })
    expect(request.requested).toBe(true)
    expect(request.reason).toContain("verified")
  })

  test("does not block once the artifact is present", () => {
    expect(stopRequest("verify", { verified: true })).toEqual({ requested: false })
  })
})

describe("roadmapGate — deterministic run gate", () => {
  test("no readable roadmap → design, still going", () => {
    expect(roadmapGate({ hasFeatures: false, actionable: [], inProgress: [] })).toEqual({
      stage: "design",
      complete: false,
      continue: true,
    })
  })

  test("a planned item and nothing live → plan the next one", () => {
    expect(roadmapGate({ hasFeatures: true, actionable: ["a", "b"], inProgress: [] })).toEqual({
      stage: "plan",
      item: "a",
      complete: false,
      continue: true,
    })
  })

  test("an item in progress → finish and review it first (verify)", () => {
    expect(roadmapGate({ hasFeatures: true, actionable: ["a"], inProgress: ["a"] })).toEqual({
      stage: "verify",
      item: "a",
      complete: false,
      continue: true,
    })
  })

  test("no actionable items → accept (complete)", () => {
    expect(roadmapGate({ hasFeatures: true, actionable: [], inProgress: [] })).toEqual({
      stage: "accept",
      complete: true,
      continue: false,
    })
  })
})
