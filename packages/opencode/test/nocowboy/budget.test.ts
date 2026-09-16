import { describe, expect, test } from "bun:test"
import { decideBudget, describeBudget, evaluateBudget } from "../../src/nocowboy/budget"

describe("evaluateBudget", () => {
  test("is inert without a budget or without usable limits", () => {
    expect(evaluateBudget({ costUsd: 10, tokens: 1_000_000 }).status).toBe("ok")
    expect(evaluateBudget({ costUsd: 10, tokens: 1_000_000, budget: {} }).status).toBe("ok")
    // Non-positive limits are not caps.
    expect(evaluateBudget({ costUsd: 10, tokens: 10, budget: { max_cost_usd: 0 } }).status).toBe("ok")
  })

  test("reports ok, warn and exceeded for the cost cap", () => {
    const budget = { max_cost_usd: 10, warn_at_percent: 80 }
    expect(evaluateBudget({ costUsd: 1, tokens: 0, budget }).status).toBe("ok")
    expect(evaluateBudget({ costUsd: 8.5, tokens: 0, budget }).status).toBe("warn")
    expect(evaluateBudget({ costUsd: 10, tokens: 0, budget }).status).toBe("exceeded")
    expect(evaluateBudget({ costUsd: 42, tokens: 0, budget }).status).toBe("exceeded")
  })

  test("tracks tokens independently of cost", () => {
    const budget = { max_tokens: 1000 }
    const result = evaluateBudget({ costUsd: 999, tokens: 1200, budget })
    expect(result.status).toBe("exceeded")
    expect(result.kind).toBe("tokens")
    expect(result.limit).toBe(1000)
  })

  test("uses the tightest of several caps", () => {
    // Cost is at 50%, tokens at 90% -> tokens is the binding cap.
    const result = evaluateBudget({ costUsd: 5, tokens: 90, budget: { max_cost_usd: 10, max_tokens: 100 } })
    expect(result.kind).toBe("tokens")
    expect(result.percent).toBeCloseTo(90)
    expect(result.status).toBe("warn")
  })

  test("honours a custom warn threshold", () => {
    expect(evaluateBudget({ costUsd: 5, tokens: 0, budget: { max_cost_usd: 10, warn_at_percent: 50 } }).status).toBe("warn")
    expect(evaluateBudget({ costUsd: 5, tokens: 0, budget: { max_cost_usd: 10, warn_at_percent: 90 } }).status).toBe("ok")
  })

  test("defaults the warn threshold to 80 percent", () => {
    expect(evaluateBudget({ costUsd: 7.9, tokens: 0, budget: { max_cost_usd: 10 } }).status).toBe("ok")
    expect(evaluateBudget({ costUsd: 8, tokens: 0, budget: { max_cost_usd: 10 } }).status).toBe("warn")
  })
})

describe("decideBudget", () => {
  const exceeded = evaluateBudget({ costUsd: 20, tokens: 0, budget: { max_cost_usd: 10 } })

  test("allows and warns", () => {
    expect(decideBudget(evaluateBudget({ costUsd: 0, tokens: 0, budget: { max_cost_usd: 10 } }), { max_cost_usd: 10 })).toBe("allow")
    expect(decideBudget(evaluateBudget({ costUsd: 9, tokens: 0, budget: { max_cost_usd: 10 } }), { max_cost_usd: 10 })).toBe("warn")
  })

  test("aborts by default when exceeded", () => {
    expect(decideBudget(exceeded, { max_cost_usd: 10 })).toBe("abort")
    expect(decideBudget(exceeded, undefined)).toBe("abort")
  })

  test("downgrades only when a target model is configured", () => {
    expect(decideBudget(exceeded, { max_cost_usd: 10, on_exceed: "downgrade" })).toBe("abort")
    expect(decideBudget(exceeded, { max_cost_usd: 10, on_exceed: "downgrade", downgrade_model: "deepseek/deepseek-v4-flash" })).toBe("downgrade")
  })

  test("an explicit abort policy wins over a configured target", () => {
    expect(decideBudget(exceeded, { max_cost_usd: 10, on_exceed: "abort", downgrade_model: "x/y" })).toBe("abort")
  })
})

describe("describeBudget", () => {
  test("names the binding unit and the numbers", () => {
    const cost = evaluateBudget({ costUsd: 12.345, tokens: 0, budget: { max_cost_usd: 10 } })
    expect(describeBudget(cost, { max_cost_usd: 10 })).toContain("12.35 of 10.00 USD")
    const tokens = evaluateBudget({ costUsd: 0, tokens: 1500, budget: { max_tokens: 1000 } })
    expect(describeBudget(tokens, { max_tokens: 1000 })).toContain("1500 of 1000 tokens")
  })
})
