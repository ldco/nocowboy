import { Effect, Schema } from "effect"
import * as Tool from "@/tool/tool"
import { TeamLead } from "@/nocowboy/agent-teams"

export const Parameters = Schema.Struct({
  goal: Schema.String.annotate({
    description: "The goal the team must achieve, e.g. 'fix all failing tests'",
  }),
  tasks: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      title: Schema.String,
      description: Schema.String,
      dependsOn: Schema.optional(Schema.Array(Schema.String)),
    }),
  ),
  team_id: Schema.optional(
    Schema.String.annotate({
      description:
        "Reuse an existing team (omit to create a fresh one). Defaults to a generated id from the session.",
    }),
  ),
})

type Params = Schema.Schema.Type<typeof Parameters>

const TEAM_SPAWN_DESCRIPTION = `Create an agent team: register the shared task list and member inboxes so multiple subagents can coordinate work in parallel. Returns the team_id and task list for delegation.

Call this BEFORE spawning teammate background tasks with the task tool. Each teammate should then claim tasks from the shared list and work autonomously.

Use when the goal has independent pieces that can be worked in parallel (research + review, frontend + backend, etc.). For sequential single-agent work, just use task.`

export const TeamSpawnTool = Tool.define(
  "team_spawn",
  Effect.gen(function* () {
    return {
      description: TEAM_SPAWN_DESCRIPTION,
      parameters: Parameters,
      execute: (params: Params, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const teamID = params.team_id ?? `team-${ctx.sessionID.slice(0, 8)}`
          const tasks = yield* Effect.tryPromise(() =>
            (async () => {
              await TeamLead.createTeam({
                id: teamID,
                name: params.goal,
                members: [{ id: "lead", role: "lead" }],
              })
              return TeamLead.breakDown({
                teamID,
                goal: params.goal,
                tasks: params.tasks.map((task) => ({
                  id: task.id,
                  title: task.title,
                  description: task.description,
                  dependsOn: task.dependsOn ? [...task.dependsOn] : [],
                })),
              })
            })(),
          )
          return {
            title: "Team created",
            output: `Team "${teamID}" created for goal: ${params.goal}\n\nTasks (${tasks.length}):\n${tasks
              .map((t) => `- ${t.id}: ${t.title}${t.dependsOn.length ? ` (after ${t.dependsOn.join(", ")})` : ""}`)
              .join("\n")}`,
            metadata: { team_id: teamID, taskCount: tasks.length },
          }
        }).pipe(Effect.orDie),
    }
  }),
)
