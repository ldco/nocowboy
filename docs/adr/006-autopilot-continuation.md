# ADR-006: Autopilot — opt-in unattended continuation

**Status:** Accepted
**Date:** 2026-09-24
**Author:** NoCowboy Auto
**Related:** ADR-005 (durable workflows), `docs/plans/autonomous-agent-loop.md`

## Context

ADR-005 P3 deliberately kept "auto-continue without a user message" off: a
session would otherwise spend tokens on launch with nobody watching. In practice
that means every long run still needs a human to press Enter after each turn —
the exact complaint autopilot is meant to fix.

## Decision

Unattended continuation is available **behind an explicit opt-in**, never as the
default:

- `GoalService` persists an `auto` flag next to the condition, budget and turn
  count (`<data>/goals/<sessionID>.json`). A goal set without `auto` stays manual.
- At the turn boundary — the model has stopped (`finish` not `tool-calls`), the
  goal was judged and is not met, the turn was not blocked — `SessionPrompt.runLoop`
  persists a **synthetic user message** (text part `synthetic: true`) and calls
  `NoCowboySessionPromptQueue.retarget`, so `scope()` keeps it and the next turn
  runs with no human "continue". Bounded by `AUTO_CONTINUE_MAX` (8) per turn and
  skipped when a newer prompt is already queued.
- The judge runs only at the turn boundary, against the fresh transcript, with a
  real language model (`provider.getLanguage`). If the judge model cannot be
  resolved, the continuation is suppressed and a warning is logged — a
  structural failure must not drive an unbounded run.
- `/autopilot [scope]` records the goal deterministically and runs the built-in
  conductor command (`nocowboy/autopilot/command.ts` + `autopilot.txt`, shipped
  with the code, agent `auto`), which drives one stage per turn: pick the next
  roadmap item → `task(worker)` → update `docs/roadmap.json` → `task(reviewer)` →
  gate → mark done or block → stop the turn.

### Review gate — the roadmap reviews with the code

A stage is not finished until a read-only reviewer confirms **both** the feature
(acceptance criteria met, proving tests actually run green) **and** that the
roadmap is current for it (status matches reality, `bun run
scripts/verify-roadmap.ts` passes, no stale or false `done`). The next stage does
not start before that gate passes; a failure re-runs the worker with the
reviewer's concerns. This keeps `docs/roadmap.json` up to date as a first-class
deliverable of every stage, not an afterthought.

The gate is also applied deterministically at the harness level: before each
continuation `SessionPrompt.runLoop` reads the project roadmap
(`Autopilot.readInProgress` → `docs/roadmap.json`, best-effort — a missing file
degrades to "none"). If any feature is `in_progress`, the injected step says to
finish and get that stage reviewed **before starting another item**; otherwise it
says to start the next planned item as a full stage. So "do not start the next
stage until the current one is confirmed" is re-asserted on every auto-resume,
not only in the command prompt.
- `/goal --auto` and `goal_set(auto: true)` expose the same mode directly.

## Consequences

- A manual `/goal` behaves exactly as before; only an explicit autopilot run
  continues on its own.
- Token cost is bounded by the goal budget: `--max-turns` (default 20) is the
  real autopilot budget and overrides the per-turn default cap
  (`AUTO_CONTINUE_MAX = 8`, used only when a goal supplies no budget); `/goal
  clear` (or Esc) stops it. Without this, "run the roadmap to the end" would
  truncate at eight turns and wait for a human.
- The mechanism is a harness concern (the loop owns continuation); the agent only
  does the reasoning for one cycle. An agent alone cannot cross the turn boundary,
  which is why this lives in `runLoop` and not in a prompt.
- After a process restart the goal (including `auto`) is restored; the run resumes
  on the next message. Auto-resuming with *zero* input on launch is still not
  enabled — that remains the ADR-005 boundary.
