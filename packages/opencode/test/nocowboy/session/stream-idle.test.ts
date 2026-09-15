import { describe, expect, test } from "bun:test"
import { streamIdleFailureMessage, withIdleTimeout } from "@/nocowboy/session/stream-idle"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function collect<T>(source: AsyncIterable<T>) {
  const out: T[] = []
  for await (const value of source) out.push(value)
  return out
}

async function* silent(): AsyncIterable<number> {
  yield 1
  // Never produces another value: simulates a provider that sent headers then stalled.
  await new Promise(() => {})
}

async function* slow(): AsyncIterable<number> {
  for (const value of [1, 2, 3]) {
    yield value
    await sleep(30)
  }
}

describe("withIdleTimeout", () => {
  test("fails and aborts when no event arrives within the idle window", async () => {
    const ctrl = new AbortController()
    let error: unknown
    try {
      await collect(withIdleTimeout(silent(), 60, ctrl))
    } catch (caught) {
      error = caught
    }

    expect(String(error)).toContain("idle timeout")
    expect(String(error)).toContain(streamIdleFailureMessage(60))
    expect(ctrl.signal.aborted).toBe(true)
  })

  test("keeps a stream alive while events keep arriving within the idle window", async () => {
    const ctrl = new AbortController()
    const out = await collect(withIdleTimeout(slow(), 200, ctrl))

    expect(out).toEqual([1, 2, 3])
    expect(ctrl.signal.aborted).toBe(false)
  })

  test("is a passthrough when disabled", async () => {
    const ctrl = new AbortController()
    const out = await collect(withIdleTimeout(slow(), 0, ctrl))

    expect(out).toEqual([1, 2, 3])
    expect(ctrl.signal.aborted).toBe(false)
  })

  test("finalizes promptly when the consumer stops early", async () => {
    const ctrl = new AbortController()
    const iterator = withIdleTimeout(slow(), 30_000, ctrl)[Symbol.asyncIterator]()

    const first = await iterator.next()
    expect(first.value).toBe(1)

    // Must not wait for the 30s idle window before closing.
    const closed = await iterator.return?.(undefined)
    expect(closed?.done).toBe(true)
    expect(ctrl.signal.aborted).toBe(false)
  })

  // nocowboy_change — regression: a slow first event (huge-prompt prefill)
  // must not be killed by the between-events budget. This false positive
  // aborted healthy requests on any provider and halted the session.
  test("survives a slow first event within the first-event budget", async () => {
    const ctrl = new AbortController()
    async function* slowStart(): AsyncIterable<number> {
      await sleep(150) // prefill longer than the idle window
      yield 1
      yield 2
    }

    const out = await collect(withIdleTimeout(slowStart(), 60, ctrl, 500))
    expect(out).toEqual([1, 2])
    expect(ctrl.signal.aborted).toBe(false)
  })

  test("fails before the first event once the first-event budget is exhausted", async () => {
    const ctrl = new AbortController()
    let error: unknown
    try {
      await collect(withIdleTimeout(silent(), 60, ctrl, 120))
    } catch (caught) {
      error = caught
    }

    // silent() yields 1 immediately, so this is the between-events failure.
    expect(String(error)).toContain(streamIdleFailureMessage(60))
    expect(ctrl.signal.aborted).toBe(true)

    const ctrl2 = new AbortController()
    async function* neverStarts(): AsyncIterable<number> {
      await new Promise(() => {})
    }
    let error2: unknown
    try {
      await collect(withIdleTimeout(neverStarts(), 60, ctrl2, 120))
    } catch (caught) {
      error2 = caught
    }
    expect(String(error2)).toContain(streamIdleFailureMessage(120, true))
    expect(ctrl2.signal.aborted).toBe(true)
  })

  test("keeps the tight idle budget after the first event", async () => {
    const ctrl = new AbortController()
    async function* startsThenStalls(): AsyncIterable<number> {
      yield 1
      await new Promise(() => {})
    }

    let error: unknown
    try {
      await collect(withIdleTimeout(startsThenStalls(), 60, ctrl, 5_000))
    } catch (caught) {
      error = caught
    }
    expect(String(error)).toContain(streamIdleFailureMessage(60))
    expect(String(error)).not.toContain("no first event")
    expect(ctrl.signal.aborted).toBe(true)
  })

  // nocowboy_change — UX telemetry: stalls must be observable so the TUI can
  // show a countdown instead of a frozen spinner.
  test("observes silence once the warn threshold passes and clears on resume", async () => {
    const ctrl = new AbortController()
    const stalls: unknown[] = []
    let clears = 0
    async function* slowStart(): AsyncIterable<number> {
      await sleep(260) // > warnMs = min(60_000, 500/2) = 250
      yield 1
    }

    const out = await collect(withIdleTimeout(slowStart(), 500, ctrl, 500, (i) => stalls.push(i), () => clears++))

    expect(out).toEqual([1])
    expect(stalls).toHaveLength(1)
    const info = stalls[0] as { phase: string; budgetMs: number; stalledAt: number; message: string }
    expect(info.phase).toBe("first-event")
    expect(info.budgetMs).toBe(500)
    expect(info.stalledAt).toBeGreaterThan(0)
    expect(info.message).toContain("first token")
    expect(clears).toBe(1)
    expect(ctrl.signal.aborted).toBe(false)
  })

  test("warns per-gap with the right phase and stays silent for fast streams", async () => {
    const ctrl = new AbortController()
    const phases: string[] = []
    async function* gap(): AsyncIterable<number> {
      yield 1
      await sleep(260) // between-events gap > warnMs
      yield 2
    }

    const out = await collect(withIdleTimeout(gap(), 500, ctrl, 500, (i) => phases.push(i.phase)))
    expect(out).toEqual([1, 2])
    // first event is immediate → no first-event warning; the gap warns once.
    expect(phases).toEqual(["between-events"])

    const fast = await collect(withIdleTimeout(slow(), 500, new AbortController(), 500, () => phases.push("fast")))
    expect(fast).toEqual([1, 2, 3])
    expect(phases).toEqual(["between-events"]) // no extra warnings from the fast stream
  })

  // Regression: a blocking tool (question/permission) waits for the user, not the provider. The idle
  // watchdog used to abort the turn after the default 300s, so the user's answer arrived after the
  // turn had already been aborted (measured 2026-09-15).
  test("re-arms instead of aborting while a tool is busy", async () => {
    const ctrl = new AbortController()
    let busy = true
    const iterator = withIdleTimeout(
      silent(),
      50,
      ctrl,
      50,
      undefined,
      undefined,
      () => busy,
    )[Symbol.asyncIterator]()

    const first = await iterator.next()
    expect(first.value).toBe(1)

    const pending = iterator.next()
    await sleep(200) // several idle budgets elapse while the tool is busy
    expect(ctrl.signal.aborted).toBe(false)

    busy = false
    await expect(pending).rejects.toThrow("idle timeout")
    expect(ctrl.signal.aborted).toBe(true)
  })

  test("still aborts on idle when no tool is busy", async () => {
    const ctrl = new AbortController()
    await expect(collect(withIdleTimeout(silent(), 50, ctrl, 50, undefined, undefined, () => false))).rejects.toThrow(
      "idle timeout",
    )
    expect(ctrl.signal.aborted).toBe(true)
  })
})
