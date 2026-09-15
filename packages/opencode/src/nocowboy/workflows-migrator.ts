import * as fs from "fs/promises"
import * as path from "path"
import os from "os"
import type { Config } from "../config/config"
import type { ConfigCommand } from "../config/command"
import { Filesystem } from "../util/filesystem"
import { NoCowboyMarkdown } from "./config/markdown"
import { NocowboyPaths } from "./paths"

export namespace WorkflowsMigrator {
  const home = () => process.env.HOME || process.env.USERPROFILE || os.homedir()

  // .kilocode first (lower precedence), .kilo second (higher precedence / wins)
  const KILO_WORKFLOWS_DIRS = [".nocowboy/workflows"]
  const globalWorkflowsDirs = () => [path.join(home(), ".nocowboy", "workflows")]

  export interface NoCowboyWorkflow {
    name: string
    path: string
    content: string
    source: "global" | "project"
  }

  export interface MigrationResult {
    commands: Record<string, ConfigCommand.Info>
    warnings: string[]
  }

  async function findWorkflowFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
    return entries.filter((e) => e.isFile() && e.name.endsWith(".md")).map((e) => path.join(dir, e.name))
  }

  export function extractNameFromFilename(filename: string): string {
    return path.basename(filename, ".md")
  }

  export function extractDescription(content: string): string | undefined {
    const lines = content.split("\n")
    let foundTitle = false

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith("#")) {
        foundTitle = true
        continue
      }
      if (foundTitle && trimmed.length > 0) {
        return trimmed.slice(0, 200)
      }
    }
    return undefined
  }

  // nocowboy_change - global workflows are user-owned (trusted); project workflows are confined to the
  // project root so they cannot resolve {env:} or read host files (upstream 032f3bb)
  async function loadWorkflowsFromDir(
    dir: string,
    source: "global" | "project",
    root?: string,
  ): Promise<NoCowboyWorkflow[]> {
    if (!(await Filesystem.isDir(dir))) return []
    const files = await findWorkflowFiles(dir)
    const workflows: NoCowboyWorkflow[] = []
    const trusted = source === "global"
    for (const file of files) {
      const content = await NoCowboyMarkdown.substitute(await fs.readFile(file, "utf-8"), file, {
        trusted,
        fileScope: trusted || !root ? undefined : { root, source: file },
      })
      workflows.push({
        name: extractNameFromFilename(file),
        path: file,
        content: content.trim(),
        source,
      })
    }
    return workflows
  }

  export async function discoverWorkflows(projectDir: string, skipGlobalPaths?: boolean): Promise<NoCowboyWorkflow[]> {
    const workflows: NoCowboyWorkflow[] = []

    if (!skipGlobalPaths) {
      // 1. VSCode extension global storage (primary location for global workflows)
      const vscodeWorkflowsDir = path.join(NocowboyPaths.vscodeGlobalStorage(), "workflows")
      workflows.push(...(await loadWorkflowsFromDir(vscodeWorkflowsDir, "global")))

      // 2. Home directories ~/.nocowboy/workflows and ~/.nocowboy/workflows
      for (const dir of globalWorkflowsDirs()) {
        workflows.push(...(await loadWorkflowsFromDir(dir, "global")))
      }
    }

    // 3. Project workflows (.nocowboy/workflows/ and .nocowboy/workflows/)
    for (const dir of KILO_WORKFLOWS_DIRS) {
      workflows.push(...(await loadWorkflowsFromDir(path.join(projectDir, dir), "project", projectDir)))
    }

    return workflows
  }

  export function convertToCommand(workflow: NoCowboyWorkflow): ConfigCommand.Info {
    return {
      template: workflow.content,
      description: extractDescription(workflow.content) ?? `Workflow: ${workflow.name}`,
    }
  }

  export async function migrate(options: {
    projectDir: string
    /** Skip reading from global paths. Used for testing. */
    skipGlobalPaths?: boolean
  }): Promise<MigrationResult> {
    const warnings: string[] = []
    const commands: Record<string, ConfigCommand.Info> = {}

    const workflows = await discoverWorkflows(options.projectDir, options.skipGlobalPaths)

    // Deduplicate by name (project takes precedence over global)
    const workflowsByName = new Map<string, NoCowboyWorkflow>()

    // Add global first
    for (const workflow of workflows.filter((w) => w.source === "global")) {
      workflowsByName.set(workflow.name, workflow)
    }

    // Project overwrites global
    for (const workflow of workflows.filter((w) => w.source === "project")) {
      if (workflowsByName.has(workflow.name)) {
        warnings.push(`Project workflow '${workflow.name}' overrides global workflow`)
      }
      workflowsByName.set(workflow.name, workflow)
    }

    // Convert to commands
    for (const [name, workflow] of workflowsByName) {
      commands[name] = convertToCommand(workflow)
    }

    return { commands, warnings }
  }
}
