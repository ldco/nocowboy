import { callTool, hasNutausik } from "./nutausik-client"
import * as Log from "@nocowboy/core/util/log"
import * as fs from "node:fs"
import * as path from "node:path"

const log = Log.create({ service: "startup-checks" })

let _roadmapChecked = false

export async function roadmapSpecCheck(projectRoot: string): Promise<void> {
  if (_roadmapChecked) return
  _roadmapChecked = true

  try {
    if (!(await hasNutausik())) return

    const roadmapPath = path.join(projectRoot, "docs", "roadmap.json")
    if (!fs.existsSync(roadmapPath)) return

    const data = JSON.parse(fs.readFileSync(roadmapPath, "utf-8"))
    const noSpec = data.features?.filter((f: any) =>
      (f.status === "planned" || f.status === "in_progress" || f.status === "backlog") &&
      !fs.existsSync(path.join(projectRoot, ".nocowboy", "specs", `${f.id}.md`))
    )
    if (!noSpec || noSpec.length === 0) return

    log.info("roadmap spec check: creating tasks for features without specs", { count: noSpec.length })
    // `_roadmapChecked` only guards one process, so without this every session
    // created another [Spec] task for the same feature (12 duplicates each when
    // this was fixed). Ask NUTAUSIK what already exists and only add the missing
    // ones: task_list returns one line per task as "<slug> <status> <title>".
    const listed = await callTool("nutausik_task_list", { status: "planning" }, { projectDir: projectRoot })
    const existing = new Set(
      (listed.ok ? listed.text : "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.split(/\s+/).slice(2).join(" "))
        .filter(Boolean),
    )
    for (const feature of noSpec.slice(0, 5)) {
      const title = `[Spec] ${feature.title} (${feature.id})`
      if (existing.has(title)) continue
      callTool(
        "nutausik_task_quick",
        {
          title,
          goal: `Write a spec for "${feature.title}"`,
          acceptance_criteria: `Spec exists at .nocowboy/specs/${feature.id}.md`,
        },
        { projectDir: projectRoot },
      ).then((r) => { if (!r.ok) log.warn("spec task creation failed", { id: feature.id, code: r.error.code }) })
    }
  } catch {
    log.warn("roadmap spec check failed")
  }
}

export async function runAll(projectRoot: string): Promise<void> {
  await Promise.all([
    roadmapSpecCheck(projectRoot),
  ])
}
