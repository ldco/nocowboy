import { Effect, Schema } from "effect"
import * as Tool from "@/tool/tool"
import { GoalService } from "@/nocowboy/session/goal"

export const Parameters = Schema.Struct({
  condition: Schema.String.annotate({
    description:
      "The measurable condition the agent must achieve. Write it so it can be verified by running a command (tests, lint, build) or checking the transcript.",
  }),
  max_turns: Schema.optional(
    Schema.Number.annotate({
      description:
        "Maximum number of autonomous turns before the goal loop stops (default 20). Guards against infinite loops.",
    }),
  ),
})

type Params = Schema.Schema.Type<typeof Parameters>

const GOAL_SET_DESCRIPTION = `Set an autonomous goal for this session. Once set, the agent keeps working across turns until the condition is met (verified by a judge model after each turn), the goal is impossible, or the turn budget is exhausted.

Use this when the user wants you to keep working autonomously toward a verifiable end state (e.g. "all tests pass", "lint is clean", "migrate every call site to the new API").

To stop early, use goal_clear.`

export const GoalSetTool = Tool.define(
  "goal_set",
  Effect.gen(function* () {
    return {
      description: GOAL_SET_DESCRIPTION,
      parameters: Parameters,
      execute: (params: Params, ctx: Tool.Context) =>
        Effect.gen(function* () {
          GoalService.set(ctx.sessionID, params.condition, params.max_turns)
          const goal = GoalService.get(ctx.sessionID)
          return {
            title: "Goal set",
            output: `Goal active: "${params.condition}" (max ${goal?.maxTurns ?? 20} turns). The agent will continue working until the condition is met or the budget is exhausted. Use goal_clear to cancel.`,
            metadata: { condition: params.condition, maxTurns: goal?.maxTurns },
          }
        }).pipe(Effect.orDie),
    }
  }),
)

export const GoalClearParameters = Schema.Struct({})

export const GoalClearTool = Tool.define(
  "goal_clear",
  Effect.gen(function* () {
    return {
      description:
        "Cancel the active autonomous goal for this session. The agent stops auto-continuing and returns to normal interactive turns.",
      parameters: GoalClearParameters,
      execute: (_params: Record<string, never>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          GoalService.clear(ctx.sessionID)
          return {
            title: "Goal cleared",
            output: "Autonomous goal cancelled. Returning to normal interactive mode.",
            metadata: {},
          }
        }).pipe(Effect.orDie),
    }
  }),
)
