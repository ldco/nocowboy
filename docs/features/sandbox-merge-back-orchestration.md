# Sandbox orchestration — branch strategy + merge-back + iteration loop

> Roadmap id: `sandbox-merge-back-orchestration` — status is tracked in `docs/roadmap.json`.

## Description

Sandcastle orchestrates *external CLI agents* in sandboxes; our agents are
in-process, so its agent-spawning half is inapplicable and container isolation is
out of scope. The one portable idea is **pure git orchestration**: pick a branch
strategy, remember where a sandbox branched from, run N iterations, then merge
back.

`packages/opencode/src/nocowboy/orchestration.ts` is a pure planner — it returns
the git steps to run and parses git's output; it never spawns a process:

- `SANDBOX_BRANCH_PREFIX`, `isSandboxBranch`, `makeSandboxBranch` (sanitizes the
  session id so it can never forge a nested/invalid ref).
- `planStart` — branch off the base **and record it** in
  `branch.<name>.nocowboyBase` (git-native, survives processes). This is the
  key idea taken from Sandcastle: a `-b` branch or a detached worktree has no
  memory of its base, so merge-back has none unless we write one down.
- `planMergeBack({ strategy })` — `head`/`branch` are no-ops; `merge-to-head`
  checks out the base, `merge --no-ff --no-edit`, deletes the sandbox.
- `planAbort`, `readBaseBranch` (recorded key → git tracking config → unknown),
  `parseMergeOutput` (`merged | up-to-date | conflict | failed` + conflicted
  files), and `runIterations` (sequential loop with a `done()` early stop).

`packages/opencode/src/nocowboy/sandbox-diff.ts` (`DiffSandbox`) is rewritten on
top of the planner and now **records** the base branch at `start()` and reads it
back in `diff`/`apply`/`abort`. Previously it recovered the base from
`branch.<name>.merge`, a key `git checkout -b` never sets, so merge-back always
fell back to `main` — a merge into the wrong branch.

## Key files

- `packages/opencode/src/nocowboy/orchestration.ts`
- `packages/opencode/src/nocowboy/sandbox-diff.ts`
- `packages/opencode/test/nocowboy/orchestration.test.ts`

## Verification

- `bun test test/nocowboy/orchestration.test.ts` — branch identity, plans,
  base-branch resolution, merge-output parsing, iteration loop.
- `bun run typecheck` — clean.
