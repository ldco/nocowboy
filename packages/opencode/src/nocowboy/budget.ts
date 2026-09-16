/**
 * Per-session cost governance.
 *
 * The session row already tracks cumulative cost and tokens, so a budget can be
 * enforced without extra bookkeeping: before a turn starts, compare what the
 * session has spent against the configured caps and either warn, swap in a
 * cheaper model, or refuse to continue.
 *
 * Everything is configuration-driven (`budget` in the config).
 */

import { Schema } from "effect"
import { NamedError } from "@nocowboy/core/util/error"

export interface BudgetConfig {
  /** Hard cap on the session's cumulative spend, in USD. */
  max_cost_usd?: number
  /** Hard cap on the session's cumulative tokens (input + output). */
  max_tokens?: number
  /** Warn once this percent of a cap is used. Default 80. */
  warn_at_percent?: number
  /** What to do once a cap is reached. Default "abort". */
  on_exceed?: "abort" | "downgrade"
  /** `provider/model` to switch to when `on_exceed` is "downgrade". */
  downgrade_model?: string
}

export type BudgetStatus = "ok" | "warn" | "exceeded"
export type BudgetKind = "cost" | "tokens"

export interface BudgetEvaluation {
  status: BudgetStatus
  /** Which cap is closest to (or past) its limit. */
  kind?: BudgetKind
  spent: number
  limit: number
  /** Used percent of the tightest cap. */
  percent: number
}

const EMPTY: BudgetEvaluation = { status: "ok", spent: 0, limit: 0, percent: 0 }

/**
 * Evaluate the tightest applicable cap. A budget with no usable limits is inert.
 */
export function evaluateBudget(input: {
  costUsd: number
  tokens: number
  budget?: BudgetConfig
}): BudgetEvaluation {
  const budget = input.budget
  if (!budget) return EMPTY

  const checks: Array<{ kind: BudgetKind; spent: number; limit: number }> = []
  if (budget.max_cost_usd !== undefined && budget.max_cost_usd > 0) {
    checks.push({ kind: "cost", spent: input.costUsd, limit: budget.max_cost_usd })
  }
  if (budget.max_tokens !== undefined && budget.max_tokens > 0) {
    checks.push({ kind: "tokens", spent: input.tokens, limit: budget.max_tokens })
  }
  if (checks.length === 0) return EMPTY

  const warnAt = budget.warn_at_percent ?? 80
  const percentOf = (c: (typeof checks)[number]) => (c.spent / c.limit) * 100

  let worst = checks[0]!
  let worstPercent = percentOf(worst)
  for (const check of checks) {
    const percent = percentOf(check)
    if (percent > worstPercent) {
      worst = check
      worstPercent = percent
    }
  }

  const status: BudgetStatus = worstPercent >= 100 ? "exceeded" : worstPercent >= warnAt ? "warn" : "ok"
  return { status, kind: worst.kind, spent: worst.spent, limit: worst.limit, percent: worstPercent }
}

export type BudgetDecision = "allow" | "warn" | "downgrade" | "abort"

/** Map an evaluation plus the configured policy to the action to take. */
export function decideBudget(evaluation: BudgetEvaluation, budget?: BudgetConfig): BudgetDecision {
  if (evaluation.status === "ok") return "allow"
  if (evaluation.status === "warn") return "warn"
  if (budget?.on_exceed === "downgrade" && budget.downgrade_model) return "downgrade"
  return "abort"
}

export const BudgetExceededError = NamedError.create("BudgetExceededError", {
  message: Schema.String,
  kind: Schema.String,
  spent: Schema.Finite,
  limit: Schema.Finite,
})

/** Human-readable explanation used in the error and in warnings. */
export function describeBudget(evaluation: BudgetEvaluation, budget?: BudgetConfig): string {
  const unit = evaluation.kind === "cost" ? "USD" : "tokens"
  const limit = evaluation.kind === "cost" ? evaluation.limit.toFixed(2) : String(Math.round(evaluation.limit))
  const spent = evaluation.kind === "cost" ? evaluation.spent.toFixed(2) : String(Math.round(evaluation.spent))
  const where = budget?.downgrade_model ? ` Set a smaller model, raise the cap, or start a new session.` : ` Raise the cap or start a new session.`
  return `Session budget exceeded: ${spent} of ${limit} ${unit} used (${Math.round(evaluation.percent)}%).${where}`
}
