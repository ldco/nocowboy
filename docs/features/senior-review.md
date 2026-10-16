# Senior Review v5 — /ponytail-review, /ponytail-audit, /ponytail-debt

> Roadmap id: `senior-review` — status is tracked in `docs/roadmap.json`.

## Description

`/ponytail-review` (`over-engineering.ts`) answers "what should we REMOVE?".
A senior engineer paged at 3am also asks "what breaks, how do we fix it, and
what happens if we don't" — reading the code the change *touches*, not just the
diff. This module is that second reading.

`packages/opencode/src/nocowboy/review/senior-review.ts` (pure — no engine, no
filesystem):

- `SENIOR_REVIEW_CATEGORIES` — `bug`, `security`, `correctness`, `performance`,
  `slow-path`, `missing-test`, `risk` plus the over-engineering set.
- `parseSeniorFindings(text)` — reuses the proven canonical parser from
  `over-engineering.ts`, then splits an optional `priority:category` tag
  (`- [must-fix:security] src/auth.ts — ...`). A bare `- [bug] ...` line is
  accepted and its priority inferred. `rankSeniorFindings` / `reviewAsSenior`
  order must-fix → should-fix → nit.
- `reviewScope({ changedFiles, provider })` — the change's touched files: changed
  plus their nearest importers (a thin, named seam over `selectDeepContext`).
  The graph stays optional; no provider degrades to diff-only.
- `extractShortcuts(file, content)` / `formatDebtLedger(entries)` — the
  `shortcut:` ledger so "later" does not become "never".

Commands (`.nocowboy/command/`): `/ponytail-review` (widened to the senior
semantics), `/ponytail-audit` (whole-repo, ranked "fix this first"), and
`/ponytail-debt` (the ledger).

Safety: over-engineering findings that touch a safety invariant are protected by
`splitFindings`. A *senior* `security` finding is the opposite — a bug to FIX —
so it is never run through that filter.

## Key files

- `packages/opencode/src/nocowboy/review/senior-review.ts`
- `packages/opencode/src/nocowboy/review/over-engineering.ts`
- `.nocowboy/command/ponytail-review.md`
- `.nocowboy/command/ponytail-audit.md`
- `.nocowboy/command/ponytail-debt.md`
- `packages/opencode/test/nocowboy/senior-review.test.ts`

## Verification

- `bun test test/nocowboy/senior-review.test.ts` — parse (priority:category +
  inference), rank, reviewScope (provider / no provider / throwing provider),
  shortcut ledger.
- `bun run typecheck` — clean.
