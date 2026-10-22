# Purge legacy PM3 names — PM4 validator, rulebook and knowledge cache

> Roadmap id: `purge-pm3-validator-names` — status is tracked in `docs/roadmap.json`.

## Problem

The puppetmaster MCP knowledge cache described the canonical rulebook as
`docs/contributing/pm-v3-style-rules.md` and the self-check as `npm run validate:pm3`,
while the same block was already labelled **PM4 RULES**. The source of truth — the
PuppetMaster4 repository (package name `puppetmaster-4`) — still carried inherited
PM3 names: `scripts/pm3-validator.mjs`, `validate:pm3`, `PM3_DB_PATH`, and the
v3-named rulebook. The cache was therefore accurate but stale in vocabulary, and a
plain delete inside NoCowboy would have produced a missing-command self-check.

## What changed

### NoCowboy (cache)

- `packaging/mcp-servers/puppetmaster/src/tools/knowledge.ts`: `pm-v3-style-rules.md`
  → `pm4-style-rules.md`, `validate:pm3` → `validate:pm4` (rules topic + compressed rules).
- A version-coupling comment documents that the cache expects a PM4 project with
  `validate:pm4`; older checkouts still answer the deprecated `validate:pm3` shim.
- `dist/` rebuilt through `tsc`.
- `packages/opencode/test/nocowboy/puppetmaster-mcp.test.ts` now asserts
  `toContain("validate:pm4")` and `not.toContain("validate:pm3" | "pm-v3")`.

### PuppetMaster4 (source of truth)

- `scripts/pm3-validator.mjs` → `scripts/pm4-validator.mjs`, `PM3_DB_PATH` → `PM4_DB_PATH`.
- `package.json`: `validate:pm4` / `validate:pm4:strict`; lint-staged points at the
  renamed validator; deprecated shim keeps `validate:pm3` working during rollout.
- `docs/contributing/pm-v3-style-rules.md` → `pm4-style-rules.md`;
  `v2-v3-token-mapping.md` → `v2-v4-token-mapping.md` (the document maps v2 → current).
- `tests/scripts/pm3-catalog-drift.test.ts` → `pm4-catalog-drift.test.ts`.
- Active references updated: AGENTS.md, README, eslint config, CI workflow, docs,
  `scripts/lib/*`, registry/headers comments.

Historical documents (`docs/features`, `docs/design-system/evidence`, `docs/legacy`,
`.nocowboy/plans`) are intentionally left untouched.

## Verification

- NoCowboy: `bun run typecheck` exit 0; quality ratchet 0; targeted tests 28 pass.
  Full `test/nocowboy` has 16 pre-existing flaky failures (the pristine run shows
  the same 16; the nine affected files pass in isolation).
- PuppetMaster4: `npm run validate:pm4` OK; `validate:pm3` shim OK; `npm run check`
  0 errors/0 warnings; `npm run lint` OK; full vitest 229/229 files, 1650 pass.
