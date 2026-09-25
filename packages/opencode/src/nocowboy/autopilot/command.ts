import type { Command } from "@/command"
import AUTOPILOT from "./autopilot.txt"

/**
 * /autopilot [scope] — the unattended *mode*.
 *
 * The command carries the conductor protocol. The goal itself is set
 * deterministically by `handleAutopilotCommand` in the command handler; this
 * template only tells the agent how to work each turn (worker -> reviewer ->
 * next item) and that the harness will resume it. With no scope it arms the
 * goal that is already active; a scope starts a new custom goal.
 */
export function autopilotCommand(): Command.Info {
  return {
    name: "autopilot",
    description:
      "Autopilot — keep the current goal running unattended (worker → reviewer → next), no human 'continue'",
    agent: "auto",
    template: AUTOPILOT,
    hints: ["$ARGUMENTS"],
  }
}

/**
 * /roadmap [--max-turns N] — the *target* "finish the roadmap".
 *
 * Shares the conductor protocol with `/autopilot`; the difference is the goal
 * it records: `handleRoadmapCommand` sets an unbounded roadmap goal whose
 * completion is decided from docs/roadmap.json. This is the one-click
 * "finish everything" action, separated from the autopilot mode toggle.
 */
export function roadmapCommand(): Command.Info {
  return {
    name: "roadmap",
    description: "Finish the roadmap — unattended run to completion (worker → reviewer → next), no human 'continue'",
    agent: "auto",
    template: AUTOPILOT,
    hints: ["$ARGUMENTS"],
  }
}
