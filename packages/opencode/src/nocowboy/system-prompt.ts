// nocowboy_change - new file
import { batch } from "solid-js" // nocowboy_change

import { Global } from "@opencode-ai/core/global"
import { staticEnvLines, type EditorContext } from "@/nocowboy/editor-context"
import type { Provider } from "@/provider/provider"
import type { InstanceContext } from "@/project/instance-context"
import { RepoMap } from "@/nocowboy/repomap"
import { reconcile } from "@/nocowboy/memory/reconcile"

export namespace KilocodeSystemPrompt {
  export function environment(input: { ctx: InstanceContext; model: Provider.Model; editor?: EditorContext }) {
    const lines = [
      [
        `You are powered by the model named ${input.model.api.id}. The exact model ID is ${input.model.providerID}/${input.model.api.id}`,
        `Here is some useful information about the environment you are running in:`,
        `<env>`,
        `  Is directory a git repo: ${input.ctx.project.vcs === "git" ? "yes" : "no"}`,
        `  Platform: ${process.platform}`,
        `  Today's date: ${new Date().toDateString()}`,
        `  Project config: .nocowboy/command/*.md, .nocowboy/agent/*.md, nocowboy.json, AGENTS.md. Put new commands and agents in .nocowboy/. Do not use .nocowboy/ or .opencode/.`,
        `  Global config: ${Global.Path.config}/ (same structure)`,
        ...staticEnvLines(input.editor),
        `</env>`,
      ].join("\n"),
    ]

    // Deep context injection — repomap + memory for project understanding
    try {
      const dir = input.ctx.directory || process.cwd()

      // SolidJS batch: group reactive updates from repomap + memory into one render
      batch(() => {
        // Repomap: token-optimized repository structure
        const repomap = RepoMap.generate(dir, 40)
        if (repomap) lines.push(repomap)

        // Memory: reconcile FTS5 index, load MEMORY.md content
        reconcile()
      })

      // Load MEMORY.md content outside batch (file I/O doesn't need reactive wrapping)
      const fs = require("node:fs")
      const path = require("node:path")
      const os = require("node:os")
      const memPath = path.join(os.homedir(), ".nocowboy", "memory", "MEMORY.md")
      if (fs.existsSync(memPath)) {
        const memory = fs.readFileSync(memPath, "utf-8").slice(0, 2000)
        if (memory.trim()) {
          lines.push([
            "## Project Memory (from MEMORY.md)",
            "",
            memory,
          ].join("\n"))
        }
      }
    } catch {
      // If repomap/memory fails, continue without — non-critical
    }

    return lines
  }
}
