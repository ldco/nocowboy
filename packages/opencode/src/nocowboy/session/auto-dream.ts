const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_DREAM_INTERVAL_DAYS = 7
const DEFAULT_DISTILL_INTERVAL_DAYS = 30
const MIN_SPAWN_GAP_MS = 10_000

export const AUTO_DREAM_TITLE = "Auto Dream"
export const AUTO_DISTILL_TITLE = "Auto Distill"

export const DREAM_TASK = [
  "Run one automatic dream memory consolidation pass for the current project.",
  "",
  "Consolidate only durable, verified information into project memory.",
].join("\n")

export const DISTILL_TASK = [
  "Run one automatic distill pass for the current project.",
  "",
  "Review the past month of sessions and identify repeated manual workflows worth packaging.",
  "Produce a compact shortlist, then create only the high-confidence missing assets.",
].join("\n")

let lastDreamSpawnTime = 0
let lastDistillSpawnTime = 0

/**
 * Check if an auto-dream or auto-distill should run based on the configured
 * interval and the last run recorded in the sessions table.
 */
function shouldAutoRun(input: {
  intervalDays: number
  title: string
}): boolean {
  try {
    const { Database } = require("bun:sqlite")
    const { homedir } = require("os")
    const { join } = require("path")
    const dbPath = join(homedir(), ".local/share/kilo/storage/nocowboy.db")
    const db = new Database(dbPath)

    try {
      // Check sessions table for the last Auto Dream/Distill session
      const row = db
        .query(`SELECT time_created FROM session WHERE title = ? ORDER BY time_created DESC LIMIT 1`)
        .get(input.title) as { time_created: number } | undefined

      const now = Date.now()
      const elapsed = row ? now - row.time_created : Infinity

      if (!row) {
        // First time: check if project has been active long enough
        const earliest = db
          .query(`SELECT time_created FROM session WHERE parent_id IS NULL ORDER BY time_created ASC LIMIT 1`)
          .get() as { time_created: number } | undefined

        if (!earliest || now - earliest.time_created < input.intervalDays * DAY_MS) {
          return false
        }
      } else if (elapsed < input.intervalDays * DAY_MS) {
        return false
      }

      return true
    } finally {
      db.close()
    }
  } catch {
    return false
  }
}

export function shouldAutoDream(): boolean {
  const now = Date.now()
  if (now - lastDreamSpawnTime < MIN_SPAWN_GAP_MS) return false
  lastDreamSpawnTime = now
  return shouldAutoRun({ intervalDays: DEFAULT_DREAM_INTERVAL_DAYS, title: AUTO_DREAM_TITLE })
}

export function shouldAutoDistill(): boolean {
  const now = Date.now()
  if (now - lastDistillSpawnTime < MIN_SPAWN_GAP_MS) return false
  lastDistillSpawnTime = now
  return shouldAutoRun({ intervalDays: DEFAULT_DISTILL_INTERVAL_DAYS, title: AUTO_DISTILL_TITLE })
}
