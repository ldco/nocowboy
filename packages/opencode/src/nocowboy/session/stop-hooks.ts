/**
 * Turn-level stop hooks — real continuation, not just a logged counter.
 *
 * Plugins may register a `session.stop` hook that returns `{ continue: true }`
 * to block a turn from ending (Claude Code Stop-hook parity). The built-in AC
 * verification check uses the same channel. This module owns the two pieces the
 * session loop needs to honour that request:
 *
 *  - `decide` is the pure, unit-testable gate: it enforces the ≤8 consecutive
 *    continuation cap and resets the streak the moment a turn is allowed to end.
 *  - `buildContinuation` builds the synthetic user message that actually
 *    restarts the loop. Before this existed the counter was incremented and
 *    logged but never used, so the hook could not keep a turn alive.
 */
import type { SessionID } from "@/session/schema"
import type { MessageV2 } from "@/session/message-v2"
import { Autopilot } from "./autopilot"

/**
 * Maximum consecutive turn continuations before a stop hook is overruled and
 * the turn is allowed to end. Mirrors Claude Code's Stop hook cap.
 */
export const STOP_HOOK_MAX = 8

export namespace StopHooks {
  export interface Decision {
    /** Whether the loop must re-enter with a synthetic continuation. */
    continue: boolean
    /** The continuation streak to carry into the next turn. */
    count: number
    /** Why the turn was continued (the hook's reason). */
    reason?: string
  }

  /**
   * Pure gate for the stop-hook continuation cap.
   *
   * - No hook (and no AC check) requested a continuation → the turn ends and
   *   the streak resets to 0.
   * - A continuation is requested and the streak is below the cap → continue
   *   and carry the incremented streak.
   * - A continuation is requested but the streak has reached the cap → let the
   *   turn end and reset the streak, so a later human turn starts fresh instead
   *   of inheriting an exhausted budget.
   *
   * The AC check wins when both channels fire: its reason is what the built-in
   * gate is about, and it is the deterministic one.
   */
  export function decide(input: {
    stop: { continue: boolean; reason?: string }
    ac: { continue: boolean; reason?: string }
    continues: number
    max?: number
  }): Decision {
    const max = input.max ?? STOP_HOOK_MAX
    if (!input.stop.continue && !input.ac.continue) return { continue: false, count: 0 }
    if (input.continues >= max) return { continue: false, count: 0 }
    return {
      continue: true,
      count: input.continues + 1,
      reason: input.ac.continue ? input.ac.reason : input.stop.reason,
    }
  }

  /** The instruction appended as a synthetic user message to keep the turn alive. */
  export function continuationText(input: { reason?: string; turn: number; max: number }): string {
    return [
      `<stop-hook-continue turn="${input.turn}/${input.max}">`,
      "A stop hook blocked this turn from ending.",
      ...(input.reason ? [`Reason: ${input.reason}`] : []),
      "Address the hook's findings and continue with your tasks now.",
      "- Do not ask the user to continue and do not stop to confirm.",
      "- Verify changes with real commands (tests, lint, build) when relevant.",
      "</stop-hook-continue>",
    ].join("\n")
  }

  /**
   * Build the synthetic user message that restarts the loop after a stop hook
   * blocked the turn. Shares the autopilot's re-entry message builder so the
   * agent/model/tools of the next turn resolve exactly like a goal continuation.
   */
  export function buildContinuation(input: {
    sessionID: SessionID
    reason?: string
    turn: number
    max?: number
    previous: Pick<MessageV2.User, "agent" | "model" | "tools">
    now?: number
  }): { info: MessageV2.User; part: MessageV2.TextPart } {
    return Autopilot.buildMessage({
      sessionID: input.sessionID,
      previous: input.previous,
      now: input.now,
      text: continuationText({ reason: input.reason, turn: input.turn, max: input.max ?? STOP_HOOK_MAX }),
    })
  }
}
