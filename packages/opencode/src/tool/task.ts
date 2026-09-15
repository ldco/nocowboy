import * as Tool from "./tool"
import DESCRIPTION from "./task.txt"
import { ToolJsonSchema } from "./json-schema"
import { BackgroundJob } from "@/background/job"
import { Bus } from "@/bus"
import { Session } from "@/session/session"
import { SessionID, MessageID } from "../session/schema"
import { ModelID, ProviderID } from "../provider/schema"
import { MessageV2 } from "../session/message-v2"
import { Agent } from "../agent/agent"
import { deriveSubagentSessionPermission } from "../agent/subagent-permissions"
import type { SessionPrompt } from "../session/prompt"
import { SessionStatus } from "@/session/status"
import { Config } from "@/config/config"
import { Provider } from "@/provider/provider"
import { KiloTask } from "../nocowboy/tool/task"
import { KiloCostPropagation } from "../nocowboy/session/cost-propagation"
import { NoCowboySessionProcessor } from "../nocowboy/session/processor"
import { NoCowboySession } from "../nocowboy/session"
import { Activity } from "../nocowboy/session/activity" // nocowboy_change
import {
  maxRuntimeFailureText,
  stalledFailureText,
  subagentMaxRuntimeMs,
  subagentStallTimeoutMs,
} from "../nocowboy/session/watchdog" // nocowboy_change
import { errorMessage } from "@/util/error"
import { TuiEvent } from "@/cli/cmd/tui/event"
import { Cause, Duration, Effect, Exit, Option, Schema, Scope } from "effect"
import { EffectBridge } from "@/effect/bridge"
import { RuntimeFlags } from "@/effect/runtime-flags"
import * as Log from "@nocowboy/core/util/log" // nocowboy_change

const logWatchdog = Log.create({ service: "subagent.watchdog" }) // nocowboy_change

export interface TaskPromptOps {
  cancel(sessionID: SessionID): Effect.Effect<void>
  resolvePromptParts(template: string): Effect.Effect<SessionPrompt.PromptInput["parts"]>
  prompt(input: SessionPrompt.PromptInput): Effect.Effect<MessageV2.WithParts>
  loop(input: SessionPrompt.LoopInput): Effect.Effect<MessageV2.WithParts>
}

const id = "task"
const BACKGROUND_DESCRIPTION = [
  "",
  "",
  [
    "Background mode: background=true launches the subagent asynchronously.",
    "Use task_status(task_id=..., wait=false) to poll, or wait=true to block until done.",
  ].join(" "),
].join("\n")

const BaseParameters = Schema.Struct({
  description: Schema.String.annotate({ description: "A short (3-5 words) description of the task" }),
  prompt: Schema.String.annotate({ description: "The task for the agent to perform" }),
  subagent_type: Schema.String.annotate({ description: "The type of specialized agent to use for this task" }),
  task_id: Schema.optional(Schema.String).annotate({
    description:
      "This should only be set if you mean to resume a previous task (you can pass a prior task_id and the task will continue the same subagent session as before instead of creating a fresh one)",
  }),
  command: Schema.optional(Schema.String).annotate({ description: "The command that triggered this task" }),
})

export const Parameters = Schema.Struct({
  description: Schema.String.annotate({ description: "A short (3-5 words) description of the task" }),
  prompt: Schema.String.annotate({ description: "The task for the agent to perform" }),
  subagent_type: Schema.String.annotate({ description: "The type of specialized agent to use for this task" }),
  task_id: Schema.optional(Schema.String).annotate({
    description:
      "This should only be set if you mean to resume a previous task (you can pass a prior task_id and the task will continue the same subagent session as before instead of creating a fresh one)",
  }),
  command: Schema.optional(Schema.String).annotate({ description: "The command that triggered this task" }),
  background: Schema.optional(Schema.Boolean).annotate({
    description: "When true, launch the subagent in the background and return immediately",
  }),
})

