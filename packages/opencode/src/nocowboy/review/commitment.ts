/**
 * Commitment-Boundary Review.
 *
 * A fresh model — NOT the one that wrote the code — reads the deliverable diff
 * from scratch and returns exactly one verdict: `ship`, `fix-first`, or
 * `rethink`. It is requested ONCE at the end of a deliverable; the point is a
 * commitment decision, not another review pass. Inspired by Fable Advisor.
 *
 * The module is pure (parsing + prompt + once-per-deliverable guard) so it is
 * unit-testable without a model; the `/commitment-review` command drives it via
 * the cross-model `reviewer` subagent.
 */

export const COMMITMENT_VERDICTS = ["ship", "fix-first", "rethink"] as const
export type CommitmentVerdict = (typeof COMMITMENT_VERDICTS)[number]

export interface CommitmentReview {
  verdict: CommitmentVerdict
  /** One line explaining the call. */
  rationale: string
  /** Concrete must-fix items (only meaningful for fix-first/rethink). */
  blocking: string[]
}

/** Normalize a raw token to a canonical verdict, or undefined. */
function canonical(token: string): CommitmentVerdict | undefined {
  const key = token.trim().toLowerCase().replace(/[\s_]+/g, "-")
  return COMMITMENT_VERDICTS.find((v) => v === key)
}

/** `fix` must be separated from `first` by whitespace/`_`/`-` (not `fixfirst`). */
const VERDICT_WORD = /\b(ship|fix[\s_-]+first|rethink)\b/i

/**
 * Parse the model's verdict from text. Fenced code blocks are stripped first so
 * an echoed example (` ```Verdict: ship``` ` before the real answer) cannot win;
 * if the stripped text has no verdict, the raw text is used (an answer fully
 * wrapped in a fence still parses). An explicit `Verdict: …` label wins over a
 * stray standalone word.
 */
export function parseCommitmentVerdict(text: string): CommitmentVerdict | undefined {
  const stripped = text.replace(/```[\s\S]*?```/g, "")
  for (const candidate of [stripped, text]) {
    const labelled = candidate.match(/verdict\s*[:\-：]\s*(ship|fix[\s_-]+first|rethink)/i)
    const found = labelled?.[1] ?? candidate.match(VERDICT_WORD)?.[1]
    if (found) return canonical(found)
  }
  return undefined
}

/** Build the commitment-review prompt for a fresh, independent model. */
export function buildCommitmentPrompt(input: { diff: string; task?: string }): string {
  return [
    "You are the commitment boundary reviewer. A different model wrote this change;",
    "you have not seen the work before. Read the diff below with fresh eyes.",
    "",
    ...(input.task ? [`Deliverable: ${input.task}`, ""] : []),
    "Return EXACTLY ONE verdict on its own line:",
    "  Verdict: ship      — correct, tested, safe to deliver as-is",
    "  Verdict: fix-first — ship after the listed blocking fixes",
    "  Verdict: rethink   — the approach is wrong; do not build on it",
    "",
    "Then a one-line rationale and, for fix-first/rethink, a bullet list of concrete blockers.",
    "",
    "Diff:",
    "```diff",
    input.diff,
    "```",
  ].join("\n")
}

/**
 * Once-per-deliverable guard: a commitment review runs at most one time for a
 * given deliverable id. Re-runs on the same id are refused; a new deliverable
 * gets its own review.
 */
export class CommitmentBoundary {
  private readonly reviewed = new Set<string>()

  /** Mark the deliverable reviewed; returns true the first time, false after. */
  shouldRun(deliverableId: string): boolean {
    if (this.reviewed.has(deliverableId)) return false
    this.reviewed.add(deliverableId)
    return true
  }

  hasReviewed(deliverableId: string): boolean {
    return this.reviewed.has(deliverableId)
  }
}

/**
 * Process-wide boundary: `complete_task` consults it so the commitment review
 * is requested exactly once per completed deliverable (task slug).
 */
export const commitmentBoundary = new CommitmentBoundary()

export const COMMITMENT_INVITATION = [
  "",
  "Commitment-Boundary Review (requested once per deliverable): run `/commitment-review` —",
  "a fresh model reads the diff with no prior context and returns ship / fix-first / rethink.",
].join("\n")

/**
 * The invitation to run the review — returned the FIRST time a deliverable is
 * completed, and "" on every later call for the same id. This is what
 * `complete_task` appends, so the wiring is unit-testable without the engine.
 */
export function commitmentInvitation(deliverableId: string): string {
  return commitmentBoundary.shouldRun(deliverableId) ? COMMITMENT_INVITATION : ""
}
