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

export function streamIdleFailureMessage(idleMs: number) {
  return `LLM stream idle timeout: no event for ${idleMs}ms. The provider appears to have stalled.`
}

/**
 * Yields the values of `source`, but fails with a timeout error (and aborts the
 * request) if the next value takes longer than `idleMs` to arrive. The timer
 * resets after every value, so this covers both time-to-first-event and idle
 * between events. `idleMs <= 0` disables the timeout.
 */
export function withIdleTimeout<T>(
  source: AsyncIterable<T>,
  idleMs: number,
  abort: AbortController,
): AsyncIterable<T> {
  if (idleMs <= 0) return source

  return {
    [Symbol.asyncIterator](): AsyncIterator<T> {
      const iterator = source[Symbol.asyncIterator]()
      let cancel: () => void = () => {}
      const cancelled = new Promise<IteratorResult<T>>((resolve) => {
        cancel = () => resolve({ done: true, value: undefined as never })
      })

      return {
        async next(): Promise<IteratorResult<T>> {
          let timer: ReturnType<typeof setTimeout> | undefined
          const idle = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              abort.abort()
              reject(new Error(streamIdleFailureMessage(idleMs)))
            }, idleMs)
          })

          try {
            return await Promise.race([iterator.next(), idle, cancelled])
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
