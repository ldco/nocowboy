
import { Global } from "@nocowboy/core/global"
import { staticEnvLines, type EditorContext } from "@/nocowboy/editor-context"
import type { Provider } from "@/provider/provider"
import type { InstanceContext } from "@/project/instance-context"
import { RepoMap } from "@/nocowboy/repomap"

export namespace NoCowboySystemPrompt {
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

    // Deep context injection — repomap for project understanding
    try {
      const dir = input.ctx.directory || process.cwd()
      
      // Repomap: token-optimized repository structure
      const repomap = RepoMap.generate(dir, 40)
      if (repomap) lines.push(repomap)
    } catch {
      // If repomap fails, continue without — non-critical
    }

    return lines
  }
}
