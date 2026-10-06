# Built-in AC Verification Stop Hook

> Status: done (v0.12.0). Roadmap id: `ac-verification-hook`.

## Description
A built-in stop hook that verifies the acceptance state of the session's tasks
after every turn. When a session is running under an active goal
(`GoalService.get`) and the core task registry still holds `open`/`in_progress`
tasks, the hook requests another turn instead of letting the loop end. The
request goes through `StopHooks.decide` (turn-level stop hooks, capped at 8
consecutive continuations), which injects a real synthetic continuation.

The previous guard was `agent === "goal"` — dead code, because no agent is
registered under that name. It is replaced by the real autonomous signal (an
active goal) plus an internal-agent exclusion (`compaction`/`title`/`summary`),
so the hook is reachable for any work agent (`auto`, `worker`, …) while running
autonomously.

## Key files
- `packages/opencode/src/nocowboy/task/ac-verification-hook.ts`
- `packages/opencode/src/nocowboy/session/stop-hooks.ts`
- `packages/opencode/src/session/prompt.ts`
- `packages/opencode/test/nocowboy/ac-verification-hook.test.ts`

## Verification
- `bun test test/nocowboy/ac-verification-hook.test.ts` — 5 pass, including the
  `evaluate → StopHooks.decide → StopHooks.buildContinuation` chain that proves a
  failing check blocks the turn end and produces a synthetic continuation.
- `bun run typecheck` — clean.
- File existence: `docs/features/ac-verification-hook.md`.

## Data source note
The hook reads the core `TaskRegistry` (`~/.local/share/nocowboy/storage/nocowboy.db`).
No in-src module produces those tasks today (the task tool consumes NUTAUSIK
tasks), so when the registry is empty the check is a correct no-op. The decision
logic and the blocking wiring are what this item delivers.
