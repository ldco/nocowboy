import { describe, expect } from "bun:test"
import { Effect } from "effect"
import { PluginV2 } from "@nocowboy/core/plugin"
import { ProviderPlugins } from "@nocowboy/core/plugin/provider"
import { NoCowboyPlugin } from "@nocowboy/core/plugin/provider/nocowboy"
import { expectPluginRegistered, it, model, provider, withEnv } from "./provider-helper"

describe("NoCowboyPlugin", () => {
  it.effect("is registered so legacy referer headers can be applied", () =>
    Effect.sync(() =>
      expectPluginRegistered(
        ProviderPlugins.map((item) => item.id),
        "kilo",
      ),
    ),
  )

  it.effect("applies legacy referer headers only to kilo", () =>
    Effect.gen(function* () {
      const plugin = yield* PluginV2.Service
      yield* plugin.add(NoCowboyPlugin)
      const result = yield* plugin.trigger(
        "provider.update",
        {},
        {
          provider: provider("nocowboy", {
            options: { headers: { Existing: "value" }, body: {}, aisdk: { provider: {}, request: {} } },
          }),
          cancel: false,
        },
      )
      const ignored = yield* plugin.trigger("provider.update", {}, { provider: provider("openrouter"), cancel: false })
      expect(result.provider.options.headers).toEqual({
        Existing: "value",
        "HTTP-Referer": "https://kilo.ai/",
        "X-Title": "Kilo Code",
      })
      expect(ignored.provider.options.headers).toEqual({})
    }),
  )

  it.effect("uses the exact legacy Kilo header casing and set", () =>
    Effect.gen(function* () {
      const plugin = yield* PluginV2.Service
      yield* plugin.add(NoCowboyPlugin)
      const result = yield* plugin.trigger("provider.update", {}, { provider: provider("nocowboy"), cancel: false })

      expect(result.provider.options.headers).toEqual({
        "HTTP-Referer": "https://kilo.ai/",
        "X-Title": "Kilo Code",
      })
      expect(result.provider.options.headers).not.toHaveProperty("http-referer")
      expect(result.provider.options.headers).not.toHaveProperty("x-title")
      expect(result.provider.options.headers).not.toHaveProperty("X-Source")
    }),
  )

  it.effect("uses the legacy provider-id guard instead of endpoint package matching", () =>
    Effect.gen(function* () {
      const plugin = yield* PluginV2.Service
      yield* plugin.add(NoCowboyPlugin)
      const matchingID = yield* plugin.trigger(
        "provider.update",
        {},
        {
          provider: provider("nocowboy", {
            endpoint: { type: "aisdk", package: "not-kilo" },
          }),
          cancel: false,
        },
      )
      const matchingPackage = yield* plugin.trigger(
        "provider.update",
        {},
        {
          provider: provider("custom-kilo", {
            endpoint: { type: "aisdk", package: "kilo" },
          }),
          cancel: false,
        },
      )

      expect(matchingID.provider.options.headers).toEqual({
        "HTTP-Referer": "https://kilo.ai/",
        "X-Title": "Kilo Code",
      })
      expect(matchingPackage.provider.options.headers).toEqual({})
    }),
  )

  it.effect("routes the Kilo catalog through the Kilo Gateway SDK", () =>
    withEnv({ KILO_API_KEY: undefined, KILO_ORG_ID: undefined }, () =>
      Effect.gen(function* () {
        const plugin = yield* PluginV2.Service
        yield* plugin.add(NoCowboyPlugin)
        const updated = yield* plugin.trigger(
          "provider.update",
          {},
          {
            provider: provider("nocowboy", {
              endpoint: { type: "aisdk", package: "@ai-sdk/openai-compatible", url: "https://api.kilo.ai/api/gateway" },
              options: {
                headers: {},
                body: {},
                aisdk: { provider: { apiKey: "stored-token" }, request: {} },
              },
            }),
            cancel: false,
          },
        )

        expect(updated.provider.endpoint).toEqual({
          type: "aisdk",
          package: "@nocowboy/gateway",
          url: "https://api.kilo.ai/api/openrouter",
        })
        expect(updated.provider.options.aisdk.provider.kilocodeToken).toBe("stored-token")

        const result = yield* plugin.trigger(
          "aisdk.sdk",
          {
            model: model("kilo", "kilo-auto/free"),
            package: "@nocowboy/gateway",
            options: updated.provider.options.aisdk.provider,
          },
          {},
        )
        expect(result.sdk).toBeDefined()
        expect(typeof result.sdk.languageModel).toBe("function")
        expect(typeof result.sdk.anthropic).toBe("function")
      }),
    ),
  )

  it.effect("keeps authenticated credentials ahead of inherited environment keys", () =>
    withEnv({ KILO_API_KEY: "environment-token", KILO_ORG_ID: "environment-org" }, () =>
      Effect.gen(function* () {
        const plugin = yield* PluginV2.Service
        yield* plugin.add(NoCowboyPlugin)
        const result = yield* plugin.trigger(
          "provider.update",
          {},
          {
            provider: provider("nocowboy", {
              enabled: { via: "auth", service: "kilo" },
              options: {
                headers: {},
                body: {},
                aisdk: {
                  provider: { apiKey: "authenticated-token", kilocodeOrganizationId: "authenticated-org" },
                  request: {},
                },
              },
            }),
            cancel: false,
          },
        )

        expect(result.provider.enabled).toEqual({ via: "auth", service: "kilo" })
        expect(result.provider.options.aisdk.provider.kilocodeToken).toBe("authenticated-token")
        expect(result.provider.options.aisdk.provider.kilocodeOrganizationId).toBe("environment-org")
      }),
    ),
  )

  it.effect("keeps anonymous Kilo models available without credentials", () =>
    withEnv({ KILO_API_KEY: undefined, KILO_ORG_ID: undefined }, () =>
      Effect.gen(function* () {
        const plugin = yield* PluginV2.Service
        yield* plugin.add(NoCowboyPlugin)
        const result = yield* plugin.trigger("provider.update", {}, { provider: provider("nocowboy"), cancel: false })

        expect(result.provider.enabled).toEqual({ via: "custom", data: { anonymous: true } })
        expect(result.provider.options.aisdk.provider.kilocodeToken).toBe("anonymous")
      }),
    ),
  )
})
