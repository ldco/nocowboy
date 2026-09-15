import { afterEach, describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Activity } from "@/nocowboy/session/activity"
import { Agent } from "@/agent/agent"
import { BackgroundJob } from "@/background/job"
import { Bus } from "@/bus"
import { Config } from "@/config/config"
import { CrossSpawnSpawner } from "@nocowboy/core/cross-spawn-spawner"
import { Session } from "@/session/session"
import { MessageID, PartID, SessionID } from "@/session/schema"
import { ModelID, ProviderID } from "@/provider/schema" // kilocode_change
import { SessionStatus } from "@/session/status"
import { TaskStatusTool } from "@/tool/task_status"
import { Truncate } from "@/tool/truncate"
import { RuntimeFlags } from "@/effect/runtime-flags"
import { disposeAllInstances } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

afterEach(async () => {
  await disposeAllInstances()
})

const layer = (flags: Partial<RuntimeFlags.Info> = {}) =>
  Layer.mergeAll(
    Activity.defaultLayer,
    Agent.defaultLayer,
    BackgroundJob.defaultLayer,
    Bus.defaultLayer,
    Config.defaultLayer,
    CrossSpawnSpawner.defaultLayer,
    Session.defaultLayer,
    SessionStatus.defaultLayer,
    Truncate.defaultLayer,
    RuntimeFlags.layer(flags),
  )

const it = testEffect(layer({ experimentalBackgroundSubagents: true }))

describe("tool.task_status", () => {
  it.instance("returns completed background job output", () =>
    Effect.gen(function* () {
      const jobs = yield* BackgroundJob.Service
      const sessions = yield* Session.Service
      const tool = yield* TaskStatusTool
      const def = yield* tool.init()
      const chat = yield* sessions.create({})
      const task = yield* sessions.create({ parentID: chat.id })

      yield* jobs.start({ id: task.id, type: "task", run: Effect.succeed("all done") })

      const result = yield* def.execute(
        { task_id: task.id, wait: true, timeout_ms: 1_000 },
        {
          sessionID: chat.id,
          messageID: MessageID.ascending(),
          agent: "build",
          abort: new AbortController().signal,
          messages: [],
          metadata: () => Effect.void,
          ask: () => Effect.void,
        },
      )

      expect(result.output).toContain("state: completed")
      expect(result.output).toContain("all done")
      expect(result.metadata.timed_out).toBe(false)
    }),
  )

  it.instance("wait=true times out while the background job is running", () =>
    Effect.gen(function* () {
      const jobs = yield* BackgroundJob.Service
      const sessions = yield* Session.Service
      const tool = yield* TaskStatusTool
      const def = yield* tool.init()
      const chat = yield* sessions.create({})
      const task = yield* sessions.create({ parentID: chat.id })

      yield* jobs.start({ id: task.id, type: "task", run: Effect.never })

      const result = yield* def.execute(
        { task_id: task.id, wait: true, timeout_ms: 50 },
        {
          sessionID: chat.id,
          messageID: MessageID.ascending(),
          agent: "build",
          abort: new AbortController().signal,
          messages: [],
          metadata: () => Effect.void,
          ask: () => Effect.void,
        },
      )

      expect(result.output).toContain("state: running")
      expect(result.output).toContain("Timed out after 50ms")
      expect(result.metadata.timed_out).toBe(true)
    }),
  )

  // kilocode_change start - task status cannot inspect another session's child
  it.instance("rejects cross-session task inspection", () =>
    Effect.gen(function* () {
      const sessions = yield* Session.Service
      const tool = yield* TaskStatusTool
      const def = yield* tool.init()
      const owner = yield* sessions.create({})
      const other = yield* sessions.create({})
      const task = yield* sessions.create({ parentID: owner.id })

      const exit = yield* def
        .execute(
          { task_id: task.id },
          {
            sessionID: other.id,
            messageID: MessageID.ascending(),
            agent: "build",
            abort: new AbortController().signal,
            messages: [],
            metadata: () => Effect.void,
            ask: () => Effect.void,
          },
        )
        .pipe(Effect.exit)

      expect(exit._tag).toBe("Failure")
    }),
  )
  // kilocode_change end

  // kilocode_change start - regression for #13469: with no local background job the tool reads the
  // child session's last assistant message, so a trailing synthetic/ignored empty text part (the
  // memory marker) must not mask the real answer.
  it.instance("reads the real answer past a trailing synthetic empty text part", () =>
    Effect.gen(function* () {
      const sessions = yield* Session.Service
      const tool = yield* TaskStatusTool
      const def = yield* tool.init()
      const chat = yield* sessions.create({})
      const task = yield* sessions.create({ parentID: chat.id })
      const messageID = MessageID.ascending()

      yield* sessions.updateMessage({
        id: messageID,
        role: "assistant",
        parentID: MessageID.ascending(),
        sessionID: task.id,
        mode: "general",
        agent: "general",
        cost: 0,
        path: { cwd: "/tmp", root: "/tmp" },
        tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
        modelID: ModelID.make("test-model"),
        providerID: ProviderID.make("test"),
        time: { created: Date.now() },
        finish: "stop",
      })
      yield* sessions.updatePart({
        id: PartID.ascending(),
        messageID,
        sessionID: task.id,
        type: "text",
        text: "the actual answer",
      })
      yield* sessions.updatePart({
        id: PartID.ascending(),
        messageID,
        sessionID: task.id,
        type: "text",
        text: "",
        synthetic: true,
        ignored: true,
      })

      const result = yield* def.execute(
        { task_id: task.id, wait: false },
        {
          sessionID: chat.id,
          messageID: MessageID.ascending(),
          agent: "build",
          abort: new AbortController().signal,
          messages: [],
          metadata: () => Effect.void,
          ask: () => Effect.void,
        },
      )

      expect(result.metadata.state).toBe("completed")
      expect(result.output).toContain("<task_result>\nthe actual answer\n</task_result>")
    }),
  )
  // kilocode_change end
})

