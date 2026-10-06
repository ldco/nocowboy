import { test, type TestOptions } from "bun:test"
import { Cause, Duration, Effect, Exit, Layer } from "effect"
import type * as Scope from "effect/Scope"
import * as TestClock from "effect/testing/TestClock"
import * as TestConsole from "effect/testing/TestConsole"
import type { Config } from "@/config/config"
import { Reference } from "@/reference/reference" // kilocode_change
import { TestInstance, withTmpdirInstance } from "../fixture/fixture"

type Body<A, E, R> = Effect.Effect<A, E, R> | (() => Effect.Effect<A, E, R>)
type InstanceOptions = { git?: boolean; config?: Partial<Config.Info> }

function isInstanceOptions(options: InstanceOptions | number | TestOptions | undefined): options is InstanceOptions {
  return !!options && typeof options === "object" && ("git" in options || "config" in options)
}

function instanceArgs(
  options?: InstanceOptions | number | TestOptions,
  testOptions?: number | TestOptions,
): { instanceOptions: InstanceOptions | undefined; testOptions: number | TestOptions | undefined } {
  if (typeof options === "number") return { instanceOptions: undefined, testOptions: options }
  if (isInstanceOptions(options)) return { instanceOptions: options, testOptions }
  return { instanceOptions: undefined, testOptions: options }
}

const body = <A, E, R>(value: Body<A, E, R>) => Effect.suspend(() => (typeof value === "function" ? value() : value))

const run = <A, E, R, E2>(value: Body<A, E, R | Scope.Scope>, layer: Layer.Layer<R, E2>) =>
  Effect.gen(function* () {
    const exit = yield* body(value).pipe(Effect.scoped, Effect.provide(layer), Effect.exit)
    if (Exit.isFailure(exit)) {
      for (const err of Cause.prettyErrors(exit.cause)) {
        yield* Effect.logError(err)
      }
    }
    return yield* exit
  }).pipe(Effect.runPromise)

const make = <R, E>(testLayer: Layer.Layer<R, E>, liveLayer: Layer.Layer<R, E>) => {
  // nocowboy_change - Effect test registration must not fall back to bun's
  // hardcoded 5000ms: `test(name, fn)` / `test(name, fn, undefined)` ignore the
  // bunfig `[test] timeout` (60000) and flaked the boot-heavy `it.instance`
  // tests under load. Always pass a concrete timeout (the bunfig value unless a
  // test overrides it).
  const DEFAULT_TEST_TIMEOUT = 60_000
  const withTimeout = (opts?: number | TestOptions): number | TestOptions => {
    if (opts === undefined) return DEFAULT_TEST_TIMEOUT
    if (typeof opts === "number") return opts
    return opts.timeout === undefined ? { ...opts, timeout: DEFAULT_TEST_TIMEOUT } : opts
  }
  const register = (name: string, fn: () => Promise<unknown>, opts?: number | TestOptions) =>
    test(name, fn, withTimeout(opts))
  const registerOnly = (name: string, fn: () => Promise<unknown>, opts?: number | TestOptions) =>
    test.only(name, fn, withTimeout(opts))
  const registerSkip = (name: string, fn: () => Promise<unknown>, opts?: number | TestOptions) =>
    test.skip(name, fn, withTimeout(opts))

  const effect = <A, E2>(name: string, value: Body<A, E2, R | Scope.Scope>, opts?: number | TestOptions) =>
    register(name, () => run(value, testLayer), opts)

  effect.only = <A, E2>(name: string, value: Body<A, E2, R | Scope.Scope>, opts?: number | TestOptions) =>
    registerOnly(name, () => run(value, testLayer), opts)

  effect.skip = <A, E2>(name: string, value: Body<A, E2, R | Scope.Scope>, opts?: number | TestOptions) =>
    registerSkip(name, () => run(value, testLayer), opts)

  const live = <A, E2>(name: string, value: Body<A, E2, R | Scope.Scope>, opts?: number | TestOptions) =>
    register(name, () => run(value, liveLayer), opts)

  live.only = <A, E2>(name: string, value: Body<A, E2, R | Scope.Scope>, opts?: number | TestOptions) =>
    registerOnly(name, () => run(value, liveLayer), opts)

  live.skip = <A, E2>(name: string, value: Body<A, E2, R | Scope.Scope>, opts?: number | TestOptions) =>
    registerSkip(name, () => run(value, liveLayer), opts)

  const runInstance = <A, E>(value: Effect.Effect<A, E, unknown>) =>
    Effect.runPromise(value.pipe(Effect.scoped, Effect.provide(liveLayer)) as Effect.Effect<A, E, never>)

  const instance = <A, E2>(
    name: string,
    value: Body<A, E2, R | TestInstance | Scope.Scope> | (() => Effect.Effect<A, E2, unknown>),
    options?: InstanceOptions | number | TestOptions,
    opts?: number | TestOptions,
  ) => {
    const args = instanceArgs(options, opts)
    const wrapped = typeof value === "function" ? value() : value
    return register(name, () => runInstance(wrapped.pipe(withTmpdirInstance(args.instanceOptions))), args.testOptions)
  }

  instance.only = <A, E2>(
    name: string,
    value: Body<A, E2, R | TestInstance | Scope.Scope> | (() => Effect.Effect<A, E2, unknown>),
    options?: InstanceOptions | number | TestOptions,
    opts?: number | TestOptions,
  ) => {
    const args = instanceArgs(options, opts)
    const wrapped = typeof value === "function" ? value() : value
    return registerOnly(
      name,
      () => runInstance(wrapped.pipe(withTmpdirInstance(args.instanceOptions))),
      args.testOptions,
    )
  }

  instance.skip = <A, E2>(
    name: string,
    value: Body<A, E2, R | TestInstance | Scope.Scope> | (() => Effect.Effect<A, E2, unknown>),
    options?: InstanceOptions | number | TestOptions,
    opts?: number | TestOptions,
  ) => {
    const args = instanceArgs(options, opts)
    const wrapped = typeof value === "function" ? value() : value
    return registerSkip(
      name,
      () => runInstance(wrapped.pipe(withTmpdirInstance(args.instanceOptions))),
      args.testOptions,
    )
  }

  return { effect, live, instance }
}

// Test environment with TestClock and TestConsole
const testEnv = Layer.mergeAll(TestConsole.layer, TestClock.layer())

// Live environment - uses real clock, but keeps TestConsole for output capture
const liveEnv = TestConsole.layer

export const it = make(testEnv, liveEnv)

// kilocode_change start
export const testEffect = <R, E>(layer: Layer.Layer<R, E>) => {
  const full = Layer.merge(layer, Reference.defaultLayer)
  return make(Layer.provideMerge(full, testEnv), Layer.provideMerge(full, liveEnv))
}
// kilocode_change end

export const awaitWithTimeout = <A, E, R>(
  self: Effect.Effect<A, E, R>,
  message: string,
  duration: Duration.Input = "2 seconds",
) =>
  self.pipe(
    Effect.timeoutOrElse({
      duration,
      orElse: () => Effect.fail(new Error(message)),
    }),
  )

export const pollWithTimeout = <A, E, R>(
  self: Effect.Effect<A | undefined, E, R>,
  message: string,
  duration: Duration.Input = "5 seconds",
) =>
  Effect.gen(function* () {
    while (true) {
      const result = yield* self
      if (result !== undefined) return result
      yield* Effect.sleep("20 millis")
    }
  }).pipe(
    Effect.timeoutOrElse({
      duration,
      orElse: () => Effect.fail(new Error(message)),
    }),
  )
