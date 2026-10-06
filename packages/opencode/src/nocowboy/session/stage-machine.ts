/**
 * Deterministic stage machine.
 *
 * A quality-gated work chain — design → plan → implement → verify → accept —
 * must advance on **artifacts and results** (a recorded plan, changed files, a
 * test that actually ran, accepted acceptance criteria), never on the presence
 * of the words "APPROVED" / "DONE" in the assistant text. The prompt is a hint;
 * this gate is the barrier.
 *
 * The module is pure: `gate`/`advance`/`stopRequest` are deterministic and need
 * no engine, so the transition rules are unit-testable. The autopilot roadmap
 * gate (`roadmapGate`) is expressed on top of the same chain.
 */

export const STAGES = ["design", "plan", "implement", "verify", "accept"] as const
export type Stage = (typeof STAGES)[number]

/** Artifact/result evidence keyed by the stage that produces it. */
export interface StageEvidence {
  /** A design decision/ADR exists (id or path). */
  design?: boolean
  /** A plan was recorded (non-empty steps) before coding. */
  plan?: boolean
  /** The implementation changed something (a non-empty diff). */
  changed?: boolean
  /** The verification actually ran and passed (test/check evidence). */
  verified?: boolean
  /** Acceptance criteria carry evidence. */
  accepted?: boolean
}

/** The evidence a stage must produce before the chain may advance past it. */
export const EVIDENCE_FOR: Record<Stage, keyof StageEvidence> = {
  design: "design",
  plan: "plan",
  implement: "changed",
  verify: "verified",
  accept: "accepted",
}

/** True when the stage's required artifact/result is present. */
export function stageSatisfied(stage: Stage, evidence: StageEvidence): boolean {
  return evidence[EVIDENCE_FOR[stage]] === true
}

/**
 * The stages whose required evidence is missing, in chain order. An empty array
 * means every stage up to and including `accept` has its artifact.
 */
export function missingEvidence(evidence: StageEvidence): Stage[] {
  return STAGES.filter((stage) => !stageSatisfied(stage, evidence))
}

export interface Gate {
  /** The current stage's evidence is present — the chain may advance. */
  ok: boolean
  /** The stage being gated. */
  stage: Stage
  /** The evidence key this stage requires. */
  required: keyof StageEvidence
}

/** Deterministic gate for one stage: may the chain advance past it? */
export function gate(stage: Stage, evidence: StageEvidence): Gate {
  const required = EVIDENCE_FOR[stage]
  return { ok: evidence[required] === true, stage, required }
}

/**
 * Advance one stage if the gate passes; otherwise stay. This is what prevents
 * `implement` from being entered without a recorded `plan`: `advance("plan", …)`
 * never returns "implement" while `evidence.plan` is falsy.
 */
export function advance(stage: Stage, evidence: StageEvidence): Stage {
  if (!gate(stage, evidence).ok) return stage
  const index = STAGES.indexOf(stage)
  return STAGES[Math.min(index + 1, STAGES.length - 1)]
}

/**
 * Adapter for the turn-level stop hook: while a stage's evidence is missing the
 * harness should block the turn and tell the model exactly which artifact is
 * missing — the barrier is the artifact, not a word the model wrote.
 */
export function stopRequest(stage: Stage, evidence: StageEvidence): { requested: boolean; reason?: string } {
  const result = gate(stage, evidence)
  if (result.ok) return { requested: false }
  return {
    requested: true,
    reason: `stage "${stage}" is not finished: its required evidence "${result.required}" is missing. Produce it (run the test, record the plan, land the diff) before finishing the turn.`,
  }
}

export interface RoadmapGate {
  /** The stage the run is in. */
  stage: Stage
  /** The item the stage refers to, when there is one. */
  item?: string
  /** Deterministically complete: a readable roadmap with no actionable items. */
  complete: boolean
  /** Whether the run must keep going. */
  continue: boolean
}

/**
 * The autopilot roadmap gate expressed on the same chain. It is deterministic
 * and artifact-based (the roadmap's item statuses), not word-based:
 *  - no readable roadmap            → design (nothing to accept)
 *  - an item in progress            → verify (finish + review it first)
 *  - a planned item and none live   → plan (start the next one)
 *  - no actionable items            → accept (the run is complete)
 */
export function roadmapGate(input: { hasFeatures: boolean; actionable: string[]; inProgress: string[] }): RoadmapGate {
  if (!input.hasFeatures) return { stage: "design", complete: false, continue: true }
  if (input.actionable.length === 0) return { stage: "accept", complete: true, continue: false }
  if (input.inProgress.length > 0) return { stage: "verify", item: input.inProgress[0], complete: false, continue: true }
  return { stage: "plan", item: input.actionable[0], complete: false, continue: true }
}