// kilocode_change start - subagent hang watchdog stall surfacing
const stallLayer = (flags: Partial<RuntimeFlags.Info> = {}) =>
  Layer.mergeAll(
    Activity.defaultLayer,
    Agent.defaultLayer,
    BackgroundJob.defaultLayer,
    Bus.defaultLayer,
    Config.defaultLayer,
    CrossSpawnSpawner.defaultLayer,
    Session.defaultLayer,
    SessionStatus.defaultLayer,
    Truncate.defaultLayer,
    RuntimeFlags.layer(flags),
  )

const stalled = testEffect(stallLayer({ experimentalBackgroundSubagents: true, subagentStallTimeoutMs: 150 }))

function ctx(sessionID: SessionID) {
  return {
    sessionID,
    messageID: MessageID.ascending(),
    agent: "build",
    abort: new AbortController().signal,
    messages: [],
    metadata: () => Effect.void,
    ask: () => Effect.void,
  }
}

describe("tool.task_status stall detection", () => {
  stalled.instance("reports stalled for a running task with no recent activity", () =>
    Effect.gen(function* () {
      const jobs = yield* BackgroundJob.Service
      const sessions = yield* Session.Service
      const activity = yield* Activity.Service
      const tool = yield* TaskStatusTool
      const def = yield* tool.init()
      const chat = yield* sessions.create({})
      const task = yield* sessions.create({ parentID: chat.id })

      yield* jobs.start({ id: task.id, type: "task", run: Effect.never })
      yield* activity.touch(task.id)
      yield* Effect.sleep("250 millis")

      const result = yield* def.execute({ task_id: task.id, wait: false }, ctx(chat.id))

      expect(result.metadata.stalled).toBe(true)
      expect(result.output).toContain("stalled: true")
      expect(result.output).toContain("appears frozen")
    }),
  )

  stalled.instance("wait=true reports stalled instead of a bare timeout", () =>
    Effect.gen(function* () {
      const jobs = yield* BackgroundJob.Service
      const sessions = yield* Session.Service
      const activity = yield* Activity.Service
      const tool = yield* TaskStatusTool
      const def = yield* tool.init()
      const chat = yield* sessions.create({})
      const task = yield* sessions.create({ parentID: chat.id })

      yield* jobs.start({ id: task.id, type: "task", run: Effect.never })
      yield* activity.touch(task.id)
      yield* Effect.sleep("250 millis")

      const result = yield* def.execute({ task_id: task.id, wait: true, timeout_ms: 50 }, ctx(chat.id))

      expect(result.metadata.timed_out).toBe(true)
      expect(result.metadata.stalled).toBe(true)
      expect(result.output).toContain("appears frozen")
    }),
  )
})
// kilocode_change end
