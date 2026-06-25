import * as fs from "node:fs/promises"
import * as path from "node:path"
import { checkpointPath, tasksDir } from "./checkpoint-paths"

export interface ProgressDiffItem {
  taskId: string
  writtenAt: number
  status: "NEW" | "CHANGED"
  prior?: number
}

export function parseWrittenAt(body: string): number | null {
  const fm = body.match(/^---\n([\s\S]*?)\n---\n/)
  if (!fm) return null
  const line = fm[1].split("\n").find((l) => l.startsWith("written-at:"))
  if (!line) return null
  const value = Number(line.slice("written-at:".length).trim())
  if (!Number.isFinite(value)) return null
  return value
}

export function parseReconciledMap(mainCheckpoint: string): Map<string, number> {
  const map = new Map<string, number>()
  const re = /\(progress:\s*tasks\/([^/]+)\/progress\.md,\s*last-reconciled-written-at:\s*(\d+)\)/g
  for (const m of mainCheckpoint.matchAll(re)) {
    const value = Number(m[2])
    if (Number.isFinite(value)) map.set(m[1], value)
  }
  return map
}

export async function buildProgressDiffItems(sessionID: string): Promise<ProgressDiffItem[]> {
  let main: string
  try {
    main = await fs.readFile(checkpointPath(sessionID), "utf-8")
  } catch {
    main = ""
  }
  const reconciled = parseReconciledMap(main)

  const root = tasksDir(sessionID)
  let entries: string[]
  try {
    entries = await fs.readdir(root)
  } catch {
    return []
  }

  const items: ProgressDiffItem[] = []
  for (const entry of entries) {
    const fp = path.join(root, entry, "progress.md")
    let body: string
    try {
      body = await fs.readFile(fp, "utf-8")
    } catch {
      continue
    }
    const writtenAt = parseWrittenAt(body)
    if (writtenAt === null) continue
    const prior = reconciled.get(entry)
    if (prior === undefined) {
      items.push({ taskId: entry, writtenAt, status: "NEW" })
    } else if (writtenAt > prior) {
      items.push({ taskId: entry, writtenAt, status: "CHANGED", prior })
    }
  }
  return items
}

export function renderProgressDiffBlock(items: ProgressDiffItem[]): string {
  if (items.length === 0) return ""
  const lines: string[] = ["SUBAGENT PROGRESS to integrate (since last reconcile):"]
  for (const it of items) {
    if (it.status === "NEW") {
      lines.push(`  - ${it.taskId} (NEW, written-at=${it.writtenAt})`)
    } else {
      lines.push(`  - ${it.taskId} (CHANGED, written-at=${it.writtenAt}, prior=${it.prior})`)
    }
  }
  lines.push(
    "",
    "For each: Read tasks/<TID>/progress.md, integrate into checkpoint.",
    'Then update the corresponding progress line to:',
    `  (progress: tasks/<TID>/progress.md, last-reconciled-written-at: <written-at>)`,
  )
  return lines.join("\n")
}

export async function buildProgressDiff(sessionID: string): Promise<string> {
  const items = await buildProgressDiffItems(sessionID)
  return renderProgressDiffBlock(items)
}
