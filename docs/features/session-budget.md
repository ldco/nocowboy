# Session budget (cost governance)

A per-session cap on spend and tokens, enforced before each turn.

## Configuration

```json
{
  "budget": {
    "max_cost_usd": 5,
    "max_tokens": 500000,
    "warn_at_percent": 80,
    "on_exceed": "downgrade",
    "downgrade_model": "deepseek/deepseek-v4-flash"
  }
}
```

| Field | Meaning |
| --- | --- |
| `max_cost_usd` | Hard cap on the session's cumulative cost, in USD |
| `max_tokens` | Hard cap on the session's cumulative tokens (input + output + reasoning) |
| `warn_at_percent` | Warn once this percent of a cap is used (default 80) |
| `on_exceed` | `"abort"` (default) or `"downgrade"` |
| `downgrade_model` | `provider/model` used when `on_exceed` is `"downgrade"` |

Either cap can be set alone; the **tightest** cap decides the status. A budget
with no positive limit is inert, so an empty `budget` object changes nothing.

## Behaviour

The session row already carries cumulative `cost` and token counts, so the check
runs once per turn, before the model is used:

- **ok** — the resolved model is used as-is;
- **warn** (≥ `warn_at_percent`) — the turn proceeds, a warning is logged;
- **exceeded** — either the resolved model is swapped for `downgrade_model`
  (when available) and the turn proceeds on the cheaper model, or the turn fails
  with a `BudgetExceededError` whose message names the binding cap, the spend and
  the limit.

If `on_exceed` is `"downgrade"` but no `downgrade_model` is configured, or the
target model is unavailable, the turn aborts rather than silently overspending.

## Scope

Enforced on the main user-turn path (`SessionPrompt.createUserMessage`). The
user-run shell continuation path resolves its model separately and is not yet
budget-checked.

## Files

- `packages/opencode/src/nocowboy/budget.ts` — pure evaluator + policy
- `packages/opencode/src/nocowboy/session/prompt.ts` — `applyBudget`
- `packages/opencode/src/session/prompt.ts` — the per-turn call site
- `packages/opencode/src/config/config.ts` — the `budget` schema
- `packages/opencode/test/nocowboy/budget.test.ts`,
  `packages/opencode/test/nocowboy/budget-apply.test.ts`
