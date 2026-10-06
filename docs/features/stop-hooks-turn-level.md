# Turn-level Stop Hooks — блокировка завершения turn до проверки

> Status: done (v0.12.0). Roadmap id: `stop-hooks-turn-level`.

## Description
A `session.stop` hook — a plugin hook, plus the built-in AC verification check —
can block a turn from ending by returning `{ continue: true, reason }`. The turn
then **really continues**: `runLoop` injects a synthetic user message and
retargets it so the next iteration runs. Before this change the hook only
incremented and logged a counter, so a blocked turn still ended. Consecutive
continuations are capped at 8 (Claude Code Stop-hook parity) and the streak
resets the moment a turn is allowed to end.

The generic unattended-run continuation remains under `autopilot-roadmap-runner`
(`goal.auto`); stop hooks are the deterministic quality-gate channel layered on
top. The `session.stop` contract is a JS hook `{ continue, reason }` — there is
no shell exit-code (0/1/2) mapping.

## Key files
- `packages/opencode/src/nocowboy/session/stop-hooks.ts`
- `packages/opencode/src/nocowboy/session/autopilot.ts`
- `packages/opencode/src/session/prompt.ts`
- `packages/opencode/test/nocowboy/stop-hooks.test.ts`
- `packages/opencode/test/nocowboy/session-prompt-queue.test.ts`

## Verification
- `bun test test/nocowboy/stop-hooks.test.ts` — 8 pass.
- `bun test test/nocowboy/session-prompt-queue.test.ts` — 13 pass (includes the
  "stop-hook continuation re-enters the loop" integration test).
- `bun run typecheck` — clean.
- File existence: `docs/features/stop-hooks-turn-level.md`.
