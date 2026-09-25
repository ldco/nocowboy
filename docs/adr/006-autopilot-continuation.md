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
- Token cost is bounded by the goal budget: `--max-turns` is the real autopilot
  budget and overrides the per-turn default cap (`AUTO_CONTINUE_MAX = 8`, used
  only when a goal supplies no budget); `/goal clear` (or Esc) stops it. Without
  this, "run the roadmap to the end" would truncate at eight turns and wait for a
  human. A custom scope defaults to `DEFAULT_MAX_TURNS` (20); the default roadmap
  scope is unbounded and ends on the roadmap signal plus the stall guard (see the
  amendment).
- The mechanism is a harness concern (the loop owns continuation); the agent only
  does the reasoning for one cycle. An agent alone cannot cross the turn boundary,
  which is why this lives in `runLoop` and not in a prompt.
- After a process restart the goal (including `auto`) is restored; the run resumes
  on the next message. Auto-resuming with *zero* input on launch is still not
  enabled — that remains the ADR-005 boundary.

## Amendment (2026-09-25): roadmap runs are unbounded and end deterministically

**Problem.** The default `/autopilot` was bounded at 20 turns (`DEFAULT_MAX_TURNS`)
and its completion was decided by the LLM judge, which only sees the transcript.
A long stage (e.g. R01 with nine verification directives) consumed the budget and
the run cleared its goal exactly at the R01 → R02 boundary. The judge could also
false-positive "met" while later roadmap items were still pending.

**Decision.**

- The default scope (the whole roadmap) is a **roadmap goal**: `GoalService`
  persists `roadmap: true` and `maxTurns: UNBOUNDED_MAX_TURNS`. That sentinel is
  a large number (`Number.MAX_SAFE_INTEGER`), not `0`, so a goal file written by
  this build is still read sanely by an older binary (`exhausted()` there is
  `react >= maxTurns`, and `0` would mean "already exhausted"). `isUnbounded` is
  `roadmap === true && maxTurns >= UNBOUNDED_MAX_TURNS`; `GoalService.exhausted`
  ignores the budget for it, so the run crosses every stage instead of truncating
  mid-roadmap. Status renders the budget as `∞`. A non-roadmap goal with a
  zero/non-positive budget keeps the historical meaning ("stop immediately").
- A roadmap goal ends **deterministically**: at each turn boundary `runLoop` reads
  `docs/roadmap.json` (`Autopilot.readRoadmap`) and stops when there are features
  and none are *actionable* — every item is terminal (`done`, `blocked`, or
  `abandoned`). The LLM judge is skipped when the roadmap is readable
  (`Autopilot.judgeRequired`), so a transcript-only verdict can never stop a run
  with pending items.
- A **custom** scope (`/autopilot <scope>`) keeps the judged, bounded behaviour
  (`DEFAULT_MAX_TURNS`, or `--max-turns N`), because there is no deterministic
  signal to trust. A roadmap goal whose roadmap cannot be read falls back to the
  judge plus the per-turn cap (`AUTO_CONTINUE_MAX`), so it cannot spin forever.
- The stall guard keys on the **actionable** roadmap items for a roadmap goal
  only; a custom judged goal keeps the old `in_progress` key so its own budget,
  not the roadmap, decides when it stops.
- `goal_set` preserves the existing `roadmap` flag and budget (like it already
  preserved `auto`), and ignores a non-positive `max_turns`, so a mid-run reset
  cannot silently downgrade a roadmap run to the bounded/judged mode.

**UX.** `[AUTOPILOT]` is a one-click toggle: in a new chat it creates the session
first, then starts the run — no scope dialog. A custom scope remains available
through the slash command.

## Amendment 2 (2026-09-25): autopilot is a mode, the roadmap is a target

**Problem.** The no-argument `/autopilot` *was* "finish the whole roadmap", so the
`[AUTOPILOT]` badge — labelled as a mode — silently hijacked the session into an
unbounded roadmap run every time it was pressed. Two concrete failures:

- The name lied. A user who wanted autopilot for the goal they already had got
  "implement all of docs/roadmap.json" instead.
- The toggle was destructive. `handleAutopilotCommand("")` called `GoalService.set`,
  which reset the condition, the budget and `react` to 0, so re-arming a live run
  (e.g. a stray click after navigating back from a subagent, where the subagent
  footer's "Parent" button sits over the badge) restarted it from the first turn.

**Decision — separate the two orthogonal concepts.**

- A **run** is a *target* (a goal) plus a *mode* (`manual` | `autopilot`).
  Autopilot is a property of the run, not a kind of run.
- `/roadmap [--max-turns N]` is the *target* "finish docs/roadmap.json": an
  unbounded, deterministic roadmap goal. It is what `/autopilot` with no argument
  used to be (`handleRoadmapCommand`).
- `/autopilot [scope] [--max-turns N]` is the *mode*: with no argument it arms the
  goal that is already active and changes **nothing else** — condition, budget and
  `react` are preserved (`GoalService.setAuto`, not `set`). A scope argument still
  starts a new custom goal under autopilot (the judged, bounded form).
- Sub-commands: `off`/`pause` disarms the mode but keeps the goal (a toggle is
  never destructive); `toggle` flips it; `clear`/`stop` clears the goal; `resume`
  re-arms without resetting.
- A goal command's `run` result may override the template's `$ARGUMENTS` with the
  real target (`{ kind: "run", arguments }`), so an arm-with-no-argument still
  tells the conductor what to work on instead of rendering an empty scope.
- UI: `[AUTOPILOT]` in a session is the mode toggle (OFF = pause, keeping the
  goal). "Finish the roadmap" is a separate, honestly labelled action — the
  prompt-bar `[FINISH ROADMAP ▶]` on the home screen (so the one-click-from-a-
  new-chat flow survives) and the `session.roadmap` command-palette entry. There
  is deliberately only one such control: the sidebar row added the same action
  again, overlapped the session title when the sidebar was open on the home
  screen, and was removed. The badge also ignores clicks for 250 ms after a route
  change, so the subagent footer's navigation mouse-up cannot re-dispatch onto it.
- Headless: `nocowboy run --autopilot` (no message) maps to `/roadmap`;
  `--autopilot "<scope>"` maps to `/autopilot <scope>` as before.

**Consequence.** The two features overlap by composition, not duplication: a
roadmap run is simply an autopilot run whose target is the roadmap. Nothing about
the continuation mechanism, the judge gate or the stall guard changes.


