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
    for (const feature of noSpec.slice(0, 5)) {
      callTool("nutausik_task_quick", {
        title: `[Spec] ${feature.title} (${feature.id})`,
        goal: `Write a spec for "${feature.title}"`,
        acceptance_criteria: `Spec exists at .nocowboy/specs/${feature.id}.md`,
      }, projectRoot).catch(() => {})
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
