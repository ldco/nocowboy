# Политика независимости модели reviewer

> Roadmap id: `review-model-independence` — status is tracked in `docs/roadmap.json`.

## Description
A review is only as independent as the model performing it. The cross-model review
cascade (`packages/opencode/src/nocowboy/review/cascade.ts`) now enforces that as a
checkable policy rather than a convention:

- **Phase 2 never reuses the author implicitly.** Previously an unset
  `second_phase` silently defaulted to the author's model. Now the second phase is
  set only by explicit config: a third `provider/model`, the literal
  `second_phase: "author"` (an explicit opt-in), or `off`/`none`. Unset means no
  second phase.
- **`diagnoseReviewIndependence({ author, resolution })`** reports the two ways
  independence can be broken:
  - `reviewer-matches-author` — the phase-1 reviewer model equals the author's
    (the worker), i.e. a reviewer config that matches the worker;
  - `second-phase-matches-author` — phase 2 reuses the author (explicit opt-in).

The reviewer spawn (`nocowboy/tool/task.ts`) logs these warnings, so a
non-independent reviewer configuration is visible instead of silent.

## Key files
- `packages/opencode/src/nocowboy/review/cascade.ts`
- `packages/opencode/src/nocowboy/tool/task.ts`
- `packages/opencode/test/nocowboy/review-cascade.test.ts`

## Verification
- `bun test test/nocowboy/review-cascade.test.ts` — 15 pass (no implicit author
  second phase; diagnostics for reviewer==author and explicit author reuse).
- `bun run typecheck` — clean.
