/**
 * Headless autopilot — resolve `nocowboy run` flags into a session command.
 *
 * The TUI autopilot is the built-in `/autopilot` command under the `auto` agent
 * plus the harness auto-continue. In headless mode the same command is sent over
 * the session command API, so CI can run a whole roadmap unattended:
 *
 *   nocowboy run --autopilot "<scope>" --max-turns 20
 *   nocowboy run --agent goal "<scope>" --max-turns 20
 *
 * This module is pure so the flag matrix is unit-testable.
 */

export type RunCommand = {
  /** The command name to send (undefined = a normal prompt, not a command). */
  command?: string
  /** The agent override. `undefined` lets the command's own agent apply. */
  agent?: string
  /** The arguments/message forwarded to the command. */
  arguments: string
}

export function resolveRunCommand(input: {
  command?: string
  agent?: string
  autopilot?: boolean
  maxTurns?: number
  /** Resuming a session (`--continue`/`--session`) with no message. */
  resume?: boolean
  message: string
}): { ok: true; value: RunCommand } | { ok: false; error: string } {
  const agentGoalAlias = input.agent === "goal"
  const autopilot = Boolean(input.autopilot) || agentGoalAlias

  if (autopilot && input.command && input.command !== "autopilot") {
    return { ok: false, error: "--autopilot cannot be combined with --command" }
  }

  // Resuming with no message continues an interrupted autopilot run instead of
  // erroring — the run resumes on its own with no typed "continue".
  if (!input.command && !autopilot && input.resume && !input.message.trim()) {
    return { ok: true, value: { command: "autopilot", agent: undefined, arguments: "resume" } }
  }

  const command = autopilot ? "autopilot" : input.command
  // `--agent goal` is the documented alias for the autopilot run; the command
  // itself pins the agent to `auto`, so the pseudo-agent is dropped here.
  const agent = agentGoalAlias ? undefined : input.agent

  const args =
    autopilot && input.maxTurns !== undefined
      ? `${input.message}${input.message.trim() ? " " : ""}--max-turns ${input.maxTurns}`.trim()
      : input.message

  return { ok: true, value: { command, agent, arguments: args } }
}
