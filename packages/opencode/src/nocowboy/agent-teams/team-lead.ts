/**
 * Team Lead — multi-agent orchestrator.
 *
 * The lead creates a team, breaks a goal into shared tasks, and coordinates
 * teammates via the shared task list and inter-agent mailbox. Teammates
 * self-claim tasks; the lead monitors progress, reassigns failed work, and
 * synthesizes results when everything completes.
 */
import * as path from "path"
import * as os from "os"
import fs from "fs/promises"
import { TeamTaskList, type TeamTask } from "./task-list"
import { AgentMailbox } from "./mailbox"

export type TeamMember = {
  id: string
  role: string
}

export type TeamConfig = {
  id: string
  name: string
  members: TeamMember[]
  createdAt: number
}

export type TeamProgress = {
  total: number
  completed: number
  failed: number
  inProgress: number
  pending: number
  incomplete: TeamTask[]
}

function configPath(teamID: string): string {
  return path.join(os.homedir(), ".nocowboy", "teams", teamID, "config.json")
}

export namespace TeamLead {
  /** Create a team directory + members file. */
  export async function createTeam(input: { id: string; name: string; members: TeamMember[] }): Promise<TeamConfig> {
    await TeamTaskList.ensureTeamDir(input.id)
    const config: TeamConfig = {
      id: input.id,
      name: input.name,
      members: input.members,
      createdAt: Date.now(),
    }
    await fs.mkdir(path.dirname(configPath(input.id)), { recursive: true })
    await fs.writeFile(configPath(input.id), JSON.stringify(config, null, 2), "utf8")
    // ensure inboxes exist for every member
    for (const member of input.members) {
      await AgentMailbox.ensureInbox(input.id, member.id)
    }
    return config
  }

  /**
   * Break a goal into tasks and register them in the shared list.
   * Tasks may depend on each other; a task is claimable only when its
   * dependencies are terminal.
   */
  export async function breakDown(input: {
    teamID: string
    goal: string
    tasks: Array<{ id: string; title: string; description: string; dependsOn?: string[] }>
  }): Promise<TeamTask[]> {
    const created: TeamTask[] = []
    for (const task of input.tasks) {
      created.push(
        await TeamTaskList.create({
          teamID: input.teamID,
          id: task.id,
          title: task.title,
          description: task.description,
          dependsOn: task.dependsOn,
        }),
      )
    }
    return created
  }

  /** Summarize team progress for monitoring. */
  export async function progress(teamID: string): Promise<TeamProgress> {
    const tasks = await TeamTaskList.list(teamID)
    const completed = tasks.filter((t) => t.status === "completed")
    const failed = tasks.filter((t) => t.status === "failed")
    const inProgress = tasks.filter((t) => t.status === "in_progress" || t.status === "claimed")
    const pending = tasks.filter((t) => t.status === "pending")
    return {
      total: tasks.length,
      completed: completed.length,
      failed: failed.length,
      inProgress: inProgress.length,
      pending: pending.length,
      incomplete: [...pending, ...inProgress, ...failed],
    }
  }

  /** Broadcast a message to every member (including the lead). */
  export async function broadcast(input: {
    teamID: string
    from: string
    content: string
    type?: "text" | "task-update" | "request"
  }): Promise<void> {
    const config = await readConfig(input.teamID)
    if (!config) return
    for (const member of config.members) {
      if (member.id === input.from) continue
      await AgentMailbox.send({
        teamID: input.teamID,
        from: input.from,
        to: member.id,
        type: input.type,
        content: input.content,
      })
    }
  }

  /**
   * A teammate's self-claim loop: claim the next unblocked pending task,
   * mark it in_progress, work, then complete or fail. Returns when no task
   * is claimable.
   */
  export async function workLoop(input: {
    teamID: string
    agentID: string
    work: (task: TeamTask) => Promise<{ ok: boolean; result?: string }>
  }): Promise<TeamTask[]> {
    const done: TeamTask[] = []
    // Safety cap to avoid pathological infinite claiming.
    for (let i = 0; i < 100; i++) {
      const task = await TeamTaskList.claim({ teamID: input.teamID, agentID: input.agentID })
      if (!task) break
      await TeamTaskList.start({ teamID: input.teamID, taskID: task.id, agentID: input.agentID })
      const outcome = await input.work(task).catch(() => ({ ok: false, result: "work function threw" }))
      if (outcome.ok) {
        const updated = await TeamTaskList.complete({
          teamID: input.teamID,
          taskID: task.id,
          agentID: input.agentID,
          result: outcome.result,
        })
        if (updated) done.push(updated)
      } else {
        const updated = await TeamTaskList.fail({
          teamID: input.teamID,
          taskID: task.id,
          agentID: input.agentID,
          result: outcome.result,
        })
        if (updated) done.push(updated)
      }
    }
    return done
  }

  /**
   * The lead waits for all tasks to reach a terminal state, optionally with a
   * timeout. Returns the final progress summary.
   */
  export async function waitForCompletion(input: {
    teamID: string
    timeoutMs?: number
  }): Promise<TeamProgress> {
    const timeout = input.timeoutMs ?? 300_000
    const start = Date.now()
    while (Date.now() - start < timeout) {
      const p = await progress(input.teamID)
      if (p.incomplete.length === 0) return p
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    return progress(input.teamID)
  }

  async function readConfig(teamID: string): Promise<TeamConfig | undefined> {
    const raw = await fs.readFile(configPath(teamID), "utf8").catch(() => undefined)
    if (!raw) return undefined
    try {
      return JSON.parse(raw) as TeamConfig
    } catch {
      return undefined
    }
  }
}
