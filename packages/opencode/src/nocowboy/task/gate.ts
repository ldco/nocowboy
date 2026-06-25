import { TaskRegistry } from "./registry"
import type { TaskStatus } from "./schema"

export const MAX_TASK_GATE_SUBAGENT_REACT = 2
export const MAX_TASK_GATE_MAIN_REACT = 3

export type GateMode = "subagent" | "main"

export type Decision =
  | { needReentry: false; capExceeded: false; incompleteTasks: [] }
  | { needReentry: true; reentryText: string; incompleteTasks: string[]; capExceeded: false }
  | { needReentry: false; capExceeded: true; incompleteTasks: string[] }

export interface DecideInput {
  session_id: string
  owner?: string
  reactCount: number
  maxReact: number
  mode: GateMode
}

function buildReentryText(
  incomplete: { id: string; status: string; summary: string }[],
  mode: GateMode,
): string {
  const headline =
    mode === "subagent"
      ? "You are about to finish, but these tasks you own are still unfinished:"
      : "You are about to finish, but these tasks in this session are still unfinished:"
  const closingLine =
    mode === "subagent"
      ? "Then re-emit your final message starting with the **Status**/**Summary** header."
      : "Then continue or respond."
  return [
    "<system-reminder>",
    headline,
    ...incomplete.map((t) => `- ${t.id} (${t.status}): ${t.summary}`),
    "For EACH: complete the work then `task done <id> <summary>`, or `task abandon <id> <reason>` if it is genuinely not needed.",
    closingLine,
    "</system-reminder>",
  ].join("\n")
}

export function decide(input: DecideInput): Decision {
  const tasks = TaskRegistry.list({
    session_id: input.session_id,
    owner: input.owner,
    include_terminal: false,
  })

  const actionable = tasks.filter((t) => t.status === "open" || t.status === "in_progress")

  if (actionable.length === 0) {
    return { needReentry: false, capExceeded: false, incompleteTasks: [] }
  }

  if (input.reactCount >= input.maxReact) {
    return {
      needReentry: false,
      capExceeded: true,
      incompleteTasks: actionable.map((t) => t.id),
    }
  }

  return {
    needReentry: true,
    capExceeded: false,
    reentryText: buildReentryText(actionable, input.mode),
    incompleteTasks: actionable.map((t) => t.id),
  }
}
