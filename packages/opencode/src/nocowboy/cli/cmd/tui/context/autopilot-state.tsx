import { createSignal } from "solid-js"

// Module-level signal (same pattern as sidebar-state). Autopilot "armed" mode:
// while ON, a plain prompt is routed through the built-in autopilot command, so
// the session runs the roadmap unattended (worker → reviewer gate → next) until
// the goal is met or the turn budget is spent.
export const [autopilotArmed, setAutopilotArmed] = createSignal(false)

export function toggleAutopilot(): boolean {
  const next = !autopilotArmed()
  setAutopilotArmed(next)
  return next
}

/** True when a plain (non-slash) prompt should be submitted as an autopilot run. */
export function shouldRunAsAutopilot(input: string): boolean {
  if (!autopilotArmed()) return false
  const trimmed = input.trim()
  return trimmed.length > 0 && !trimmed.startsWith("/")
}
