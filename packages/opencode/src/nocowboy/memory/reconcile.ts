import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"
import { MemoryService } from "./index"

const home = os.homedir()
const MEMORY_DIR = path.join(home, ".nocowboy", "memory")

function walkMemoryDir(root: string): string[] {
  const out: string[] = []
  function recurse(dir: string) {
    let entries: fs.Dirent[]
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) recurse(full)
      else if (entry.isFile() && full.endsWith(".md")) out.push(full)
    }
  }
  recurse(root)
  return out
}

function parseMemoryPath(absPath: string): { scope: string; type: string } | null {
  const rel = path.relative(MEMORY_DIR, absPath)
  if (rel.startsWith("..")) return null

  const parts = rel.split(path.sep)
  const filename = parts[parts.length - 1]

  if (filename === "MEMORY.md") return { scope: "project", type: "memory" }
  if (filename === "checkpoint.md") return { scope: "project", type: "checkpoint" }
  if (filename === "notes.md") return { scope: "project", type: "notes" }

  // tasks/<id>/progress.md
  if (parts.length >= 2 && parts[0] === "tasks" && filename === "progress.md") {
    return { scope: "task", type: "progress" }
  }

  // Generic .md files
  return { scope: "free", type: "free" }
}

export function reconcile(): { indexed: number; pruned: number } {
  // Ensure the directory exists
  fs.mkdirSync(MEMORY_DIR, { recursive: true })

  // Walk disk
  const diskFiles = walkMemoryDir(MEMORY_DIR)

  // Index new/changed files
  let indexed = 0
  for (const filePath of diskFiles) {
    const parsed = parseMemoryPath(filePath)
    if (!parsed) continue

    const stat = fs.statSync(filePath)
    const body = fs.readFileSync(filePath, "utf-8")
    const fingerprint = `${stat.size}-${stat.mtimeMs}`

    MemoryService.index({
      path: filePath,
      scope: parsed.scope,
      type: parsed.type,
      body,
    })
    indexed++
  }

  // Prune dead entries
  let pruned = 0
  if (diskFiles.length > 0) {
    pruned = MemoryService.prune(diskFiles)
  }

  return { indexed, pruned }
}
