//
// nocowboy_change — subagent hang watchdog: per-session activity heartbeat.
//
// A single source of truth for "when did this session last make progress".
// Shared by the foreground task watchdog, the background job watchdog and the
// task_status tool, so all three agree on the same clock.
//
// Progress is recorded by `touch` from the session processor (stream events,
// tool call completion) and the session prompt loop (step boundaries). The
// watchers read the timestamp via `idleFor` / `waitUntilIdle`.
//
import { InstanceState } from "@/effect/instance-state"
import { SessionID } from "@/session/schema"
import { Clock, Context, Duration, Effect, Layer } from "effect"

/** Ignore touches that land within this window of the previous one. */
const TOUCH_THROTTLE_MS = 1_000
/** Poll granularity for `waitUntilIdle`. */
const POLL_INTERVAL_MS = 1_000

export interface Interface {
  readonly touch: (sessionID: SessionID) => Effect.Effect<void>
  readonly lastActivityAt: (sessionID: SessionID) => Effect.Effect<number | undefined>
  readonly idleFor: (sessionID: SessionID) => Effect.Effect<Duration.Duration | undefined>
  readonly waitUntilIdle: (sessionID: SessionID, thresholdMs: number) => Effect.Effect<void>
  readonly remove: (sessionID: SessionID) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@nocowboy/Activity") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const state = yield* InstanceState.make(
      Effect.fn("Activity.state")(() => Effect.succeed(new Map<SessionID, number>())),
    )

    const touch = Effect.fn("Activity.touch")(function* (sessionID: SessionID) {
      const data = yield* InstanceState.get(state)
      const now = yield* Clock.currentTimeMillis
      const last = data.get(sessionID)
      if (last !== undefined && now - last < TOUCH_THROTTLE_MS) return
      data.set(sessionID, now)
    })

    const lastActivityAt = Effect.fn("Activity.lastActivityAt")(function* (sessionID: SessionID) {
      return (yield* InstanceState.get(state)).get(sessionID)
    })

    const idleFor = Effect.fn("Activity.idleFor")(function* (sessionID: SessionID) {
      const last = (yield* InstanceState.get(state)).get(sessionID)
      if (last === undefined) return undefined
      const now = yield* Clock.currentTimeMillis
      return Duration.millis(Math.max(0, now - last))
    })

    const waitUntilIdle = Effect.fn("Activity.waitUntilIdle")(function* (sessionID: SessionID, thresholdMs: number) {
      if (thresholdMs <= 0) return
      const data = yield* InstanceState.get(state)
      while (true) {
        const now = yield* Clock.currentTimeMillis
        const last = data.get(sessionID)
        // No touch yet: arm the clock from now so the watchdog waits a full
        // window instead of firing immediately on an unobserved session.
        if (last === undefined) {
          data.set(sessionID, now)
          yield* Effect.sleep(Duration.millis(Math.min(POLL_INTERVAL_MS, thresholdMs)))
          continue
        }
        const idle = now - last
        if (idle >= thresholdMs) return
        yield* Effect.sleep(Duration.millis(Math.min(POLL_INTERVAL_MS, thresholdMs - idle)))
      }
    })

    const remove = Effect.fn("Activity.remove")(function* (sessionID: SessionID) {
      const data = yield* InstanceState.get(state)
      data.delete(sessionID)
    })

    return Service.of({ touch, lastActivityAt, idleFor, waitUntilIdle, remove })
  }),
)

export const defaultLayer = layer

/**
 * Periodic heartbeat used while a tool call is in flight.
 *
 * A running tool emits no stream events, so without this a tool that runs
 * longer than the stall threshold would be mistaken for a stalled subagent.
 * Touches `sessionID` every `intervalMs` for at most `maxMs`, then stops
 * touching but never completes — callers race it against the tool effect with
 * `Effect.raceFirst`, which interrupts it as soon as the tool finishes (so it
 * can never win the race). The `maxMs` bound keeps a runaway tool from
 * shielding a stalled subagent forever: once it elapses, the clock last reset
 * here ages out and the normal stall watchdog trips again.
 */
export function keepAlive(
  activity: Interface,
  sessionID: SessionID,
  options: { intervalMs: number; maxMs: number },
): Effect.Effect<never> {
  return Effect.gen(function* () {
    if (options.intervalMs > 0 && options.maxMs > 0) {
      const ticks = Math.max(1, Math.ceil(options.maxMs / options.intervalMs))
      for (let i = 0; i < ticks; i++) {
        yield* Effect.sleep(Duration.millis(options.intervalMs))
        yield* activity.touch(sessionID)
      }
    }
    return yield* Effect.never
  })
}

export * as Activity from "./activity"
