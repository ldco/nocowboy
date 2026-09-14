import { afterEach, describe, expect } from "bun:test"
import { Duration, Effect, Layer } from "effect"
import { Activity } from "@/nocowboy/session/activity"
import { SessionID } from "@/session/schema"
import { disposeAllInstances } from "../../fixture/fixture"
import { testEffect } from "../../lib/effect"

afterEach(async () => {
  await disposeAllInstances()
})

const it = testEffect(Layer.mergeAll(Activity.defaultLayer))

const id = SessionID.make("ses_activity_test")

describe("Activity heartbeat", () => {
  it.instance("touch records activity, idleFor grows, remove clears", () =>
    Effect.gen(function* () {
      const activity = yield* Activity.Service

      expect(yield* activity.lastActivityAt(id)).toBeUndefined()
      expect(yield* activity.idleFor(id)).toBeUndefined()

      yield* activity.touch(id)

      const at = yield* activity.lastActivityAt(id)
      expect(typeof at).toBe("number")
      expect(at).toBeGreaterThan(0)

      const idle = yield* activity.idleFor(id)
      expect(idle).toBeDefined()
      expect(Duration.toMillis(idle!)).toBeGreaterThanOrEqual(0)

      yield* activity.remove(id)
      expect(yield* activity.lastActivityAt(id)).toBeUndefined()
    }),
  )

  it.instance("touch is throttled inside the throttle window", () =>
    Effect.gen(function* () {
      const activity = yield* Activity.Service
      yield* activity.touch(id)
      const first = yield* activity.lastActivityAt(id)
      // A second immediate touch must not rewrite the timestamp (per-token spam guard).
      yield* activity.touch(id)
      expect(yield* activity.lastActivityAt(id)).toBe(first)
    }),
  )

  it.instance("waitUntilIdle resolves once the threshold elapses without touches", () =>
    Effect.gen(function* () {
      const activity = yield* Activity.Service
      yield* activity.touch(id)
      yield* activity.waitUntilIdle(id, 60)
      const idle = yield* activity.idleFor(id)
      expect(Duration.toMillis(idle!)).toBeGreaterThanOrEqual(60)
    }),
  )

  it.instance("a touch after the throttle window resets the idle clock", () =>
    Effect.gen(function* () {
      const activity = yield* Activity.Service
      yield* activity.touch(id)
      yield* Effect.sleep("1100 millis")

      const before = yield* activity.idleFor(id)
      expect(Duration.toMillis(before!)).toBeGreaterThanOrEqual(1000)

      yield* activity.touch(id)
      const after = yield* activity.idleFor(id)
      expect(Duration.toMillis(after!)).toBeLessThan(600)
    }),
  )

  it.instance("keepAlive is interruptible and never wins a race against the tool", () =>
    Effect.gen(function* () {
      const activity = yield* Activity.Service
      const keep = SessionID.make("ses_activity_keepalive")
      yield* activity.touch(keep)

      const started = Date.now()
      // Simulate a tool that finishes fast while keepAlive (Effect.never) is running.
      const raced = yield* Effect.raceFirst(
        Effect.sleep("120 millis").pipe(Effect.as("tool")),
        Activity.keepAlive(activity, keep, { intervalMs: 1000, maxMs: 60_000 }).pipe(Effect.as("keepalive")),
      )

      expect(raced).toBe("tool")
      expect(Date.now() - started).toBeLessThan(2_000)
    }),
  )

  it.instance("keepAlive refreshes the heartbeat while a tool runs", () =>
    Effect.gen(function* () {
      const activity = yield* Activity.Service
      const keep = SessionID.make("ses_activity_keepalive2")
      yield* activity.touch(keep)

      // keepAlive's first tick lands after the 1s throttle window; the race ends
      // 200ms later, so the refreshed clock must be fresh.
      yield* Effect.raceFirst(
        Effect.sleep("1300 millis"),
        Activity.keepAlive(activity, keep, { intervalMs: 1100, maxMs: 60_000 }),
      )

      const refreshed = yield* activity.idleFor(keep)
      expect(Duration.toMillis(refreshed!)).toBeLessThan(600)
    }),
  )
})
