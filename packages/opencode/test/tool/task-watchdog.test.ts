import { afterEach, describe, expect } from "bun:test"
import { Cause, Deferred, Effect, Exit, Fiber, Layer, Option } from "effect"
import { Agent } from "../../src/agent/agent"
import { BackgroundJob } from "@/background/job"
import { Activity } from "@/nocowboy/session/activity"
import { Bus } from "@/bus"
import { Config } from "@/config/config"
import { CrossSpawnSpawner } from "@nocowboy/core/cross-spawn-spawner"
import { Session } from "@/session/session"
import { MessageV2 } from "../../src/session/message-v2"
import type { SessionPrompt } from "../../src/session/prompt"
import { MessageID, PartID, SessionID } from "../../src/session/schema"
import { SessionRunState } from "@/session/run-state"
import { SessionStatus } from "@/session/status"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Provider } from "../../src/provider/provider"
import { TaskTool, type TaskPromptOps } from "../../src/tool/task"
import { Truncate } from "@/tool/truncate"
import { ToolRegistry } from "@/tool/registry"
import { RuntimeFlags } from "@/effect/runtime-flags"
import { disposeAllInstances } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

afterEach(async () => {
  await disposeAllInstances()
})

const ref = {
  providerID: ProviderID.make("test"),
  modelID: ModelID.make("test-model"),
}

// Must exceed Activity's 1s touch throttle for the "still alive" case to be
// meaningful under the real clock used by `it.instance`.
const STALL_MS = 1_500

const layer = (flags: Partial<RuntimeFlags.Info> = {}) =>
  Layer.mergeAll(
    Activity.defaultLayer,
    Agent.defaultLayer,
    BackgroundJob.defaultLayer,
    Bus.defaultLayer,
    Config.defaultLayer,
    CrossSpawnSpawner.defaultLayer,
    Session.defaultLayer,
    SessionRunState.defaultLayer,
    SessionStatus.defaultLayer,
    Truncate.defaultLayer,
    Provider.defaultLayer,
    ToolRegistry.defaultLayer,
    RuntimeFlags.layer(flags),
  )

const it = testEffect(layer({ subagentStallTimeoutMs: STALL_MS }))
const disabled = testEffect(layer({ subagentStallTimeoutMs: 0 }))
const background = testEffect(layer({ experimentalBackgroundSubagents: true, subagentStallTimeoutMs: STALL_MS }))

const seed = Effect.fn("TaskWatchdogTest.seed")(function* (title = "Parent") {
  const session = yield* Session.Service
  const chat = yield* session.create({ title })
  const user = yield* session.updateMessage({
    id: MessageID.ascending(),
    role: "user",
    sessionID: chat.id,
    agent: "build",
    model: ref,
    time: { created: Date.now() },
  })
  const assistant: MessageV2.Assistant = {
    id: MessageID.ascending(),
    role: "assistant",
    parentID: user.id,
    sessionID: chat.id,
    mode: "build",
    agent: "build",
    cost: 0,
    path: { cwd: "/tmp", root: "/tmp" },
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    modelID: ref.modelID,
    providerID: ref.providerID,
    time: { created: Date.now() },
  }
  yield* session.updateMessage(assistant)
  return { chat, assistant }
})

function reply(input: SessionPrompt.PromptInput, text: string): MessageV2.WithParts {
  const id = MessageID.ascending()
  return {
    info: {
      id,
      role: "assistant",
      parentID: input.messageID ?? MessageID.ascending(),
      sessionID: input.sessionID,
      mode: input.agent ?? "general",
      agent: input.agent ?? "general",
      cost: 0,
      path: { cwd: "/tmp", root: "/tmp" },
      tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      modelID: input.model?.modelID ?? ref.modelID,
      providerID: input.model?.providerID ?? ref.providerID,
      time: { created: Date.now() },
      finish: "stop",
    },
    parts: [
      {
        id: PartID.ascending(),
        messageID: id,
        sessionID: input.sessionID,
        type: "text",
        text,
      },
    ],
  }
}

function ctx(input: { sessionID: SessionID; messageID: MessageID; promptOps: TaskPromptOps }) {
  return {
    sessionID: input.sessionID,
    messageID: input.messageID,
    agent: "build",
    abort: new AbortController().signal,
    extra: { promptOps: input.promptOps },
    messages: [],
    metadata: () => Effect.void,
    ask: () => Effect.void,
  }
}

