/**
 * Subagent resume diagnostics.
 *
 * Resuming a subagent is `task(..., task_id: <id>)`. The tool is deliberately
 * resume-or-create: an id that is gone starts a fresh subagent. That fallback is
 * kept, but it must not be *silent* — a caller who believed it continued a
 * conversation needs to know it started a new one. This module turns "can this
 * task_id be resumed?" into a deterministic, pure decision with a reason.
 *
 * Two outcomes:
 *   - an unknown/expired id          → a `warning` (create a fresh subagent);
 *   - an id from a *different* parent → a hard `error` (never graft an unrelated
 *     conversation); resuming across sessions is always wrong.
 *
 * Pure: no engine, no I/O.
 */

export interface ResumeDiagnostic {
  /** The call may proceed (to resume, or to start fresh). */
  ok: boolean
  /** Hard failure (only with `ok: false`). */
  error?: string
  /** Soft notice (with `ok: true`): the id could not be resumed, starting fresh. */
  warning?: string
}

/**
 * Decide whether a passed `task_id` is resumable.
 *
 * - no `task_id`                                 → ok (a fresh subagent is intended);
 * - `task_id` and not found                      → ok + warning (expired/unknown id;
 *   start fresh so the notice is visible, never silent);
 * - `task_id`, found, but from another session   → fail (resuming across sessions
 *   would graft an unrelated conversation);
 * - otherwise                                    → ok.
 */
export function resumeDiagnostic(input: {
  taskID?: string
  /** The session with this id exists. */
  found: boolean
  /** It belongs to the current parent session (only meaningful when found). */
  parentMatches?: boolean
}): ResumeDiagnostic {
  if (!input.taskID) return { ok: true }
  if (!input.found) {
    return {
      ok: true,
      warning: `task_id ${input.taskID} was not found — it expired or the id is wrong; started a fresh subagent instead.`,
    }
  }
  if (input.parentMatches === false) {
    return {
      ok: false,
      error: `Cannot resume session ${input.taskID}: not a child of the current session.`,
    }
  }
  return { ok: true }
}
