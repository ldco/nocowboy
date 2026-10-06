/**
 * Built-in AC Verification Stop Hook.
 *
 * Integrates the task gate into the turn-level stop hook: when a session that
 * is running under an active goal finishes a turn while it still owns
 * open/in_progress tasks (acceptance criteria not yet met), the hook requests
 * another turn instead of letting the loop end. `StopHooks.decide` enforces the
 * continuation budget in the session loop.
 *
 * Reachability: the previous guard (`agent === "goal"`) was dead code — no agent
 * is registered under that name. The real autonomous role is "a session with an
 * active goal" (the autopilot / `/goal` run), regardless of which work agent it
 * runs as. Internal agents (compaction/title/summary) run turns inside the same
 * session and must not be continued by this gate.
 */
import { TaskRegistry } from "./registry"
import { GoalService } from "@/nocowboy/session/goal"

/** Turns that run inside a goal session but are not the work agent. */
const INTERNAL_AGENTS = new Set(["compaction", "title", "summary"])

export const AC_VERIFY_MAX_REACT = 3

export namespace ACVerificationHook {
  export type Output = { continue: boolean; reason?: string }

  /**
   * Decide whether the turn should continue based on incomplete tasks.
   *
   * Active only when a goal is set (an autonomous run) and the turn belongs to
   * a real work agent. Interactive sessions without a goal keep the standard
   * behavior; internal turns (compaction/title/summary) are never continued.
   */
  export function evaluate(input: { sessionID: string; agent: string }): Output {
    if (INTERNAL_AGENTS.has(input.agent)) return { continue: false }
    if (!GoalService.get(input.sessionID)) return { continue: false }

    const incomplete = TaskRegistry.list({
      session_id: input.sessionID,
      include_terminal: false,
    }).filter((t) => t.status === "open" || t.status === "in_progress")

    if (incomplete.length === 0) return { continue: false }

    return {
      continue: true,
      reason:
        "acceptance not met — unfinished tasks remain: " +
        incomplete.map((t) => `${t.id} (${t.status}) ${t.summary}`).join("; "),
    }
  }
}
