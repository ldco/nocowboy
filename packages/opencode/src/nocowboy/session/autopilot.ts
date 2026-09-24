/**
 * Autopilot — the harness half of an unsupervised goal run.
 *
 * An agent cannot cross the turn boundary: when the model stops producing tool
 * calls the turn ends (SessionPrompt.runLoop breaks via the plan-followup path).
 * So a goal run that must "keep going" needs the *harness* to inject the next
 * step. This module is that injection:
 *
 *  - `shouldContinue` is the pure gate (unit-testable, no I/O).
 *  - `buildContinuation` builds the synthetic user message the loop persists to
 *    restart itself. The message is marked `synthetic: true` so it is never
 *    confused with something the human typed.
 */
import path from "path"
import { MessageID, PartID, type SessionID } from "@/session/schema"
import type { MessageV2 } from "@/session/message-v2"
import type { Goal } from "./goal"

/**
 * Default cap on automatic continuations within one turn, used when a goal does
 * not supply its own budget. A goal's `maxTurns` (the `/autopilot --max-turns`)
 * overrides it, so a long run is bounded by the goal budget rather than by this
 * constant.
 */
export const AUTO_CONTINUE_MAX = 8

/** Consecutive continuations on one unchanged stage before a stall warning. */
export const STALL_ESCALATE = 6
/** Consecutive continuations on one unchanged stage before the run stops. */
export const STALL_STOP = 12

export namespace Autopilot {
  /**
   * Whether the loop should inject a continuation for the active goal.
   *
   * The goal has already been judged at this point (met / impossible / budget
   * exhausted return "break" before we get here), so this only decides the
   * plain case: the model stopped on its own, autopilot is on, we are under the
   * per-turn cap, and nothing newer is already queued.
   */
  export function shouldContinue(input: {
    auto: boolean
    /** The model finished its turn (finish reason is not "tool-calls"/"unknown"). */
    stopped: boolean
    /** The processor returned "stop" (blocked or errored) — do not override that. */
    blocked: boolean
    continues: number
    max?: number
    followupPending: boolean
  }): boolean {
    const max = input.max ?? AUTO_CONTINUE_MAX
    if (!input.auto) return false
    if (!input.stopped) return false
    if (input.blocked) return false
    if (input.followupPending) return false
    return input.continues < max
  }

  /** Ids of roadmap features currently `in_progress` (empty when unknown). */
  export function inProgressFromRoadmap(json: unknown): string[] {
    const features = (json as { features?: unknown } | undefined)?.features
    if (!Array.isArray(features)) return []
    return features
      .filter((f): f is { id: string } => {
        if (!f || typeof f !== "object") return false
        const item = f as { id?: unknown; status?: unknown }
        return item.status === "in_progress" && typeof item.id === "string"
      })
      .map((f) => f.id)
  }

  /**
   * Best-effort read of the project roadmap. Never throws: a missing or
   * unreadable file degrades to "no known in-progress stage" so a run without a
   * roadmap still works (same degradation as ADR-005).
   */
  export async function readInProgress(root: string): Promise<string[]> {
    try {
      const text = await Bun.file(path.join(root, "docs", "roadmap.json")).text()
      return inProgressFromRoadmap(JSON.parse(text))
    } catch {
      return []
    }
  }

  /**
   * The deterministic stage instruction carried by every continuation. It
   * encodes the review gate at the harness level: while a roadmap item is
   * `in_progress`, the run must finish and get it reviewed before starting
   * another one.
   */
  /**
   * React to a stage that never changes across continuations. A run that keeps
   * working the same in-progress stage turn after turn is either legitimately
   * large or stuck; after STALL_ESCALATE the run is warned to make a decision,
   * and after STALL_STOP the harness stops injecting so it cannot burn tokens
   * forever on a wedged stage.
   */
  export function stallAction(input: {
    key: string
    previous?: { key: string; count: number }
  }): { action: "continue" | "escalate" | "stop"; count: number } {
    if (!input.key) return { action: "continue", count: 0 }
    const count = input.previous && input.previous.key === input.key ? input.previous.count + 1 : 1
    if (count >= STALL_STOP) return { action: "stop", count }
    if (count >= STALL_ESCALATE) return { action: "escalate", count }
    return { action: "continue", count }
  }

  /** The strong nudge injected once a stage looks stalled. */
  export function escalationText(): string {
    return [
      "STALL WARNING: this stage has not changed for several turns.",
      "Decide now — either finish it (implement, test, reviewer-confirmed, mark",
      "done), mark it blocked with the exact missing piece, or /goal clear.",
      "Do not keep repeating the same step.",
    ].join("\n")
  }

  export function stageInstruction(inProgress: string[]): string {
    if (inProgress.length > 0) {
      return [
        `A stage is still in progress in docs/roadmap.json: ${inProgress.join(", ")}.`,
        "Finish it — implement, test, get it reviewer-confirmed, then mark it done.",
        "Do NOT start another roadmap item until this stage is confirmed and done.",
      ].join("\n")
    }
    return [
      "No roadmap item is in progress. Start the next planned item as a full stage:",
      "implement (worker) → update docs/roadmap.json → reviewer gate → done.",
    ].join("\n")
  }

  /** The instruction appended as a synthetic user message to keep the run going. */
  export function continuationText(input: {
    condition: string
    turn: number
    maxTurns: number
    inProgress?: string[]
    escalate?: boolean
  }): string {
    return [
      `<autopilot-continue turn="${input.turn}/${input.maxTurns}">`,
      `The session goal is not met yet: "${input.condition}".`,
      "Continue working autonomously toward it. Do the next concrete step now.",
      "- Do not ask the user to continue and do not stop to confirm.",
      "- Verify progress with real commands (tests, lint, build) when relevant.",
      stageInstruction(input.inProgress ?? []),
      ...(input.escalate ? [escalationText()] : []),
      "- If the goal is genuinely impossible or blocked, say exactly why and stop.",
      "</autopilot-continue>",
    ].join("\n")
  }

  /**
   * Build the synthetic user message that restarts the loop. It copies the
   * agent/model/tools of the previous user message so the next turn resolves
   * the same way, and marks the text part `synthetic` so the UI can tell it
   * apart from a real instruction.
   */
  export function buildContinuation(input: {
    sessionID: SessionID
    goal: Goal
    previous: Pick<MessageV2.User, "agent" | "model" | "tools">
    /** Roadmap items currently `in_progress` (see readInProgress). */
    inProgress?: string[]
    /** Add the strong stall nudge (see stallAction). */
    escalate?: boolean
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
      text: continuationText({
        condition: input.goal.condition,
        turn: input.goal.react,
        maxTurns: input.goal.maxTurns,
        inProgress: input.inProgress,
        escalate: input.escalate,
      }),
      synthetic: true,
      time: { start: now, end: now },
    }
    return { info, part }
  }
}
