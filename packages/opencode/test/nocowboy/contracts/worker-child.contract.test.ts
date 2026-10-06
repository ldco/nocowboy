import { describe, expect, test } from "bun:test"
import { Duration, Effect } from "effect"
import type { Config } from "@/config/config"
import type { RuntimeFlags } from "@/effect/runtime-flags"
import { SessionID } from "@/session/schema"
import { Activity, keepAlive } from "@/nocowboy/session/activity"
import {
  DEFAULT_SUBAGENT_STALL_TIMEOUT_MS,
  subagentStallTimeoutMs,
  toolHeartbeatIntervalMs,
} from "@/nocowboy/session/watchdog"
import { KiloTask } from "@/nocowboy/tool/task"

const sources = (flags: Record<string, unknown>, config: Record<string, unknown>) =>
  ({ flags, config }) as unknown as { flags: RuntimeFlags.Info; config: Config.Info }

describe("contract: worker child lifecycle", () => {
  test("stall timeout resolves env > config > built-in default", () => {
    expect(subagentStallTimeoutMs(sources({ subagentStallTimeoutMs: 111 }, { experimental: { subagent_stall_timeout_ms: 222 } }))).toBe(111)
    expect(subagentStallTimeoutMs(sources({}, { experimental: { subagent_stall_timeout_ms: 222 } }))).toBe(222)
    expect(subagentStallTimeoutMs(sources({}, {}))).toBe(DEFAULT_SUBAGENT_STALL_TIMEOUT_MS)
  })

  test("a long-running tool gets a heartbeat so a working child is not declared stalled", () => {
    const stall = subagentStallTimeoutMs(sources({}, {}))
    const heartbeat = toolHeartbeatIntervalMs(stall)
    expect(heartbeat).toBeGreaterThan(0)
    expect(heartbeat).toBeLessThan(stall)
  })

  test("the watchdog is disabled when the stall timeout is 0", () => {
    expect(toolHeartbeatIntervalMs(0)).toBe(0)
  })

  test("delegation stays one level deep (no recursive subagent chains)", () => {
    expect(KiloTask.nestedTask()).toBe(false)
  })

  test("a wait in flight (long tool or permission ask) keeps the session active, bounded by the stall window", async () => {
    const sid = SessionID.make("ses_contract_wait")
    const touches: number[] = []
    const activity = {
      touch: () => Effect.sync(() => touches.push(Date.now())),
      lastActivityAt: () => Effect.succeed(undefined),
      idleFor: () => Effect.succeed(undefined),
      waitUntilIdle: () => Effect.void,
      remove: () => Effect.void,
    } as unknown as Activity.Interface

    await Effect.runPromise(
      Effect.raceFirst(Effect.sleep(Duration.millis(80)), keepAlive(activity, sid, { intervalMs: 5, maxMs: 20 })),
    )
    // ceil(20/5) = 4 heartbeats while the wait is in flight, then it stops
    // touching (so a genuinely runaway wait still ages out and trips the watchdog).
    expect(touches.length).toBe(4)
  })
})
