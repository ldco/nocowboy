import { cmd } from "@/cli/cmd/cmd"
import { AppRuntime } from "@/effect/app-runtime"
import { Effect } from "effect"
import { join } from "path"
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs"
import { homedir } from "os"

/**
 * Distill command — сканировать сессии → генерировать skills/commands.
 */

interface TaskSummary {
  id: string
  title: string
  goal: string
  completed: boolean
  patterns: string[]
}

function loadRecentTasks(hours: number = 720): TaskSummary[] {
  try {
    const { Database } = require("bun:sqlite") as typeof import("bun:sqlite")
    const dbPath = join(homedir(), ".local/share/nocowboy/storage/nocowboy.db")
    if (!existsSync(dbPath)) return []
    const db = new Database(dbPath)
    try {
      const cutoff = Date.now() - hours * 60 * 60 * 1000
      const rows = db
        .query(
          "SELECT id, title, summary, status, time_created FROM task WHERE time_created > ? ORDER BY time_created DESC LIMIT 50",
        )
        .all(cutoff) as Array<{ id: string; title: string; summary: string; status: string; time_created: number }>

      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        goal: r.summary || "",
        completed: r.status === "done",
        patterns: [],
      }))
    } finally {
      db.close()
    }
  } catch {
    return []
  }
}

function generateCommands(tasks: TaskSummary[]): Array<{ name: string; description: string; content: string }> {
  // Group tasks by common prefixes to identify workflows
  const workflows = new Map<string, { count: number; tasks: TaskSummary[] }>()
  for (const task of tasks) {
    if (!task.completed) continue
    // Extract action words from title
    const words = task.title.toLowerCase().split(/\s+/)
    for (let i = 0; i < words.length - 1; i++) {
      const key = `${words[i]}-${words[i + 1]}`
      if (!workflows.has(key)) workflows.set(key, { count: 0, tasks: [] })
      workflows.get(key)!.count++
      workflows.get(key)!.tasks.push(task)
    }
  }

  // Find workflows that appear multiple times
  const results: Array<{ name: string; description: string; content: string }> = []
  for (const [key, info] of workflows) {
    if (info.count < 2) continue
    const name = `distilled-${key.replace(/[^a-z0-9]+/g, "-")}`
    const examples = info.tasks
      .slice(0, 3)
      .map((t) => `  - ${t.title}`)
      .join("\n")
    results.push({
      name,
      description: `Distilled workflow: ${key}`,
      content: `# ${name}\n\nAutomatically distilled from ${info.count} recurring tasks.\n\n## Examples\n${examples}\n\n## Steps\n1. Review the task requirements\n2. Follow the established pattern\n3. Verify the result\n`,
    })
  }
  return results
}

async function distillAction(hours: number = 720, outputDir?: string) {
  const tasks = loadRecentTasks(hours)
  console.log(`📊 Loaded ${tasks.length} tasks from last ${hours}h`)

  const commands = generateCommands(tasks)
  if (commands.length === 0) {
    console.log("ℹ️  No recurring patterns found. Try increasing --hours or using more.")
    return
  }

  const dir = outputDir ?? join(process.cwd(), ".nocowboy", "command")
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  for (const cmd of commands) {
    const filePath = join(dir, `${cmd.name}.md`)
    writeFileSync(filePath, cmd.content)
    console.log(`  ✅ ${cmd.name}.md`)
  }
  console.log(`\n📝 Generated ${commands.length} command files in ${dir}`)
}

export const DistillCommand = cmd({
  command: "distill [hours]",
  describe: "scan recent sessions and generate skill/command files for recurring workflows",
  builder: (yargs) =>
    yargs
      .positional("hours", { type: "number", default: 720, describe: "Lookback window in hours (default: 720 = 30d)" })
      .option("dir", { type: "string", describe: "Output directory (default: .nocowboy/command/)" }),
  handler: async (args) => {
    await distillAction(args.hours as number, args.dir as string | undefined)
  },
})
