/**
 * Built-in AC Verification Stop Hook.
 *
 * Integrates the task gate into the turn-level stop hook: when a goal agent
 * finishes a turn while it still owns open/in_progress tasks (acceptance
 * criteria not yet met), the hook requests another turn instead of letting
 * the loop end. Capped by the stop-hook continue budget in the session loop.
 */
import { TaskRegistry } from "./registry"
import { GoalService } from "@/nocowboy/session/goal"

export const AC_VERIFY_MAX_REACT = 3

export namespace ACVerificationHook {
  export type Output = { continue: boolean; reason?: string }

  /**
   * Decide whether the turn should continue based on incomplete tasks.
   * Only active when a goal is set (goal agent running) — normal interactive
   * sessions keep the standard behavior.
   */
  export function evaluate(input: { sessionID: string; agent: string }): Output {
    if (input.agent !== "goal") return { continue: false }
    if (!GoalService.get(input.sessionID)) return { continue: false }

    const incomplete = TaskRegistry.list({
      session_id: input.sessionID,
      include_terminal: false,
    }).filter((t) => t.status === "open" || t.status === "in_progress")

    if (incomplete.length === 0) return { continue: false }

    return {
      continue: true,
      reason: `incomplete tasks remain: ${incomplete.map((t) => t.id).join(", ")}`,
    }
  }
}
