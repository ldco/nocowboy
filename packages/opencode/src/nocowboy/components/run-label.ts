/**
 * Mode badge label.
 *
 * The badge answers only "which mode is this session in and is it armed":
 *  - `[AUTOPILOT]`      — no goal
 *  - `[ROADMAP ▶]`      — a roadmap run, armed
 *  - `[ROADMAP ⏸]`      — a roadmap run, paused
 *  - `[AUTOPILOT ▶]`    — a custom goal, armed (paused → ⏸)
 *
 * The *step* and *progress* are deliberately not inlined here: a long badge
 * crowds the prompt bar. They live in the sidebar's "Roadmap" section, which
 * lists the remaining steps and shows `done/total` (see `sidebar-roadmap.tsx`).
 * Kept free of TUI imports so it can be unit-tested on its own.
 */
export function runLabel(
  goal:
    | {
        auto: boolean
        roadmap?: boolean
      }
    | undefined,
): string {
  if (!goal) return "[AUTOPILOT]"
  const mode = goal.roadmap === true ? "ROADMAP" : "AUTOPILOT"
  return `[${mode} ${goal.auto ? "▶" : "⏸"}]`
}
