//
// nocowboy_change — LLM stream idle timeout at the provider layer.
//
// Wraps the raw provider async-iterable (SSE) and aborts the request when no
// event arrives for `idleMs`. A silently stalled provider (headers delivered,
// then no bytes) would otherwise hang the session forever.
//
// Two deliberate constraints, both verified:
//  1. It must NOT use `Stream.timeoutOrElse` — that combinator perturbs
//     async-iterable-backed streams (the AI SDK full stream) and breaks
//     healthy responses.
//  2. It must NOT be an `async function*` wrapper — calling `.return()` on an
//     async generator that is suspended inside `await` (our idle race) blocks
//     until that await settles, so cancelling a session would hang until the
//     timeout. A hand-rolled iterator lets `return()` resolve the pending
//     `next()` immediately.
//

/**
 * Stable marker for a stalled-provider failure. Kept in one place so the
 * retry classifier (`session/retry.ts`) can recognize the stall without
 * duplicating the wording. A stalled provider is transient: the request is
 * aborted here and re-issued by the retry policy instead of halting the
 * session and forcing the user to press "continue".
 */
export const STREAM_IDLE_MARKER = "LLM stream idle timeout"

/** Status text shown while the aborted stalled request is re-issued. */
export const STREAM_IDLE_RETRY_MESSAGE = "Provider stalled (no data received) — retrying"

export function isStreamIdleFailure(message: unknown): boolean {
  return typeof message === "string" && message.includes(STREAM_IDLE_MARKER)
}

export function streamIdleFailureMessage(idleMs: number, beforeFirstEvent = false) {
  return beforeFirstEvent
    ? `${STREAM_IDLE_MARKER}: no first event within ${idleMs}ms. The provider is still prefilling or the request never reached it.`
    : `${STREAM_IDLE_MARKER}: no event for ${idleMs}ms. The provider appears to have stalled.`
}

/**
 * Yields the values of `source`, but fails with a timeout error (and aborts the
 * request) if the next value takes too long to arrive. Two budgets:
 *
 *  - `firstEventMs` — time-to-first-event. A large prompt can legitimately sit
 *    in prefill for minutes before the provider emits anything; killing that
 *    is a false positive that aborts healthy requests (and switching providers
 *    does not help, because the wait is ours). Defaults to `idleMs`.
 *  - `idleMs` — silence between events once the stream has started. A stream
 *    that stops mid-flight is genuinely dead. The timer resets after every
 *    value.
 *
 * A budget of `<= 0` disables that phase; both disabled returns `source`.
 */
export function withIdleTimeout<T>(
  source: AsyncIterable<T>,
  idleMs: number,
  abort: AbortController,
  firstEventMs = idleMs,
): AsyncIterable<T> {
  if (idleMs <= 0 && firstEventMs <= 0) return source

  return {
    [Symbol.asyncIterator](): AsyncIterator<T> {
      const iterator = source[Symbol.asyncIterator]()
      let cancel: () => void = () => {}
      const cancelled = new Promise<IteratorResult<T>>((resolve) => {
        cancel = () => resolve({ done: true, value: undefined as never })
      })
      let seenEvent = false

      return {
        async next(): Promise<IteratorResult<T>> {
          const budget = seenEvent ? idleMs : firstEventMs
          if (budget <= 0) {
            const result = await Promise.race([iterator.next(), cancelled])
            if (!result.done) seenEvent = true
            return result
          }

          let timer: ReturnType<typeof setTimeout> | undefined
          const idle = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              abort.abort()
              reject(new Error(streamIdleFailureMessage(budget, !seenEvent)))
            }, budget)
          })

          try {
            const result = await Promise.race([iterator.next(), idle, cancelled])
            if (!result.done) seenEvent = true
            return result
          } finally {
            if (timer !== undefined) clearTimeout(timer)
          }
        },
        async return(value?: unknown): Promise<IteratorResult<T>> {
          // Unblock any pending `next()` race so finalization never waits for
          // the idle timeout.
          cancel()
          if (iterator.return) return iterator.return(value)
          return { done: true, value: undefined as never }
        },
        throw(error?: unknown): Promise<IteratorResult<T>> {
          if (iterator.throw) return iterator.throw(error)
          return Promise.reject(error)
        },
      }
    },
  }
}
