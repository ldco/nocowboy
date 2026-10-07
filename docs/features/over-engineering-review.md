# Over-Engineering Review — /ponytail-review

> Roadmap id: `over-engineering-review` — status is tracked in `docs/roadmap.json`.

## Description
The 7-rung ladder says what NOT to write; `/ponytail-review` says what to REMOVE
from what is already written. Findings use one canonical line:

```
- [<category>] <target> — <suggestion>
```

`packages/opencode/src/nocowboy/review/over-engineering.ts` makes the review
machine-readable:

- `parseFindings(text)` extracts canonical findings and ignores everything else
  (headers, prose, malformed bullets). The category is free-form; suggestions
  like `duplication`, `dead-code`, `unnecessary-abstraction`,
  `premature-generalization`, `unneeded-dependency`, `over-configuration`,
  `over-engineering` are the documented set.
- `isSafetyInvariant(finding)` / `splitFindings` / `reviewOverEngineering`
  separate the **actionable** findings from the **protected** safety invariants
  (trust-boundary validation, data-loss handling, security/auth, sanitization,
  error handling, accessibility, atomicity/rollback). A review never proposes
  cutting safety — those findings are reported but not actionable.

The `/ponytail-review` command (`.nocowboy/command/ponytail-review.md`) produces
the findings. The `lazy-senior` rule already referenced `parseFindings` in this
path; it now exists.

## Key files
- `packages/opencode/src/nocowboy/review/over-engineering.ts`
- `packages/opencode/test/nocowboy/over-engineering-review.test.ts`

## Verification
- `bun test test/nocowboy/over-engineering-review.test.ts` — 7 pass (canonical
  parse, non-canonical ignored, safety findings protected).
- `bun run typecheck` — clean.
