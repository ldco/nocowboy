import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { NoCowboySessionPrompt } from "../../src/nocowboy/session/prompt"
import { ModelID, ProviderID } from "../../src/provider/schema"

const model = { providerID: ProviderID.make("deepseek"), modelID: ModelID.make("deepseek-v4-pro") }
const available = () => Effect.succeed(true)
const unavailable = () => Effect.succeed(false)

const run = (input: Parameters<typeof NoCowboySessionPrompt.applyBudget>[0]) =>
  Effect.runPromiseExit(NoCowboySessionPrompt.applyBudget(input))

describe("applyBudget", () => {
  test("passes the model through when under budget", async () => {
    const exit = await run({ model, costUsd: 1, tokens: 100, budget: { max_cost_usd: 10 }, available })
    expect(exit._tag).toBe("Success")
    if (exit._tag === "Success") expect(exit.value).toEqual(model)
  })

  test("aborts the turn when a cap is exceeded", async () => {
    const exit = await run({ model, costUsd: 11, tokens: 0, budget: { max_cost_usd: 10 }, available })
    expect(exit._tag).toBe("Failure")
  })

  test("downgrades to the configured model when available", async () => {
    const exit = await run({
      model,
      costUsd: 11,
      tokens: 0,
      budget: { max_cost_usd: 10, on_exceed: "downgrade", downgrade_model: "openrouter/qwen3-max" },
      available,
    })
    expect(exit._tag).toBe("Success")
    if (exit._tag === "Success") {
      expect(String(exit.value.providerID)).toBe("openrouter")
      expect(String(exit.value.modelID)).toBe("qwen3-max")
    }
  })

  test("aborts when the downgrade target is unavailable", async () => {
    const exit = await run({
      model,
      costUsd: 11,
      tokens: 0,
      budget: { max_cost_usd: 10, on_exceed: "downgrade", downgrade_model: "openrouter/qwen3-max" },
      available: unavailable,
    })
    expect(exit._tag).toBe("Failure")
  })

  test("is inert without a budget", async () => {
    const exit = await run({ model, costUsd: 1_000_000, tokens: 10_000_000, available })
    expect(exit._tag).toBe("Success")
  })
})
