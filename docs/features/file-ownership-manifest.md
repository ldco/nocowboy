# Ownership-манифест: owned / adapted / generated

> Roadmap id: `file-ownership-manifest` — status is tracked in `docs/roadmap.json`.

## Description
`ownership-manifest.json` classifies every path in the tree into **owned**,
**adapted** or **generated**, so the fork can reason about what it authored
versus what it carries from upstream. It is generated from the pure classifier
`packages/opencode/src/nocowboy/ownership/manifest.ts` and verified by
`scripts/ownership-manifest.ts`.

The key decision: **ownership is not "anything under `src/nocowboy`"**. NoCowboy
logic is invoked from shared-core upstream files, and the manifest records those
call sites (`session/prompt.ts`, `session/processor.ts`, `session/system.ts`,
`tool/task.ts`, `tool/registry.ts`, `permission/index.ts`, `agent/agent.ts`). The
validator requires each to classify as `adapted`, so the manifest cannot pretend
the shared core is owned.

Classification priority is `generated > owned > adapted`; a path matching no
pattern is `unclassified`.

The pre-commit gate (`.husky/pre-commit`) runs `--check` (manifest in sync and
valid) and `--check-staged` (every staged path carries a class), so a new file
cannot land unclassified.

## Key files
- `ownership-manifest.json`
- `packages/opencode/src/nocowboy/ownership/manifest.ts`
- `scripts/ownership-manifest.ts`
- `docs/reference/ownership-manifest.md`
- `.husky/pre-commit`

## Verification
- `bun run scripts/ownership-manifest.ts --check` — in sync.
- `bun test test/nocowboy/ownership-manifest.test.ts` — 12 pass (classes,
  call-sites, glob semantics, gate).
- `bun run typecheck` — clean.
