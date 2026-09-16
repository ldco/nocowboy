# ADR-005: Durable, resumable long-horizon workflows

**Status:** Accepted (design). Implementation phased — see below.
**Date:** 2026-09-16
**Author:** NoCowboy Architect

## Context

We can already run long tasks: a goal agent loops turn → judge → repeat, subagents
run with watchdogs, and NUTAUSIK stores tasks, plans and logs. What we cannot do
is **survive a restart**: if the process dies half-way through a multi-step job,
the work is lost and the next session starts from zero.

### What exists today (verified)

| Piece | Where | Durable? |
|---|---|---|
| Goal loop (condition, max turns, judge) | `nocowboy/session/goal.ts` (`GoalService.set/get/clear/bumpReact`) | **No — in-memory Map keyed by sessionID.** Lost on restart. |
| Task with a goal and a plan string | NUTAUSIK `tasks.plan` | Yes (SQLite) |
| Plan step marked done | `nutausik_task_step` → `crud.reasoningStepAdd(..., 'action', "Step N completed")` → `reasoning_steps` | Yes (SQLite) |
| Task history | `task_logs` | Yes |
| "Plan complete" flag | computed as `!!task.plan` (`service/task.ts`) | Misleading — it means "a plan exists", not "all steps ran" |

So the **ledger half exists** (steps land in `reasoning_steps`, keyed by task slug)
and the **durable half exists** (NUTAUSIK over MCP, one store shared by every
instance). What is missing is the **read model** and the **resume driver**:

1. nothing answers "which steps of this plan are done, what is next, is it stuck?";
2. nothing resumes an interrupted plan after a restart;
3. an autonomous goal's condition and turn count are not persisted, so an
   unattended run cannot be picked up again.

## Decision

Durable workflows are built on the pieces we already have, in three layers.

### 1. Ledger — reuse `reasoning_steps` (no schema change)

A workflow is a NUTAUSIK task whose `plan` is the ordered step list. Step
completion is already recorded as a `reasoning_steps` row with `kind = action`
and content `Step <n> completed`. No new table, no migration: the ledger exists.

To make it unambiguous, new step writes use a stable, parseable message
(`Step <n> completed`) and the read model never depends on anything else.

### 2. Read model — `nutausik_task_progress` (new MCP tool)

Returns, for a task slug:

```
{ slug, status, total, completed, next, steps: [{ n, text, done }], complete }
```

`plan` is parsed as a JSON array when possible, otherwise as markdown list items;
completion is matched against `Step <n> completed` records. `next` is the lowest
step not yet done. `complete` is true only when every step is done — it replaces
the misleading `!!task.plan`.

### 3. Resume driver — harness

- **Interactive (shipped):** the `/resume` command asks NUTAUSIK for the
  interrupted task's progress and continues from `next`. Resuming is idempotent:
  a step already marked done is never re-run.
- **Autonomous (shipped, with a deliberate limit):** the goal (condition, turn
  budget, turns used) is now **persisted per session** at
  `<data>/goals/<sessionID>.json`, so it survives a restart. On the first turn
  after a restart the loop continues toward the goal and the user gets a
  one-line notice explaining why the session is still working.
  **Auto-continuing with no user message is deliberately NOT enabled** — it
  would spend tokens on launch with nobody watching. The loop resumes on the
  next message; `/goal clear` stops it.

## Why not a harness-local store

A JSON file next to the session would be simpler, but it would fragment state per
instance and per machine — the exact problem the NUTAUSIK project-routing work
just fixed. NUTAUSIK is already the durable, cross-instance store; workflows
belong there.

## Consequences

- No NUTAUSIK schema migration is needed — the ledger is a query over existing
  tables. That keeps the work small and the risk low.
- Step identity is positional (`Step <n>`). Reordering a plan invalidates
  completion marks; the read model therefore reports the plan text next to each
  step so a mismatch is visible rather than silent.
- The harness must treat "resume" as best-effort: if NUTAUSIK is unreachable the
  agent continues normally rather than failing (same degradation as today).

## Phased implementation

| Phase | Deliverable | Status |
|---|---|---|
| P1 | `nutausik_task_progress` tool in NUTAUSIK + tests | **Shipped** (NUTAUSIK 0.3.1): next/complete for no plan, partial, all done, markdown plan |
| P2 | `/resume` reads progress and continues from `next` | **Shipped**: `packaging/config/command/resume.md`, cross-linked from `/continue` |
| P3 | Persist the goal and resume it after a restart | **Shipped**: one file per session under `<data>/goals/`, restored on the next turn with a one-time notice. Auto-continue without a user message is intentionally off |

Phase P3 keeps one file per session rather than a shared store: several NoCowboy
instances run at once, and a shared file would let one clobber another's goal.
The goal is session-scoped, so it lives with the session — the workflow ledger
(task-scoped) stays in NUTAUSIK.
