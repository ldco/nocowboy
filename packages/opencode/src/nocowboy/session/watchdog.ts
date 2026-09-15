//
// nocowboy_change — subagent hang watchdog: timeout resolution + shared copy.
//
// Effective timeout = env override (RuntimeFlags) ?? config ?? built-in default.
// 0 means disabled.
//
import type { Config } from "@/config/config"
import type { RuntimeFlags } from "@/effect/runtime-flags"

export const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 300_000
export const DEFAULT_STREAM_FIRST_EVENT_TIMEOUT_MS = 600_000
export const DEFAULT_SUBAGENT_STALL_TIMEOUT_MS = 600_000
export const DEFAULT_SUBAGENT_MAX_RUNTIME_MS = 0

type Sources = { flags: RuntimeFlags.Info; config: Config.Info }

export function streamIdleTimeoutMs({ flags, config }: Sources) {
  return flags.streamIdleTimeoutMs ?? config.experimental?.stream_idle_timeout_ms ?? DEFAULT_STREAM_IDLE_TIMEOUT_MS
}

/**
 * Time-to-first-event budget. Separate from the between-events idle timeout:
 * a huge prompt can legitimately prefill for minutes before the first token,
 * and killing that aborts healthy requests on any provider. Never allowed
 * below the idle budget (see llm.ts).
 */
export function streamFirstEventTimeoutMs({ flags, config }: Sources) {
  return (
    flags.streamFirstEventTimeoutMs ??
    config.experimental?.stream_first_event_timeout_ms ??
    DEFAULT_STREAM_FIRST_EVENT_TIMEOUT_MS
  )
}

export function subagentStallTimeoutMs({ flags, config }: Sources) {
  return (
    flags.subagentStallTimeoutMs ?? config.experimental?.subagent_stall_timeout_ms ?? DEFAULT_SUBAGENT_STALL_TIMEOUT_MS
  )
}

export function subagentMaxRuntimeMs({ flags, config }: Sources) {
  return flags.subagentMaxRuntimeMs ?? config.experimental?.subagent_max_runtime_ms ?? DEFAULT_SUBAGENT_MAX_RUNTIME_MS
}

/**
 * Interval for the in-flight tool heartbeat (0 = disabled).
 *
 * A running tool emits no stream events, so without a heartbeat a tool that
 * runs longer than the stall threshold would be mistaken for a stalled
 * subagent. The heartbeat keeps the session "active" while a tool is in
 * flight, bounded by the stall window itself (see Activity.keepAlive) so a
 * genuinely runaway tool still trips the watchdog shortly after.
 *
 * Must stay above Activity's 1s touch throttle to be observable.
 */
export function toolHeartbeatIntervalMs(stallMs: number) {
  if (stallMs <= 0) return 0
  return Math.max(1_000, Math.min(60_000, Math.floor(stallMs / 3)))
}

/** Tool error shown to the parent agent when a subagent is cancelled for stalling. */
export function stalledFailureText(input: {
  description: string
  subagent: string
  sessionID: string
  idleMs: number
  thresholdMs: number
}) {
  return [
    `Subagent "${input.description}" (${input.subagent}) stopped responding for ${Math.round(input.idleMs)}ms and was cancelled to avoid hanging forever.`,
    `session_id: ${input.sessionID}`,
    `reason: no progress (no stream events, no tool completion) for ${Math.round(input.idleMs)}ms (threshold ${input.thresholdMs}ms).`,
    "recovery:",
    "- Retry the task with a smaller or more specific prompt.",
    "- Take over the work directly in this thread.",
    "- If the subagent is legitimately slow (long build/test), raise experimental.subagent_stall_timeout_ms (0 disables the watchdog).",
  ].join("\n")
}

/** Tool error shown to the parent agent when a subagent is cancelled for exceeding the wall-clock cap. */
export function maxRuntimeFailureText(input: {
  description: string
  subagent: string
  sessionID: string
  maxRuntimeMs: number
}) {
  return [
    `Subagent "${input.description}" (${input.subagent}) exceeded the maximum runtime of ${input.maxRuntimeMs}ms and was cancelled.`,
    `session_id: ${input.sessionID}`,
    "recovery:",
    "- Retry with a smaller or more specific prompt.",
    "- If this task legitimately needs longer, raise experimental.subagent_max_runtime_ms (0 disables the cap).",
  ].join("\n")
}

/** Report shown by task_status while a subagent is still running but idle past the stall threshold. */
export function stalledStatusText(input: { idleMs: number; thresholdMs: number }) {
  return [
    `The subagent appears frozen: no progress for ${Math.round(input.idleMs)}ms (stall threshold ${input.thresholdMs}ms).`,
    "Stop waiting. Cancel it and retry or take over the work directly.",
    "If it is legitimately slow, raise experimental.subagent_stall_timeout_ms.",
  ].join(" ")
}
