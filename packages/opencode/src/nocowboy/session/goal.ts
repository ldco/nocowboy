import { generateObject, type ModelMessage, type LanguageModel } from "ai"
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"
import { Global } from "@nocowboy/core/global"
import * as Log from "@nocowboy/core/util/log"

const log = Log.create({ service: "session.goal" })

export type Goal = {
  condition: string
  react: number
  maxTurns: number
  createdAt: number
}

export const Verdict = z.object({
  ok: z.boolean(),
  impossible: z.boolean().optional(),
  reason: z.string(),
})
export type Verdict = z.infer<typeof Verdict>

export const DEFAULT_MAX_TURNS = 20

/**
 * True when the goal was created before this process started, i.e. it was
 * restored from disk after a restart. The loop then continues on the next turn,
 * and the user should be told why their session is still working.
 *
 * Auto-continuing without a user message is deliberately NOT done: it would
 * spend tokens on launch with nobody watching.
 */
export function isRestoredFromPreviousRun(goal: Goal, processStartedAt: number): boolean {
  return goal.createdAt < processStartedAt
}

/** One-line notice shown in a session whose goal survived a restart. */
export function restoredGoalNotice(goal: Goal): string {
  return `Goal restored after a restart: "${goal.condition}" — turn ${goal.react}/${goal.maxTurns}. The loop continues on your next message; clear it with /goal clear.`
}

const JUDGE_SYSTEM = `You are evaluating a stop-condition hook. Read the conversation transcript carefully, then judge whether the user-provided condition is satisfied.

Your response must be a JSON object with one of these shapes:
- {"ok": true, "reason": "<quote evidence from the transcript that satisfies the condition>"}
- {"ok": false, "reason": "<quote what is missing or what blocks the condition>"}
- {"ok": false, "impossible": true, "reason": "<explain why the condition can never be satisfied>"}

Always include a "reason" field, quoting specific text from the transcript whenever possible.`

const judgeUser = (condition: string) =>
  `Based on the conversation transcript above, has the following stopping condition been satisfied? Answer based on transcript evidence only.\n\nCondition: ${condition}`

// Per-session goal state, persisted so an autonomous run survives a restart.
//
// One file per session (never a shared one): several NoCowboy instances run at
// once, and a shared file would let one instance clobber another's goal.
// Override the directory in tests with NOCOWBOY_GOALS_DIR.
function goalsDir(): string {
  return process.env.NOCOWBOY_GOALS_DIR ?? path.join(Global.Path.data, "goals")
}

function goalFile(sessionID: string): string {
  return path.join(goalsDir(), `${sessionID.replace(/[^A-Za-z0-9._-]/g, "_")}.json`)
}

function read(sessionID: string): Goal | undefined {
  try {
    const parsed = JSON.parse(fs.readFileSync(goalFile(sessionID), "utf-8")) as Partial<Goal>
    if (typeof parsed.condition !== "string" || typeof parsed.maxTurns !== "number") return undefined
    return {
      condition: parsed.condition,
      react: typeof parsed.react === "number" ? parsed.react : 0,
      maxTurns: parsed.maxTurns,
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now(),
    }
  } catch {
    // No goal for this session, or an unreadable file — either way, no goal.
    return undefined
  }
}

function write(sessionID: string, goal: Goal): void {
  try {
    fs.mkdirSync(goalsDir(), { recursive: true })
    fs.writeFileSync(goalFile(sessionID), JSON.stringify(goal, null, 2), "utf-8")
  } catch (error) {
    // Durability is best-effort: a failed write must not break the turn, but it
    // must be visible — a silently lost goal would look like a bug later.
    log.warn("failed to persist goal", { sessionID, error })
  }
}

function remove(sessionID: string): void {
  try {
    fs.rmSync(goalFile(sessionID), { force: true })
  } catch (error) {
    log.warn("failed to remove goal", { sessionID, error })
  }
}

export namespace GoalService {
  export function set(sessionID: string, condition: string, maxTurns: number = DEFAULT_MAX_TURNS): void {
    write(sessionID, {
      condition,
      react: 0,
      maxTurns,
      createdAt: Date.now(),
    })
  }

  export function get(sessionID: string): Goal | undefined {
    return read(sessionID)
  }

  export function clear(sessionID: string): void {
    remove(sessionID)
  }

  /** Increment the turn counter and return the new value (1-based after first call). */
  export function bumpReact(sessionID: string): number {
    const goal = read(sessionID)
    if (!goal) return 0
    goal.react += 1
    write(sessionID, goal)
    return goal.react
  }

  /** True once the turn budget is exhausted — guards against infinite loops. */
  export function exhausted(sessionID: string): boolean {
    const goal = read(sessionID)
    if (!goal) return false
    return goal.react >= goal.maxTurns
  }

  /**
   * Run the judge model over the conversation against the active goal's
   * condition. Returns the verdict or null if evaluation fails.
   * Caller must provide the resolved AI SDK model instance.
   */
  export async function evaluate(input: {
    condition: string
    messages: ModelMessage[]
    model: LanguageModel
  }): Promise<Verdict | null> {
    try {
      const result = await generateObject({
        temperature: 0,
        messages: [
          { role: "system", content: JUDGE_SYSTEM } satisfies ModelMessage,
          ...input.messages,
          { role: "user", content: judgeUser(input.condition) } satisfies ModelMessage,
        ],
        model: input.model,
        schema: Verdict,
      })
      return Verdict.parse(result.object)
    } catch {
      return null
    }
  }
}
