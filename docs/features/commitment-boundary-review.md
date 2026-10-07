# Commitment-Boundary Review — обязательное ревью перед deliverable

> Roadmap id: `commitment-boundary-review` — status is tracked in `docs/roadmap.json`.

## Description
At the boundary of every deliverable, a **fresh model** — not the one that led the
session — reads the diff from scratch and returns exactly one verdict:

```
VERDICT: ship        # correct, complete, safe to merge
VERDICT: fix-first   # close, but a specific problem must be fixed first
VERDICT: rethink     # the approach is wrong; do not merge as-is
```

`packages/opencode/src/nocowboy/review/commitment.ts` makes it a checkable gate:

- `parseCommitmentVerdict(text)` reads an explicit `VERDICT: …` line (or the first
  bare verdict), rejecting a report with no verdict (`undefined`).
- `checkCommitmentGate({ report, reviewer, author, allowSameModel })` **blocks**
  closing the deliverable when there is no verdict, and blocks when the reviewer
  model equals the author's (an independent boundary review is the point) unless
  explicitly allowed.
- `canCloseDeliverable(report)` — only `ship` closes; `fix-first`/`rethink` send
  the work back.

The `/commitment-review` command runs it. It builds on the review independence
policy (`review-model-independence`) for the "different model" guarantee.

## Key files
- `packages/opencode/src/nocowboy/review/commitment.ts`
- `packages/opencode/test/nocowboy/commitment-review.test.ts`

## Verification
- `bun test test/nocowboy/commitment-review.test.ts` — 9 pass (verdict parsing,
  gate mandatory + independence, only ship closes).
- `bun run typecheck` — clean.
