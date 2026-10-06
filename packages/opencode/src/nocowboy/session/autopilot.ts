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

  /**
   * A roadmap read reduced to what the autopilot needs to decide whether the
   * run is finished and whether it is making progress.
   */
  export interface RoadmapSummary {
    /** Whether the file actually carries a `features` array (a real roadmap). */
    hasFeatures: boolean
    /** Features currently `in_progress`. */
    inProgress: string[]
    /** Features not yet `done`, in any status. */
    remaining: string[]
    /** Features with a non-terminal status (not done/blocked/abandoned) — the work left. */
    actionable: string[]
    /** How many features are `done` — shown in the live run indicator. */
    done: number
    /** Total feature count — shown in the live run indicator. */
    total: number
  }

  const EMPTY_ROADMAP: RoadmapSummary = { hasFeatures: false, inProgress: [], remaining: [], actionable: [], done: 0, total: 0 }

  /**
   * Statuses that end an item's life for a run: `done` is finished, `blocked`
   * needs a human, and `abandoned` was decided against. None of them is work the
   * run should keep trying — if `abandoned` counted as actionable, a roadmap
   * with a single abandoned item could never be complete and an unbounded run
   * would never stop (the project's own `docs/roadmap.json` has one).
   */
  const TERMINAL_STATUSES = new Set(["done", "blocked", "abandoned"])

  /**
   * Reduce a parsed roadmap to its summary. A roadmap is "complete" for an
   * autopilot run once there are features and none are actionable — every item
   * is either done, blocked, or abandoned, so there is nothing left to run.
   */
  export function roadmapSummaryFrom(json: unknown): RoadmapSummary {
    const features = (json as { features?: unknown } | undefined)?.features
    if (!Array.isArray(features)) return EMPTY_ROADMAP
    const rows = features.filter((f): f is { id: string; status?: unknown } => {
      if (!f || typeof f !== "object") return false
      const item = f as { id?: unknown }
      return typeof item.id === "string"
    })
    if (rows.length === 0) return EMPTY_ROADMAP
    const byStatus = (status: string) => rows.filter((f) => f.status === status).map((f) => f.id)
    const remaining = rows.filter((f) => f.status !== "done").map((f) => f.id)
    const actionable = rows.filter((f) => !TERMINAL_STATUSES.has(String(f.status))).map((f) => f.id)
    const done = rows.filter((f) => f.status === "done").length
    return { hasFeatures: true, inProgress: byStatus("in_progress"), remaining, actionable, done, total: rows.length }
  }

  /**
   * The roadmap item the run is on right now: the first `in_progress` item, or
   * the first actionable one when nothing is in progress. Returns undefined for
   * a custom (non-roadmap) goal or an unreadable roadmap — the indicator then
   * shows the mode and turn without inventing a stage.
   */
  export function currentStage(summary: RoadmapSummary): string | undefined {
    if (!summary.hasFeatures) return undefined
    return summary.inProgress[0] ?? summary.actionable[0]
  }

  /**
   * The remaining work as a checklist for the sidebar: the actionable items
   * with `in_progress`/`pending` status, in roadmap order. This is what the
   * "Roadmap" sidebar section renders (reusing TodoItem), so the list a run is
   * walking through is visible while it runs.
   */
  export function actionItems(summary: RoadmapSummary): { id: string; status: string }[] {
    const inProgress = new Set(summary.inProgress)
    return summary.actionable.map((id) => ({ id, status: inProgress.has(id) ? "in_progress" : "pending" }))
  }

  /**
   * Display info for a goal's live indicator: the current roadmap stage, the
   * done/total progress, and the actionable checklist. Undefined when the goal
   * is not a roadmap run or the roadmap cannot be read, so callers omit the
   * fields instead of guessing.
   */
  export async function goalStage(
    root: string,
    goal: Goal,
  ): Promise<{ stage?: string; done: number; total: number; items: { id: string; status: string }[] } | undefined> {
    if (!goal.roadmap) return undefined
    const summary = await readRoadmap(root)
    if (!summary.hasFeatures) return undefined
    const stage = currentStage(summary)
    return { stage, done: summary.done, total: summary.total, items: actionItems(summary) }
  }

  /** True when a readable roadmap has no actionable items left. */
  export function roadmapComplete(summary: RoadmapSummary): boolean {
    return summary.hasFeatures && summary.actionable.length === 0
  }

  /**
   * Whether the LLM judge is needed to decide the goal. A roadmap goal is
   * decided deterministically from the roadmap, so the transcript-only judge is
   * skipped while the roadmap is readable — that removes the false-positive
   * "met" stop that ended a run at the R01 → R02 boundary. A custom goal, or a
   * roadmap goal whose roadmap cannot be read, still needs the judge.
   */
  export function judgeRequired(roadmap: boolean, summary: RoadmapSummary): boolean {
    return !roadmap || !summary.hasFeatures
  }

  /**
   * Best-effort read of the project roadmap. Never throws: a missing or
   * unreadable file degrades to "no known roadmap" so a run without one still
   * works (same degradation as ADR-005).
   */
  export async function readRoadmap(root: string): Promise<RoadmapSummary> {
    try {
      const text = await Bun.file(path.join(root, "docs", "roadmap.json")).text()
      return roadmapSummaryFrom(JSON.parse(text))
    } catch {
      return EMPTY_ROADMAP
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
   * Build a synthetic user message from raw text. It copies the agent/model/
   * tools of the previous user message so the next turn resolves the same way,
   * and marks the text part `synthetic` so the UI can tell it apart from a real
   * instruction. Shared by the autopilot continuation and the stop-hook
   * continuation (same re-entry mechanism, different instruction text).
   */
  export function buildMessage(input: {
    sessionID: SessionID
    text: string
    previous: Pick<MessageV2.User, "agent" | "model" | "tools">
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
      text: input.text,
      synthetic: true,
      time: { start: now, end: now },
    }
    return { info, part }
  }

  /**
   * Build the synthetic user message that restarts the loop for a goal.
   */
  export function buildContinuation(input: {
    sessionID: SessionID
    goal: Goal
    previous: Pick<MessageV2.User, "agent" | "model" | "tools">
    /** Roadmap items currently `in_progress` (see readRoadmap). */
    inProgress?: string[]
    /** Add the strong stall nudge (see stallAction). */
    escalate?: boolean
    now?: number
  }): { info: MessageV2.User; part: MessageV2.TextPart } {
    return buildMessage({
      sessionID: input.sessionID,
      previous: input.previous,
      now: input.now,
      text: continuationText({
        condition: input.goal.condition,
        turn: input.goal.react,
        maxTurns: input.goal.maxTurns,
        inProgress: input.inProgress,
        escalate: input.escalate,
      }),
    })
  }
}
