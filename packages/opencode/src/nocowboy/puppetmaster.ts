import { existsSync, readFileSync } from "fs"
import { join } from "path"

/**
 * PuppetMaster 4 project detection and PM MCP context handling.
 *
 * PM4 replaced the v2/v3 `project/puppet-master.config.ts` file with a typed
 * project layer: `src/project/pm.config.ts` (the project SPEC) and the
 * ModuleManifest at `src/lib/config/modules.ts` (ADR-04, the single source for
 * modules). Detection must follow the current project layout — checking the
 * deleted legacy path silently classified every PM4 checkout as a non-PM
 * project, which disabled both the system-prompt injection and the PM memory
 * write. The legacy path is deliberately NOT accepted: the PM MCP tools no
 * longer understand it, so detecting it would only inject empty context.
 */
export namespace PuppetMaster {
  /** Files that only a PuppetMaster 4 project has. */
  export const PROJECT_MARKERS = ["src/project/pm.config.ts", "src/lib/config/modules.ts"] as const

  /** Package name used by the PM4 framework repository and its forks. */
  export const PACKAGE_NAME = "puppetmaster-4"

  function hasPackageName(dir: string): boolean {
    try {
      const parsed: unknown = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"))
      if (!parsed || typeof parsed !== "object") return false
      return (parsed as Record<string, unknown>)["name"] === PACKAGE_NAME
    } catch {
      return false
    }
  }

  /** True when `dir` is a PuppetMaster 4 project (marker file or package name). */
  export function isProject(dir: string): boolean {
    if (PROJECT_MARKERS.some((marker) => existsSync(join(dir, marker)))) return true
    return hasPackageName(dir)
  }

  /**
   * The system-prompt block for a PM MCP call: only a CONNECTED server may
   * inject, and an empty pipeline result must not leave a dangling header.
   */
  export function promptBlock(status: string | undefined, result: unknown): string | undefined {
    if (status !== "connected") return undefined
    const text = contextText(result)
    return text ? ["## PuppetMaster 4 Project Context", "", text].join("\n") : undefined
  }

  /**
   * Flatten the text content parts of `pm_inject_context` into a prompt block.
   * The MCP SDK result is a union (a tool can also return `toolResult`), so the
   * shape is narrowed instead of asserted.
   */
  export function contextText(result: unknown): string {
    if (!result || typeof result !== "object") return ""
    const content = (result as { content?: unknown }).content
    if (!Array.isArray(content)) return ""
    return content
      .flatMap((part: unknown): string[] => {
        if (!part || typeof part !== "object") return []
        const record = part as { type?: unknown; text?: unknown }
        return record.type === "text" && typeof record.text === "string" ? [record.text] : []
      })
      .join("\n")
      .trim()
  }
}
