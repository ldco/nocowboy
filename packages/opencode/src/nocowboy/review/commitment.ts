/**
 * Commitment-Boundary Review — mandatory ship / fix-first / rethink before a
 * deliverable closes.
 *
 * Every deliverable is reviewed once, at its boundary, by a *fresh* model that
 * reads the diff from scratch and returns exactly one verdict. This module is
 * the checkable policy: parse the verdict, and refuse to close a deliverable
 * when there is no verdict or when the reviewer is not a different model from
 * the author (an independent boundary review is the whole point).
 *
 * Pure: no engine, no Effect, no model access.
 */

import type { CascadeModel } from "./cascade"

export const COMMITMENT_VERDICTS = ["ship", "fix-first", "rethink"] as const
export type CommitmentVerdict = (typeof COMMITMENT_VERDICTS)[number]

export interface CommitmentReport {
  verdict: CommitmentVerdict
  /** The reviewer's one-line justification. */
  summary: string
}

/** The prompt for the fresh reviewer: read the diff cold, return one verdict. */
export const COMMITMENT_PROMPT = [
  "You are a fresh reviewer at the commitment boundary of this deliverable. You did",
  "not write this code. Read the diff from scratch and decide whether it should ship.",
  "",
  "Return exactly one verdict, on its own line:",
  "  ship        — correct, complete, safe to merge",
  "  fix-first   — close, but a specific problem must be fixed before merging",
  "  rethink     — the approach is wrong; do not merge as-is",
  "",
  "Follow the verdict with a one-line reason. Be concrete; cite files and lines.",
].join("\n")

const VERDICT_LINE = /(?:^|\b)verdict\s*[:\-]?\s*(ship|fix[- ]first|rethink)\b/i
const BARE_VERDICT = /\b(ship|fix[- ]first|rethink)\b/i

function normalize(token: string): CommitmentVerdict {
  return token.toLowerCase().replace(/[\s_]+/g, "-") === "fix-first" ? "fix-first" : (token.toLowerCase() as CommitmentVerdict)
}

/**
 * Parse a reviewer report. Prefers an explicit `VERDICT: …` line, falls back to
 * the first bare verdict word. Returns undefined when no verdict is present —
 * the gate then blocks the deliverable.
 */
export function parseCommitmentVerdict(text: string): CommitmentReport | undefined {
  const lines = text.split("\n")
  for (const line of lines) {
    const explicit = VERDICT_LINE.exec(line)
    if (explicit) return { verdict: normalize(explicit[1]!), summary: line.trim() }
  }
  const bare = BARE_VERDICT.exec(text)
  if (bare) {
    const summary = lines.find((l) => bare[0] && l.toLowerCase().includes(bare[1]!.toLowerCase())) ?? bare[0]!
    return { verdict: normalize(bare[1]!), summary: summary.trim() }
  }
  return undefined
}

function sameModel(a: CascadeModel, b: CascadeModel): boolean {
  return a.providerID === b.providerID && a.modelID === b.modelID
}

export interface CommitmentGateInput {
  report?: CommitmentReport
  reviewer: CascadeModel
  author: CascadeModel
  /** Explicit opt-in to let the author's own model do the boundary review. */
  allowSameModel?: boolean
}

export interface CommitmentGateResult {
  ok: boolean
  reason?: string
}

/**
 * The gate: a deliverable may not close without a verdict, and the review must
 * be independent (reviewer model differs from the author) unless explicitly
 * allowed.
 */
export function checkCommitmentGate(input: CommitmentGateInput): CommitmentGateResult {
  if (!input.report) {
    return {
      ok: false,
      reason: "no commitment verdict — a deliverable cannot close without ship / fix-first / rethink",
    }
  }
  if (!input.allowSameModel && sameModel(input.reviewer, input.author)) {
    return {
      ok: false,
      reason: `commitment reviewer ${input.reviewer.providerID}/${input.reviewer.modelID} matches the author; use a different model`,
    }
  }
  return { ok: true }
}

/** A deliverable closes only on `ship`; the other verdicts send it back. */
export function canCloseDeliverable(report: CommitmentReport | undefined): boolean {
  return report?.verdict === "ship"
}
