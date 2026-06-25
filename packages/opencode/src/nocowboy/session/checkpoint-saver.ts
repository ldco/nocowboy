import * as fs from "node:fs/promises"
import * as path from "node:path"
import { checkpointPath, memoryPath, notesPath, metaDir } from "./checkpoint-paths"
import { CHECKPOINT_TEMPLATE } from "./checkpoint-templates"

/**
 * Ensure checkpoint.md exists for the session. Writes the template if the file
 * does not exist. Idempotent — safe to call on every overflow trigger.
 */
export async function ensureCheckpoint(sessionID: string): Promise<string> {
  const cp = checkpointPath(sessionID)
  await fs.mkdir(path.dirname(cp), { recursive: true })
  try {
    const existing = await fs.readFile(cp, "utf-8")
    return existing
  } catch {
    await fs.writeFile(cp, CHECKPOINT_TEMPLATE, "utf-8")
    return CHECKPOINT_TEMPLATE
  }
}

/**
 * Append a compact checkpoint entry for the current overflow event.
 * Writes a timestamped section mark so the checkpoint-writer subagent can
 * detect a gap in coverage and reconstruct the full context.
 *
 * Non-critical: swallows errors so a checkpoint write failure never
 * prevents compaction or message processing.
 */
export async function markCheckpointOverflow(
  sessionID: string,
  opts?: { summary?: string },
): Promise<void> {
  try {
    const cp = checkpointPath(sessionID)
    await fs.mkdir(path.dirname(cp), { recursive: true })
    const timestamp = new Date().toISOString()
    const entry = [
      "",
      `## Overflow checkpoint (${timestamp})`,
      "",
      opts?.summary ?? "Context pressure reached — compaction triggered.",
      "",
    ].join("\n")
    await fs.appendFile(cp, entry, "utf-8")
  } catch {
    // non-critical
  }
}

/**
 * Check if checkpoint artifacts exist for a session. Used to decide whether
 * to inject rebuild context after compaction.
 */
export async function hasCheckpoint(sessionID: string): Promise<boolean> {
  try {
    await fs.access(checkpointPath(sessionID))
    return true
  } catch {
    return false
  }
}
