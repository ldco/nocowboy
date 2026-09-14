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
})
