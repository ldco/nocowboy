import * as path from "node:path"
import * as os from "node:os"
import * as fs from "node:fs/promises"

const DATA_DIR = path.join(os.homedir(), ".local/share/nocowboy/storage")

export function metaDir(sessionID: string): string {
  return path.join(DATA_DIR, "memory", "sessions", sessionID)
}

export function checkpointPath(sessionID: string): string {
  return path.join(metaDir(sessionID), "checkpoint.md")
}

export function memoryPath(projectID: string): string {
  return path.join(DATA_DIR, "memory", "projects", projectID, "MEMORY.md")
}

export function globalMemoryPath(): string {
  return path.join(DATA_DIR, "memory", "global", "MEMORY.md")
}

export async function migrateProjectMemory(projectID: string): Promise<void> {
  const upper = memoryPath(projectID)
  const lower = path.join(path.dirname(upper), "memory.md")
  try {
    await fs.access(upper)
    return
  } catch {}
  try {
    await fs.access(lower)
  } catch {
    return
  }
  try {
    await fs.rename(lower, upper)
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e
  }
}

export function notesPath(sessionID: string): string {
  return path.join(metaDir(sessionID), "notes.md")
}

export function tasksDir(sessionID: string): string {
  return path.join(metaDir(sessionID), "tasks")
}

export function progressPath(sessionID: string, taskID: string): string {
  return path.join(tasksDir(sessionID), taskID, "progress.md")
}
