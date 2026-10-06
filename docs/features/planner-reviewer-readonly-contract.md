# Контракт read-only planner/reviewer — реальное ограничение

> Roadmap id: `planner-reviewer-readonly-contract` — status is tracked in `docs/roadmap.json`.

## Description
The planner and reviewer agents were nominally read-only but carried no deny
rules, so `defaults`' `"*": "allow"` let them mutate. They now carry a real
ceiling built into their agent profiles:

- **All edit-family tools** (`edit`, `write`, `apply_patch`, `search_replace` —
  they all ask under the `edit` permission) are denied: `edit: { "*": "deny" }`.
- **Shell mutations** are denied. Planner uses `readOnlyBash` (a strict
  allowlist, same as architect). Reviewer uses a new `mutatingBash` denylist
  (filesystem, git history, dependency installers, spaced `>`/`>>`) instead of an
  allowlist — a strict allowlist would also block the verification commands a
  reviewer exists to run, so read/test/build commands keep working.

The ceiling rules are placed **last** in `Permission.merge`, so they win over
`defaults` and global `user` config. They are ceilings in the `hardRuleset`,
which means:

- **YOLO** (`permission: { "*": { "*": "allow" } }`) lifts them — `allowEverything`
  is consulted before the hard-ruleset veto;
- **explicit per-agent config** (`agent.planner.permission`) merges later in
  `agent.ts` and can lift them.

These two are the only opt-outs. External-directory safety and config-path
protection are absolute (unaffected by YOLO).

## Key files
- `packages/opencode/src/nocowboy/agent/index.ts`
- `packages/opencode/test/nocowboy/agent-readonly.test.ts`
- `packages/opencode/test/nocowboy/server/permission-allow-everything.test.ts`

## Verification
- `bun test test/nocowboy/agent-readonly.test.ts` — 5 pass (planner/reviewer deny
  edit + mutating bash, allow read/verify; architect regression; worker control;
  explicit config lifts the ceiling).
- `bun test test/nocowboy/server/permission-allow-everything.test.ts` — YOLO
  lifts an agent/read-only deny, YOLO still honours the external-directory veto
  and config-path protection.
- `bun run typecheck` — clean.
