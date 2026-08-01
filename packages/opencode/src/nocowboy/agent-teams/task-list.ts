/**
 * Shared Task List for Agent Teams.
 *
 * A team task lives as a JSON file under ~/.nocowboy/teams/{team-id}/tasks/.
 * Teammates read the shared list, claim available work (with file locking to
 * avoid races), and mark tasks completed. Mirrors Claude Code's agent-team
 * task list semantics.
 *
 * Task statuses:
 *   pending    — created, not yet claimed
 *   claimed    — an agent picked it up (owner set)
 *   in_progress— actively being worked
 *   completed  — finished
 *   failed     — agent reported an error
 *
 * Dependencies: a pending task with unresolved dependencies cannot be claimed.
 */
import * as path from "path"
import fs from "fs/promises"
import os from "os"

export type TeamTaskStatus = "pending" | "claimed" | "in_progress" | "completed" | "failed"

export type TeamTask = {
  id: string
  title: string
  description: string
  status: TeamTaskStatus
  owner?: string
  dependsOn: string[]
  createdAt: number
  updatedAt: number
  result?: string
}

export type TeamListOptions = {
  status?: TeamTaskStatus
  owner?: string
}

const teamsRoot = () => path.join(os.homedir(), ".nocowboy", "teams")

export namespace TeamTaskList {
  export function teamDir(teamID: string): string {
    return path.join(teamsRoot(), teamID, "tasks")
  }

  export async function ensureTeamDir(teamID: string): Promise<string> {
    const dir = teamDir(teamID)
    await fs.mkdir(dir, { recursive: true })
    return dir
  }

  export async function filePath(teamID: string, taskID: string): Promise<string> {
    const dir = await ensureTeamDir(teamID)
    return path.join(dir, `${taskID}.json`)
  }

  export async function create(input: {
    teamID: string
    id: string
    title: string
    description: string
    dependsOn?: string[]
  }): Promise<TeamTask> {
    const task: TeamTask = {
      id: input.id,
      title: input.title,
      description: input.description,
      status: "pending",
      dependsOn: input.dependsOn ?? [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await fs.writeFile(await filePath(input.teamID, input.id), JSON.stringify(task, null, 2), "utf8")
    return task
  }

  export async function get(teamID: string, taskID: string): Promise<TeamTask | undefined> {
    const file = await filePath(teamID, taskID)
    try {
      const raw = await fs.readFile(file, "utf8")
      return JSON.parse(raw) as TeamTask
    } catch {
      return undefined
    }
  }

  export async function list(teamID: string, options: TeamListOptions = {}): Promise<TeamTask[]> {
    const dir = teamDir(teamID)
    let entries: string[]
    try {
      entries = await fs.readdir(dir)
    } catch {
      return []
    }
    const tasks: TeamTask[] = []
    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue
      const raw = await fs.readFile(path.join(dir, entry), "utf8").catch(() => undefined)
      if (!raw) continue
      try {
        const task = JSON.parse(raw) as TeamTask
        if (options.status && task.status !== options.status) continue
        if (options.owner && task.owner !== options.owner) continue
        tasks.push(task)
      } catch {
        // skip corrupt entries
      }
    }
    return tasks.sort((a, b) => a.createdAt - b.createdAt)
  }

  async function update(teamID: string, taskID: string, patch: Partial<TeamTask>): Promise<TeamTask | undefined> {
    const task = await get(teamID, taskID)
    if (!task) return undefined
    const updated = { ...task, ...patch, updatedAt: Date.now() }
    await fs.writeFile(await filePath(teamID, taskID), JSON.stringify(updated, null, 2), "utf8")
    return updated
  }

  /** True when every dependency of the task is in a terminal (completed/failed) state. */
  export async function dependenciesResolved(teamID: string, task: TeamTask): Promise<boolean> {
    for (const depID of task.dependsOn) {
      const dep = await get(teamID, depID)
      if (!dep) return false
      if (dep.status !== "completed" && dep.status !== "failed") return false
    }
    return true
  }

  /**
   * Atomically claim the next unassigned, unblocked task for an agent.
   * Returns the claimed task, or undefined if nothing is claimable.
   * Read-modify-write is serialized per team via a simple lock file.
   */
  export async function claim(input: { teamID: string; agentID: string }): Promise<TeamTask | undefined> {
    const lock = path.join(teamsRoot(), input.teamID, ".lock")
    await fs.mkdir(path.dirname(lock), { recursive: true })
    // mkdir-based spin lock
    const acquired = await acquireLock(lock, 2000)
    if (!acquired) return undefined
    try {
      const tasks = await list(input.teamID)
      for (const task of tasks) {
        if (task.status !== "pending") continue
        if (!(await dependenciesResolved(input.teamID, task))) continue
        await update(input.teamID, task.id, { status: "claimed", owner: input.agentID })
        return task
      }
      return undefined
    } finally {
      await releaseLock(lock)
    }
  }

  export async function start(input: { teamID: string; taskID: string; agentID: string }): Promise<TeamTask | undefined> {
    return update(input.teamID, input.taskID, { status: "in_progress", owner: input.agentID })
  }

  export async function complete(input: {
    teamID: string
    taskID: string
    agentID: string
    result?: string
  }): Promise<TeamTask | undefined> {
    return update(input.teamID, input.taskID, { status: "completed", owner: input.agentID, result: input.result })
  }

  export async function fail(input: {
    teamID: string
    taskID: string
    agentID: string
    result?: string
  }): Promise<TeamTask | undefined> {
    return update(input.teamID, input.taskID, { status: "failed", owner: input.agentID, result: input.result })
  }
}

async function acquireLock(lockPath: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      await fs.mkdir(lockPath)
      return true
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }
  return false
}

async function releaseLock(lockPath: string): Promise<void> {
  await fs.rm(lockPath, { recursive: true, force: true })
}
