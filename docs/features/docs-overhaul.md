# Documentation consolidation — code-verified English README, repaired docs index, refreshed known-issues

> Roadmap id: `docs-overhaul` — status tracked in `docs/roadmap.json`.

## Description

The documentation had drifted from the code: the root `README.md` advertised
`1.0.7-alpha` and Status `v0.7.4` while the real package version is `1.3.1`, the
docs index linked files that no longer exist, and `known-issues.md` described a
`v0.11.0-alpha` snapshot from 2026-08-04. This item re-grounds the documentation
in the actual runtime.

- **`README.md`** — rewritten from scratch in English: identity/philosophy,
  "Why NoCowboy" (zero Electron bloat, reactive SolidJS+OpenTUI state, native
  subprocess tooling, context pruning & cost control), architecture diagram +
  responsibility zones, prerequisites/install, configuration & environment,
  command reference, extensibility & tool authoring. Every command, flag, path,
  keybind and config key was verified against source.
- **`docs/README.md`** — index rebuilt against the real tree; dead links removed
  (`dogfooding-workflow.md` → `docs/archive/`, `plans/roadmap-verification-system.md`
  → deleted).
- **`docs/known-issues.md`** — gate-based truth + the three roadmap `blocked`
  areas (Turso, vector-store-switcher, Obsidian) replace the stale snapshot.

A local review pass caught two documented-command inaccuracies (the `build`
script builds the fixed release targets, not "the current platform"; the
`release` binary install is Linux-only) — both fixed before commit.

## Key files

- `README.md`
- `docs/README.md`
- `docs/known-issues.md`
- `docs/releases/1.4.0.md`

## Verification

- Commit: `7702ccc943` "docs: rewrite the README in English, repair docs index
  and known-issues".
- Gates: `docs:check` in sync, `ownership --check-staged` 3/3 classified,
  `verify-roadmap` green, `check-md-table-padding` clean.
