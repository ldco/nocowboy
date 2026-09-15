# Cross-model review cascade

The reviewer agent can be pointed at a model that is **different from the model
that wrote the code**, and can optionally run a **second review phase** where
another model verifies the first review.

Two problems this solves:

1. A model reviewing its own family's output shares that family's blind spots.
   A different family is more likely to catch a mistake the author made.
2. A single reviewer can be confidently wrong. A second, independent pass — by a
   third model or by the author's model — catches over-claims and misses.

## Configuration

Everything is configuration-driven. Nothing is hardcoded.

```json
{
  "review": {
    "cascade": {
      "enabled": true,
      "map": {
        "deepseek": "openrouter/qwen3-max",
        "qwen": "deepseek/deepseek-v4-pro"
      },
      "second_phase": "author"
    }
  }
}
```

- `enabled` — master switch. When absent or `false` the reviewer uses its normal
  configured model and behaviour is unchanged.
- `map` — author-family keyword → reviewer model (`provider/model`). The keyword
  is matched case-insensitively against the author's `providerID modelID`, so
  `deepseek` matches the `deepseek` provider and `qwen` matches a `qwen` model
  served through any provider.
- `second_phase` — model for phase 2:
  - `"author"` (or omitted) — the model that wrote the code reviews the reviewer;
  - a `provider/model` id — a third model performs phase 2;
  - `"off"` / `"none"` — no second phase.

If the author's family is not in `map`, the cascade does nothing and the
reviewer falls back to its normal model.

## Behaviour

- Phase 1 runs the reviewer on the mapped model.
- Phase 2 (when configured and different from phase 1) runs the reviewer again
  with the first review embedded in the prompt, asking for independent
  verification. The task result contains both phases, labelled with their
  models.
- If phase 2 fails for any reason (model unavailable, provider error) the result
  degrades to the phase-1 review instead of failing the task.
- Availability is checked against the provider registry; an unavailable phase-1
  model falls through the normal candidate chain (saved → agent → fallback →
  parent).

## Cost

A second phase roughly doubles review tokens. Review is a small fraction of a
task's total token spend (generation dominates), so the absolute cost increase
is modest. For the trade-off analysis see
`docs/analysis/review-cascade-concept.md`.

## Files

- `packages/opencode/src/nocowboy/review/cascade.ts` — the pure resolver.
- `packages/opencode/src/nocowboy/tool/task.ts` — phase-1 model choice.
- `packages/opencode/src/tool/task.ts` — phase-2 orchestration.
- `packages/opencode/src/config/config.ts` — the `review.cascade` schema.
