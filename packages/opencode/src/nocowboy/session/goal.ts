import { generateObject, type ModelMessage, type LanguageModel } from "ai"
import { z } from "zod"

export type Goal = {
  condition: string
  react: number
}

export const Verdict = z.object({
  ok: z.boolean(),
  impossible: z.boolean().optional(),
  reason: z.string(),
})
export type Verdict = z.infer<typeof Verdict>

const JUDGE_SYSTEM = `You are evaluating a stop-condition hook. Read the conversation transcript carefully, then judge whether the user-provided condition is satisfied.

Your response must be a JSON object with one of these shapes:
- {"ok": true, "reason": "<quote evidence from the transcript that satisfies the condition>"}
- {"ok": false, "reason": "<quote what is missing or what blocks the condition>"}
- {"ok": false, "impossible": true, "reason": "<explain why the condition can never be satisfied>"}

Always include a "reason" field, quoting specific text from the transcript whenever possible.`

const judgeUser = (condition: string) =>
  `Based on the conversation transcript above, has the following stopping condition been satisfied? Answer based on transcript evidence only.\n\nCondition: ${condition}`

// Per-session goal state
const goals = new Map<string, Goal>()

export namespace GoalService {
  export function set(sessionID: string, condition: string): void {
    goals.set(sessionID, { condition, react: 0 })
  }

  export function get(sessionID: string): Goal | undefined {
    return goals.get(sessionID)
  }

  export function clear(sessionID: string): void {
    goals.delete(sessionID)
  }

  export function bumpReact(sessionID: string): number {
    const goal = goals.get(sessionID)
    if (!goal) return 0
    goal.react += 1
    return goal.react
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