describe("subagent hang watchdog", () => {
  it.instance(
    "foreground task fails fast and cancels the child when the subagent stalls",
    () =>
      Effect.gen(function* () {
        const { chat, assistant } = yield* seed()
        const tool = yield* TaskTool
        const def = yield* tool.init()
        const cancelled = yield* Deferred.make<SessionID>()

        const promptOps: TaskPromptOps = {
          cancel: (sessionID) => Deferred.succeed(cancelled, sessionID).pipe(Effect.asVoid),
          resolvePromptParts: (template) => Effect.succeed([{ type: "text" as const, text: template }]),
          prompt: () => Effect.never,
          loop: (input) => Effect.succeed(reply({ sessionID: input.sessionID, parts: [] }, "done")),
        }

        const exit = yield* def
          .execute(
            { description: "stuck task", prompt: "do the stuck thing", subagent_type: "general" },
            ctx({ sessionID: chat.id, messageID: assistant.id, promptOps }),
          )
          .pipe(Effect.exit)

        expect(Exit.isFailure(exit)).toBe(true)
        const reason = Exit.isFailure(exit) ? String(Cause.squash(exit.cause)) : ""
        expect(reason).toContain("stopped responding")

        const child = yield* Deferred.await(cancelled).pipe(Effect.timeoutOption("2 seconds"))
        expect(Option.isSome(child)).toBe(true)
      }),
    20000,
  )

  it.instance(
    "foreground task keeps a slow-but-active subagent alive",
    () =>
      Effect.gen(function* () {
        const { chat, assistant } = yield* seed()
        const tool = yield* TaskTool
        const def = yield* tool.init()
        const activity = yield* Activity.Service

        const promptOps: TaskPromptOps = {
          cancel: () => Effect.void,
          resolvePromptParts: (template) => Effect.succeed([{ type: "text" as const, text: template }]),
          prompt: (input) =>
            Effect.gen(function* () {
              // Total runtime > STALL_MS, but each gap stays below the threshold.
              yield* activity.touch(input.sessionID)
              yield* Effect.sleep("1100 millis")
              yield* activity.touch(input.sessionID)
              yield* Effect.sleep("1100 millis")
              yield* activity.touch(input.sessionID)
              return reply(input, "finished slowly")
            }),
          loop: (input) => Effect.succeed(reply({ sessionID: input.sessionID, parts: [] }, "done")),
        }

        const result = yield* def.execute(
          { description: "slow task", prompt: "be slow but alive", subagent_type: "general" },
          ctx({ sessionID: chat.id, messageID: assistant.id, promptOps }),
        )

        expect(result.output).toContain("finished slowly")
      }),
    20000,
  )

  disabled.instance(
    "a disabled stall watchdog never trips",
    () =>
      Effect.gen(function* () {
        const { chat, assistant } = yield* seed()
        const tool = yield* TaskTool
        const def = yield* tool.init()
        let cancelled = false

        const promptOps: TaskPromptOps = {
          cancel: () =>
            Effect.sync(() => {
              cancelled = true
            }),
          resolvePromptParts: (template) => Effect.succeed([{ type: "text" as const, text: template }]),
          prompt: () => Effect.never,
          loop: (input) => Effect.succeed(reply({ sessionID: input.sessionID, parts: [] }, "done")),
        }

        const fiber = yield* def
          .execute(
            { description: "never task", prompt: "never", subagent_type: "general" },
            ctx({ sessionID: chat.id, messageID: assistant.id, promptOps }),
          )
          .pipe(Effect.forkChild)

        // Longer than the enabled threshold; with the watchdog disabled it must stay pending.
        yield* Effect.sleep("1900 millis")
        const polled = yield* Fiber.await(fiber).pipe(Effect.timeoutOption("200 millis"))
        expect(Option.isNone(polled)).toBe(true)
        expect(cancelled).toBe(false)

        yield* Fiber.interrupt(fiber)
      }),
    20000,
  )

  background.instance(
    "background task is marked error when the subagent stalls",
    () =>
      Effect.gen(function* () {
        const { chat, assistant } = yield* seed()
        const jobs = yield* BackgroundJob.Service
        const tool = yield* TaskTool
        const def = yield* tool.init()

        const promptOps: TaskPromptOps = {
          cancel: () => Effect.void,
          resolvePromptParts: (template) => Effect.succeed([{ type: "text" as const, text: template }]),
          // The child subagent prompt never resolves (it "stalls"); the parent-side
          // error injection must resolve so the job can reach a terminal state.
          prompt: (input) =>
            input.sessionID === chat.id ? Effect.succeed(reply(input, "injected")) : Effect.never,
          loop: (input) => Effect.succeed(reply({ sessionID: input.sessionID, parts: [] }, "done")),
        }

        const result = yield* def.execute(
          { description: "bg stuck", prompt: "bg", subagent_type: "general", background: true },
          ctx({ sessionID: chat.id, messageID: assistant.id, promptOps }),
        )

        const jobId = String((result.metadata as Record<string, unknown>).jobId)
        const waited = yield* jobs.wait({ id: jobId, timeout: 5000 })
        expect(waited.timedOut).toBe(false)
        expect(waited.info?.status).toBe("error")
        expect(waited.info?.error ?? "").toContain("stopped responding")
      }),
    20000,
  )
})
