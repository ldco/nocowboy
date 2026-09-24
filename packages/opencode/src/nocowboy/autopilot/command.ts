import type { Command } from "@/command"
import AUTOPILOT from "./autopilot.txt"

/**
 * /autopilot [scope] — unattended roadmap runner.
 *
 * The command carries the conductor protocol. The autopilot goal itself is set
 * deterministically by `handleAutopilotCommand` in the command handler; this
 * template only tells the agent how to work each turn (worker -> reviewer ->
 * next item) and that the harness will resume it.
 */
export function autopilotCommand(): Command.Info {
  return {
    name: "autopilot",
    description: "Autopilot — run the roadmap to completion unattended (worker → reviewer → next), no human 'continue'",
    agent: "auto",
    template: AUTOPILOT,
    hints: ["$ARGUMENTS"],
  }
}
