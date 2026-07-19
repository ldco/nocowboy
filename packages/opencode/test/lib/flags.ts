//
// Flag isolation helper for parallel-safe test flag mutations.
//
// nocowboy_change: Все мутации глобальных Flag.* должны проходить через
// withFlags() / withFlagsSync(), чтобы избежать гонок между параллельными тестами.
//

import { Flag } from "@nocowboy/core/flag/flag"

type FlagValue = string | boolean | number | undefined

// Синхронный mutex: пока флаги заняты одним тестом, другие ждут
let _lock = false
const _waiters: Array<() => void> = []

function acquire(): void {
  while (_lock) {
    // spin — ждём освобождения
  }
  _lock = true
}

function release(): void {
  _lock = false
}

/**
 * Синхронная версия — установить флаги, выполнить fn, восстановить.
 * Использует spinlock. Подходит для синхронных функций типа app().
 *
 * @example
 * ```ts
 * const app = withFlagsSync({
 *   NOCOWBOY_SERVER_PASSWORD: "test-secret",
 * }, () => Server.Default().app)
 * ```
 */
export function withFlagsSync<T>(
  overrides: Record<string, FlagValue>,
  fn: () => T,
): T {
  const f = Flag as unknown as Record<string, FlagValue>
  acquire()
  const saved: Record<string, FlagValue> = {}
  try {
    for (const key of Object.keys(overrides)) {
      saved[key] = f[key]
      f[key] = overrides[key]
    }
    const result = fn()
    return result
  } finally {
    for (const key of Object.keys(overrides)) {
      f[key] = saved[key]
    }
    release()
  }
}

/**
 * Асинхронная версия — для async функций.
 * Использует очередь Promise для сериализации доступа.
 */
let _queue: Promise<void> = Promise.resolve()

export async function withFlags<T>(
  overrides: Record<string, FlagValue>,
  fn: () => Promise<T> | T,
): Promise<T> {
  const f = Flag as unknown as Record<string, FlagValue>

  return new Promise<T>((resolve, reject) => {
    _queue = _queue.then(async () => {
      const saved: Record<string, FlagValue> = {}

      try {
        for (const key of Object.keys(overrides)) {
          saved[key] = f[key]
          f[key] = overrides[key]
        }

        resolve(await fn())
      } catch (e) {
        reject(e)
      } finally {
        for (const key of Object.keys(overrides)) {
          f[key] = saved[key]
        }
      }
    })
  })
}
