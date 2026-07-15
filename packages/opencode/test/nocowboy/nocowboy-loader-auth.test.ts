// kilocode_change - new file
// Tests that unauthenticated Kilo models are assembled with paid models and autoloaded anonymously.

import { expect } from "bun:test"
import { AppFileSystem } from "@nocowboy/core/filesystem"
import { ModelsDev } from "../../src/provider/models"
import * as CoreModels from "@nocowboy/core/models"
import { Effect, Layer } from "effect"
import { FetchHttpClient } from "effect/unstable/http"
import { ncowboyCustomLoaders as kiloCustomLoaders } from "../../src/nocowboy/provider/provider"
import { Auth } from "../../src/auth"
import { ModelCache } from "../../src/provider/model-cache"
import { Provider } from "../../src/provider/provider"
import { TestConfig } from "../fixture/config"
import { testEffect } from "../lib/effect"
import { provideInstance } from "../fixture/fixture"

const input = {
  id: "nocowboy",
  env: ["NOCOWBOY_API_KEY"],
  models: {
    "free-model": {
      id: "free-model",
      name: "Free Model",
      cost: { input: 0, output: 0 },
      limit: { context: 128000, output: 4096 },
    },
    "paid-model": {
      id: "paid-model",
      name: "Paid Model",
      cost: { input: 1, output: 2 },
      limit: { context: 128000, output: 4096 },
    },
  },
}

const seed: Record<string, ModelsDev.Provider> = {
  apertis: {
    id: "apertis",
    name: "Apertis",
    env: ["APERTIS_API_KEY"],
    models: {},
  },
}

const auth = Layer.mock(Auth.Service)({
  get: () => Effect.succeed(undefined),
})

const files = Layer.effect(
  AppFileSystem.Service,
  Effect.gen(function* () {
    const fs = yield* AppFileSystem.Service
    return AppFileSystem.Service.of({
      ...fs,
      readJson: () => Effect.succeed(seed),
      stat: () => fs.stat(import.meta.path),
    })
  }),
).pipe(Layer.provide(AppFileSystem.defaultLayer))

function load(data?: { auth?: object; config?: object; env?: Record<string, string | undefined> }) {
  return kiloCustomLoaders({
    auth: () => Effect.succeed(data?.auth),
    config: () => Effect.succeed(data?.config ?? {}),
    env: () => Effect.succeed(data?.env ?? {}),
    get: () => Effect.succeed(undefined),
  }).nocowboy(input)
}

function layer() {
  const cfg = TestConfig.layer()
  const models = Layer.succeed(
    ModelCache.KiloModelsService,
    ModelCache.KiloModelsService.of({
      fetch: () =>
        Effect.succeed({
          models: {
            "free-model": {
              id: "free-model",
              name: "Free Model",
              cost: { input: 0, output: 0 },
              limit: { context: 128000, output: 4096 },
            },
            "paid-model": {
              id: "paid-model",
              name: "Paid Model",
              cost: { input: 1, output: 2 },
              isFree: false,
              mayTrainOnYourPrompts: true,
              limit: { context: 128000, output: 4096 },
            },
          },
        }),
    }),
  )
  const cache = Layer.fresh(ModelCache.layer).pipe(
    Layer.provide(FetchHttpClient.layer),
    Layer.provide(cfg),
    Layer.provide(auth),
    Layer.provide(models),
  )
  const core = Layer.succeed(
    CoreModels.Service,
    CoreModels.Service.of({
      get: () => Effect.succeed(seed),
      refresh: () => Effect.void,
    }),
  )
  return Layer.fresh(ModelsDev.layer).pipe(
    Layer.provide(core),
    Layer.provide(FetchHttpClient.layer),
    Layer.provide(files),
    Layer.provide(cfg),
    Layer.provide(auth),
    Layer.provide(cache),
  )
}

const it = testEffect(Layer.empty)

it.live("assembles paid Kilo models without auth", () =>
  Effect.gen(function* () {
    const providers = yield* ModelsDev.Service.use((models) => models.get()).pipe(
      Effect.provide(layer()),
      provideInstance(process.cwd()),
    )
    const nocowboy = Provider.fromModelsDevProvider(providers.nocowboy)

    expect(nocowboy.models["paid-model"]).toMatchObject({
      id: "paid-model",
      providerID: "nocowboy",
      cost: { input: 1, output: 2 },
      isFree: false,
      mayTrainOnYourPrompts: true,
    })
  }),
)

it.live("does not infer free status from zero catalog prices", () =>
  Effect.gen(function* () {
    const providers = yield* ModelsDev.Service.use((models) => models.get()).pipe(
      Effect.provide(layer()),
      provideInstance(process.cwd()),
    )
    const nocowboy = Provider.fromModelsDevProvider(providers.nocowboy)

    expect(nocowboy.models["free-model"].isFree).toBeUndefined()
  }),
)

it.effect("enables a paid catalog anonymously without auth", () =>
  (Effect.gen(function* () {
    const result = yield* load()
    expect(result.autoload).toBe(true)
    expect(result.options).toEqual({ apiKey: "anonymous" })
  }) as never),
)

it.effect("enables a paid catalog when config apiKey is present", () =>
  (Effect.gen(function* () {
    const result = yield* load({ config: { provider: { nocowboy: { options: { apiKey: "test-key" } } } } })
    expect(result.autoload).toBe(true)
    expect(result.options).toEqual({})
  }) as never),
)

it.effect("enables a paid catalog when auth exists", () =>
  (Effect.gen(function* () {
    const result = yield* load({ auth: { type: "api", key: "test-key" } })
    expect(result.autoload).toBe(true)
    expect(result.options).toEqual({})
  }) as never),
)
