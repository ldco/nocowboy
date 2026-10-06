/**
 * Turn-level stop hooks — the harness half of a quality-gated turn.
 *
 * A plugin registers a `session.stop` hook and returns `{ continue: true }`
 * to refuse the end of the turn. The hook event alone cannot block anything:
 * once the model stops producing tool calls the loop would break, so the
 * *harness* must persist a synthetic continuation message and restart the loop.
 * This module is that half:
 *
 *  - `decide` is the pure gate (unit-testable, no I/O).
 *  - `continuationText` / `buildContinuation` build the synthetic user message
 *    that makes the next loop iteration resolve like a normal prompt.
 *
 * Blocks are capped at `STOP_HOOK_MAX_BLOCKS` consecutive continuations so a
 * misbehaving hook cannot spin the loop forever (Claude Code Stop-hook parity).
 */
import { MessageID, PartID, type SessionID } from "@/session/schema"
import type { MessageV2 } from "@/session/message-v2"

/** Consecutive turn blocks a stop hook can request before the loop gives up. */
export const STOP_HOOK_MAX_BLOCKS = 8

export namespace StopHooks {
  export interface Decision {
    /** Whether the harness must inject a continuation and run another turn. */
    block: boolean
    /** Why, carried into the continuation message. */
    reason?: string
  }

  /**
   * Decide whether a requested stop-hook block may be applied.
   *
   * A block is only meaningful at a real turn boundary: the assistant finished
   * (not a mid-turn tool-call step), the processor did not stop/compact, and
   * nothing newer is already queued. Anything else is dropped — overriding a
   * blocked, compacted, or superseded turn would be wrong — as is a block past
   * the consecutive cap.
   */
  export function decide(input: {
    /** A plugin hook or the AC verification asked to block the turn. */
    requested: boolean
    /** Human-readable reason from the requester. */
    reason?: string
    /** Consecutive blocks already applied for this turn. */
    continues: number
    /** The assistant finished its turn (not a mid-turn tool-call step). */
    finished: boolean
    /** The processor returned "stop"/"compact" — never override that. */
    blocked: boolean
    /** A newer prompt is already queued — let it take over instead. */
    followupPending: boolean
    max?: number
  }): Decision {
    const max = input.max ?? STOP_HOOK_MAX_BLOCKS
    if (!input.requested) return { block: false }
    if (!input.finished) return { block: false }
    if (input.blocked) return { block: false }
    if (input.followupPending) return { block: false }
    if (input.continues >= max) return { block: false }
    return { block: true, reason: input.reason }
  }

  /** The synthetic user message text that restarts the loop. */
  export function continuationText(reason?: string): string {
    return [
      "<stop-hook-continue>",
      "A turn-level stop hook blocked this turn from ending.",
      ...(reason ? [`Reason: ${reason}`] : []),
      "Continue working now. Resolve the reason above, then finish the turn.",
      "Do not ask the user to continue.",
      "</stop-hook-continue>",
    ].join("\n")
  }

  /**
   * Build the synthetic user message a stop-hook block persists. It copies the
   * agent/model/tools of the previous user message so the next turn resolves
   * the same way, and marks the text part `synthetic` so the UI never confuses
   * it with something the human typed.
   */
  export function buildContinuation(input: {
    sessionID: SessionID
    previous: Pick<MessageV2.User, "agent" | "model" | "tools">
    reason?: string
    now?: number
  }): { info: MessageV2.User; part: MessageV2.TextPart } {
    const now = input.now ?? Date.now()
    const info: MessageV2.User = {
      id: MessageID.ascending(),
      sessionID: input.sessionID,
      role: "user",
      time: { created: now },
      agent: input.previous.agent,
      model: input.previous.model,
      tools: input.previous.tools,
    }
    const part: MessageV2.TextPart = {
      id: PartID.ascending(),
      sessionID: input.sessionID,
      messageID: info.id,
      type: "text",
      text: continuationText(input.reason),
      synthetic: true,
      time: { start: now, end: now },
    }
    return { info, part }
  }
}
