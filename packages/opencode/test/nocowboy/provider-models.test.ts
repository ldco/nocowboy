import { describe, expect, test } from "bun:test"
import { sanitizeProviderConfig, sanitizeProviderModels } from "@/nocowboy/config/provider-models"

describe("sanitizeProviderModels", () => {
  test("keeps valid entries, keeps null markers, drops malformed entries", () => {
    const { models, errors } = sanitizeProviderModels({
      good: { name: "Good" },
      bare: {},
      off: null,
      bad: { cost: { input: "nope" } },
    })
    expect(Object.keys(models).sort()).toEqual(["bare", "good", "off"])
    expect(models.off).toBeNull()
    expect(errors).toHaveLength(1)
    expect(errors[0]?.model).toBe("bad")
    expect(errors[0]?.message.length).toBeGreaterThan(0)
  })

  test("a non-object input yields an empty map and no errors", () => {
    expect(sanitizeProviderModels(undefined)).toEqual({ models: {}, errors: [] })
    expect(sanitizeProviderModels("nope")).toEqual({ models: {}, errors: [] })
    expect(sanitizeProviderModels([1, 2])).toEqual({ models: {}, errors: [] })
  })
})

describe("sanitizeProviderConfig", () => {
  test("drops malformed entries across providers and reports them", () => {
    const config: Record<string, unknown> = {
      provider: {
        local: { models: { good: { name: "Good" }, bad: { limit: { context: "big" } } } },
        clean: { models: { only: { name: "Only" } } },
        nomodels: { name: "No models key" },
      },
    }
    const errors = sanitizeProviderConfig(config)
    expect(errors).toEqual([{ provider: "local", model: "bad", message: expect.any(String) }])
    const provider = config.provider as Record<string, { models?: Record<string, unknown> }>
    expect(Object.keys(provider.local?.models ?? {})).toEqual(["good"])
    expect(Object.keys(provider.clean?.models ?? {})).toEqual(["only"])
  })

  test("a config without a provider block is left untouched", () => {
    expect(sanitizeProviderConfig({ model: "x/y" })).toEqual([])
    expect(sanitizeProviderConfig({ provider: "not-an-object" })).toEqual([])
  })
})