function output(sessionID: SessionID, text: string) {
  return [
    `task_id: ${sessionID} (for resuming to continue this task if needed)`,
    "",
    "<task_result>",
    text,
    "</task_result>",
  ].join("\n")
}

function backgroundOutput(sessionID: SessionID) {
  return [
    `task_id: ${sessionID} (for polling this task with task_status)`,
    "state: running",
    "",
    "<task_result>",
    "Background task started. Continue your current work and call task_status when you need the result.",
    "</task_result>",
  ].join("\n")
}

function backgroundMessage(input: {
  sessionID: SessionID
  description: string
  state: "completed" | "error"
  text: string
}) {
  const tag = input.state === "completed" ? "task_result" : "task_error"
  const title =
    input.state === "completed"
      ? `Background task completed: ${input.description}`
      : `Background task failed: ${input.description}`
  return [title, `task_id: ${input.sessionID}`, `state: ${input.state}`, "", `<${tag}>`, input.text, `</${tag}>`].join(
    "\n",
  )
}

function errorText(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

// Provider APIs reject an unavailable model at request time (e.g. Moonshot's
// "Not found the model X or Permission denied"). Such failures happen on the
// first call, before any tool side effects, so retrying with a fallback model
// is safe.
function isModelUnavailableError(error: unknown) {
  const message = errorText(error).toLowerCase()
  return /not found the model|model not found|unknown model|unsupported model|model does not exist/.test(message)
}

export const TaskTool = Tool.define(
  id,
  Effect.gen(function* () {
    const agent = yield* Agent.Service
    const background = yield* BackgroundJob.Service
    const bus = yield* Bus.Service
    const config = yield* Config.Service
    const sessions = yield* Session.Service
    const provider = yield* Provider.Service
    const scope = yield* Scope.Scope
    const status = yield* SessionStatus.Service
    const flags = yield* RuntimeFlags.Service
    const activity = yield* Activity.Service // nocowboy_change

    const run = Effect.fn("TaskTool.execute")(function* (
      params: Schema.Schema.Type<typeof Parameters>,
      ctx: Tool.Context,
    ) {
      const cfg = yield* config.get()
      const runInBackground = params.background === true
      if (runInBackground && !flags.experimentalBackgroundSubagents) {
        return yield* Effect.fail(new Error("Background subagents require KILO_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true"))
      }

      if (!ctx.extra?.bypassAgentCheck) {
        yield* ctx.ask({
          permission: id,
          patterns: [params.subagent_type],
          always: ["*"],
          metadata: {
            description: params.description,
            subagent_type: params.subagent_type,
          },
        })
      }

      const next = yield* agent.get(params.subagent_type)
      if (!next) {
        return yield* Effect.fail(new Error(`Unknown agent type: ${params.subagent_type} is not a valid agent type`))
      }
      KiloTask.validate(next, params.subagent_type)

      const canTask = KiloTask.nestedTask()
      const canTodo = next.permission.some((rule) => rule.permission === "todowrite")

      const taskID = params.task_id
      const session = taskID
        ? yield* sessions.get(SessionID.make(taskID)).pipe(Effect.catchCause(() => Effect.succeed(undefined)))
        : undefined
      if (session && session.parentID !== ctx.sessionID) {
        return yield* Effect.fail(new Error(`Cannot resume session ${taskID}: not a child of the current session`))
      }
      const parent = yield* sessions.get(ctx.sessionID)
      const parentAgent = parent.agent
        ? yield* agent.get(parent.agent).pipe(Effect.catchCause(() => Effect.succeed(undefined)))
        : undefined
      const caller = yield* agent.get(ctx.agent)
      const rules = KiloTask.inherited({ caller, session: parent, mcp: cfg.mcp })
      if (session) {
        session.permission = KiloTask.merge(
          session.permission ?? [],
          deriveSubagentSessionPermission({
            parentSessionPermission: parent.permission ?? [],
            parentAgent,
            subagent: next,
          }),
          KiloTask.permissions(rules),
        )
        yield* sessions.setPermission({ sessionID: session.id, permission: session.permission })
      }
      const platform = NoCowboySession.resolvePlatform(ctx.sessionID)
      const nextSession =
        session ??
        (yield* sessions.create({
          parentID: ctx.sessionID,
          title: params.description + ` (@${next.name} subagent)`,
          platform,
          permission: KiloTask.merge(
            deriveSubagentSessionPermission({
              parentSessionPermission: parent.permission ?? [],
              parentAgent,
              subagent: next,
            }),
            cfg.experimental?.primary_tools?.map((item) => ({
              pattern: "*",
              action: "allow" as const,
              permission: item,
            })) ?? [],
            KiloTask.permissions(rules),
          ),
        }))
      NoCowboySession.register({ id: nextSession.id, parentID: ctx.sessionID, platform })

      const msg = yield* MessageV2.get({ sessionID: ctx.sessionID, messageID: ctx.messageID }).pipe(Effect.orDie)
      if (msg.info.role !== "assistant") return yield* Effect.fail(new Error("Not an assistant message"))

      const selected = yield* KiloTask.resolveModel({
        name: next.name,
        agent: next,
        config: cfg,
        parent: {
          modelID: msg.info.modelID,
          providerID: msg.info.providerID,
        },
        variant: msg.info.variant,
        provider,
      })
      const model = selected.model
      const variant = selected.variant
      const fallback = selected.fallback
      const metadata = {
        parentSessionId: ctx.sessionID,
        sessionId: nextSession.id,
        model,
        variant,
        ...(runInBackground ? { background: true } : {}),
      }

      yield* ctx.metadata({
        title: params.description,
        metadata,
      })

      const ops = ctx.extra?.promptOps as TaskPromptOps
      if (!ops) return yield* Effect.fail(new Error("TaskTool requires promptOps in ctx.extra"))
      const runCancel = yield* EffectBridge.make()

      const runTask = Effect.fn("TaskTool.runTask")(function* () {
        const attempt = (target: { providerID: ProviderID; modelID: ModelID }, targetVariant?: string) =>
          Effect.gen(function* () {
            const parts = yield* ops.resolvePromptParts(params.prompt)
            NoCowboySessionProcessor.markReviewTelemetry(parts, params.command)
            const result = yield* ops.prompt({
              messageID: MessageID.ascending(),
              sessionID: nextSession.id,
              model: {
                modelID: target.modelID,
                providerID: target.providerID,
              },
              variant: targetVariant,
              agent: next.name,
              tools: {
                question: false,
                ...(canTodo ? {} : { todowrite: false }),
                ...(canTask ? {} : { task: false }),
                ...Object.fromEntries((cfg.experimental?.primary_tools ?? []).map((item) => [item, false])),
              },
              parts,
            })
            if (result.info.role === "assistant" && result.info.error) {
              return yield* Effect.fail(new Error(errorMessage(result.info.error)))
            }
            // kilocode_change start - ignore synthetic/ignored/empty text parts (e.g. the memory
            // marker appended after the answer) when picking the task result. Without this the
            // parent agent receives an empty <task_result> and the subagent answer is lost.
            // Ported from KiloCode upstream bf7848cb48 (v7.5.6, #13493), fixes #13469.
            return (
              result.parts
                .filter((item): item is MessageV2.TextPart => item.type === "text")
                .findLast((item) => !item.synthetic && !item.ignored && item.text.length > 0)?.text ?? ""
            )
            // kilocode_change end
          })

        return yield* attempt(model, variant).pipe(
          Effect.catchCause((cause) => {
            if (!fallback || !isModelUnavailableError(Cause.squash(cause))) return Effect.failCause(cause)
            return attempt(fallback.model, fallback.variant)
          }),
        )
      })

      // nocowboy_change — subagent hang watchdog.
      // Race the child prompt against a per-session idle watchdog (and an
      // optional absolute wall-clock cap). A subagent that produces no progress
      // must never block the parent forever: on trip we cancel the child session
      // and fail with a clear, actionable error.
      const stallMs = subagentStallTimeoutMs({ flags, config: cfg })
      const maxMs = subagentMaxRuntimeMs({ flags, config: cfg })
      type WatchdogOutcome =
        | { kind: "done"; text: string }
        | { kind: "failed"; cause: Cause.Cause<unknown> }
        | { kind: "stalled" }
        | { kind: "max" }
      const guardedRun = Effect.fn("TaskTool.guardedRun")(function* () {
        yield* activity.touch(nextSession.id)
        const watchers: Array<Effect.Effect<WatchdogOutcome, unknown>> = [
          runTask().pipe(
            Effect.map((text): WatchdogOutcome => ({ kind: "done", text })),
            // Watchers must not fail: raceAllFirst returns the first SUCCESS.
            // Convert a failed run into an outcome we re-raise after the race.
            Effect.catchCause((cause): Effect.Effect<WatchdogOutcome> => Effect.succeed({ kind: "failed", cause })),
          ),
        ]
        if (stallMs > 0)
          watchers.push(
            activity.waitUntilIdle(nextSession.id, stallMs).pipe(Effect.map((): WatchdogOutcome => ({ kind: "stalled" }))),
          )
        if (maxMs > 0)
          watchers.push(
            Effect.sleep(Duration.millis(maxMs)).pipe(Effect.map((): WatchdogOutcome => ({ kind: "max" }))),
          )

        // raceAllFirst: the first watcher to SUCCEED wins and the losers are
        // interrupted. A failed run is wrapped as `kind: "failed"` above, so an
        // immediate runTask error surfaces right away instead of waiting for the
        // stall window.
        const outcome: WatchdogOutcome = yield* Effect.raceAllFirst(watchers)
        if (outcome.kind === "done") return outcome.text
        if (outcome.kind === "failed") return yield* Effect.failCause(outcome.cause)

        const idle = yield* activity.idleFor(nextSession.id)
        const idleMs = idle ? Duration.toMillis(idle) : stallMs
        yield* ops.cancel(nextSession.id).pipe(Effect.ignore)
        logWatchdog.warn("subagent watchdog tripped", {
          sessionID: nextSession.id,
          reason: outcome.kind,
          idleMs,
          stallMs,
          maxMs,
        })
        return yield* Effect.fail(
          new Error(
            outcome.kind === "max"
              ? maxRuntimeFailureText({
                  description: params.description,
                  subagent: params.subagent_type,
                  sessionID: nextSession.id,
                  maxRuntimeMs: maxMs,
                })
              : stalledFailureText({
                  description: params.description,
                  subagent: params.subagent_type,
                  sessionID: nextSession.id,
                  idleMs,
                  thresholdMs: stallMs,
                }),
          ),
        )
      })
      const runTaskGuarded = () =>
        guardedRun().pipe(Effect.ensuring(activity.remove(nextSession.id).pipe(Effect.ignore)))

      const resumeWhenIdle: (input: { userID: MessageID; state: "completed" | "error" }) => Effect.Effect<void> =
        Effect.fn("TaskTool.resumeWhenIdle")(function* (input: { userID: MessageID; state: "completed" | "error" }) {
          const latest = yield* sessions
            .findMessage(ctx.sessionID, (item) => item.info.role === "user")
            .pipe(Effect.orDie)
          if (Option.isNone(latest)) return
          if (latest.value.info.id !== input.userID) return
          if ((yield* status.get(ctx.sessionID)).type !== "idle") {
            yield* Effect.sleep("300 millis")
            return yield* resumeWhenIdle(input)
          }
          yield* bus.publish(TuiEvent.ToastShow, {
            title: input.state === "completed" ? "Background task complete" : "Background task failed",
            message:
              input.state === "completed"
                ? `Background task "${params.description}" finished. Resuming the main thread.`
                : `Background task "${params.description}" failed. Resuming the main thread.`,
            variant: input.state === "completed" ? "success" : "error",
            duration: 5000,
          })
          yield* ops
            .loop({ sessionID: ctx.sessionID })
            .pipe(Effect.ignore, Effect.forkIn(scope, { startImmediately: true }))
        })

      const continueIfIdle = Effect.fn("TaskTool.continueIfIdle")(function* (input: {
        userID: MessageID
        state: "completed" | "error"
      }) {
        yield* resumeWhenIdle(input).pipe(Effect.ignore, Effect.forkIn(scope, { startImmediately: true }))
      })

      const inject = Effect.fn("TaskTool.injectBackgroundResult")(function* (
        state: "completed" | "error",
        text: string,
      ) {
        const currentParent = yield* sessions.get(ctx.sessionID)
        const message = yield* ops.prompt({
          sessionID: ctx.sessionID,
          noReply: true,
          agent: currentParent.agent ?? ctx.agent,
          parts: [
            {
              type: "text",
              synthetic: true,
              text: backgroundMessage({
                sessionID: nextSession.id,
                description: params.description,
                state,
                text,
              }),
            },
          ],
        })
        yield* continueIfIdle({ userID: message.info.id, state })
      })

      const existing = yield* background.get(nextSession.id)
      if (existing?.status === "running") {
        return yield* Effect.fail(
          new Error(`Task ${nextSession.id} is already running. Use task_status to check progress.`),
        )
      }

      if (runInBackground) {
        const info = yield* background.start({
          id: nextSession.id,
          type: id,
          title: params.description,
          metadata,
          run: Effect.acquireUseRelease(
            KiloCostPropagation.childCost(sessions, nextSession.id),
            () =>
              runTaskGuarded().pipe(
                Effect.tap((text) => inject("completed", text).pipe(Effect.ignore)),
                Effect.catchCause((cause) =>
                  (Cause.hasInterruptsOnly(cause)
                    ? Effect.void
                    : inject("error", errorText(Cause.squash(cause))).pipe(Effect.ignore)
                  ).pipe(Effect.andThen(Effect.failCause(cause))),
                ),
              ),
            (costBefore) =>
              Effect.gen(function* () {
                const costAfter = yield* KiloCostPropagation.childCost(sessions, nextSession.id)
                yield* KiloCostPropagation.propagate(sessions, ctx.sessionID, ctx.messageID, costAfter - costBefore)
              }),
          ),
        })

        return {
          title: params.description,
          metadata: {
            ...metadata,
            jobId: info.id,
          },
          output: backgroundOutput(nextSession.id),
        }
      }

      const cancel = ops.cancel(nextSession.id)

      function onAbort() {
        runCancel.fork(cancel)
      }

      return yield* Effect.acquireUseRelease(
        Effect.gen(function* () {
          ctx.abort.addEventListener("abort", onAbort)
          return yield* KiloCostPropagation.childCost(sessions, nextSession.id)
        }),
        () =>
          Effect.gen(function* () {
            const text = yield* runTaskGuarded()
            return {
              title: params.description,
              metadata,
              output: output(nextSession.id, text),
            }
          }),
        (costBefore, exit) =>
          Effect.gen(function* () {
            if (Exit.hasInterrupts(exit)) yield* cancel
          }).pipe(
            Effect.ensuring(
              Effect.gen(function* () {
                ctx.abort.removeEventListener("abort", onAbort)
                const costAfter = yield* KiloCostPropagation.childCost(sessions, nextSession.id).pipe(
                  Effect.catchTag("NotFoundError", () => Effect.succeed(costBefore)),
                )
                yield* KiloCostPropagation.propagate(
                  sessions,
                  ctx.sessionID,
                  ctx.messageID,
                  costAfter - costBefore,
                ).pipe(Effect.catchTag("NotFoundError", () => Effect.void))
              }),
            ),
          ),
      )
    })

    return {
      description: flags.experimentalBackgroundSubagents ? DESCRIPTION + BACKGROUND_DESCRIPTION : DESCRIPTION,
      parameters: Parameters,
      jsonSchema: flags.experimentalBackgroundSubagents ? undefined : ToolJsonSchema.fromSchema(BaseParameters),
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
        run(params, ctx).pipe(Effect.orDie),
    }
  }),
)
