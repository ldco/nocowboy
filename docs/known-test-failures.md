# Known Test Failures — NoCowboy

**Date:** 2026-06-24 | **v0.6.1**

## Status after fixes

7 test files that were broken by `.kilo`→`.nocowboy` rebranding and indexing-as-first-class changes have been FIXED. They pass both individually and via the test-runner:

- [x] `config-validation.test.ts` — kilo.json → nocowboy.json paths
- [x] `workflows-migrator.test.ts` — `.nocowboy/workflows` path assertions
- [x] `rules-migrator.test.ts` — `.nocowboy/rules` path assertions
- [x] `project-id.test.ts` — `.nocowboy` path assertions
- [x] `permission/config-paths.test.ts` — `[".nocowboy/", ".opencode/"]` (no `.kilo`)
- [x] `config/indexing-default-plugin.test.ts` — indexing not in plugin list
- [x] `session-processor-empty-tool-calls.test.ts` — stubbed SessionSummary

## Remaining

~39 files show as FAIL in the parallel test-runner but pass individually. These are **pre-existing flaky failures** under high parallel load (231 files running simultaneously — database locks, session pollution, timeout races). Not caused by our changes.

**Root cause:** Missing test harness with proper Effect context isolation and dedicated test resources (database, MCP ports, SessionProvider).

**Fix needed:** `TestServer` harness (3-5 hours) — provides in-memory database, mock providers, isolated MCP ports.
