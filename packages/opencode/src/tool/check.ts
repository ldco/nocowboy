// Tool: check
// Language-agnostic verification tool. Wraps LSP diagnostics for agent invocation.
// Agent MUST call this before task_done. This is DEFAULT BEHAVIOR, not optional.

import * as Tool from "./tool"
import { LSP } from "@/lsp/lsp"
import { AppFileSystem } from "@nocowboy/core/filesystem"
import { Effect, Schema } from "effect"
import { filterDiagnostics } from "./diagnostics"

const MAX_DIAGNOSTICS_FILES = 20
const MAX_ERRORS_PER_FILE = 20

export const Parameters = Schema.Struct({
  files: Schema.optional(Schema.Array(Schema.String)).annotate({
    description: [
      "Files to check. Omit to check all project files with errors.",
      "Example: ['src/foo.ts', 'src/bar.ts']",
    ].join("\n"),
  }),
})

export const CheckTool = Tool.define(
  "check",
  Effect.gen(function* () {
    const lsp = yield* LSP.Service

    return {
      description: [
        "Run LSP diagnostics on files to verify code correctness.",
        "Call this BEFORE task_done to ensure code compiles without errors.",
        "Language-agnostic: works with TypeScript (typescript-language-server),",
        "Go (gopls), Python (pyright), Rust (rust-analyzer), Java (jdt.ls), and any other LSP.",
        "",
        "Returns errors with file, line, column, and message for each issue.",
        "If no errors: returns ✅ Verification passed.",
        "If errors: returns ⚠️ Verification failed with diagnostics.",
      ].join("\n"),
      parameters: Parameters,
      execute: (
        params: Schema.Schema.Type<typeof Parameters>,
        _ctx: Tool.Context,
      ): Effect.Effect<Tool.ExecuteResult> =>
        Effect.gen(function* () {
          const diagnostics = yield* lsp.diagnostics()
          const filtered = params.files
            ? filterDiagnostics(
                diagnostics,
                params.files.map((f: string) => AppFileSystem.normalizePath(f)),
              )
            : diagnostics

          const blocks: string[] = []
          let totalErrors = 0
          let fileCount = 0

          for (const [file, issues] of Object.entries(filtered)) {
            if (fileCount >= MAX_DIAGNOSTICS_FILES) break
            const errors = issues.filter((i: any) => i.severity === 1)
            if (errors.length === 0) continue
            totalErrors += errors.length
            fileCount++
            const limited = errors.slice(0, MAX_ERRORS_PER_FILE)
            const more = errors.length > MAX_ERRORS_PER_FILE ? `\n... and ${errors.length - MAX_ERRORS_PER_FILE} more` : ""
            blocks.push(
              `<diagnostics file="${file}">\n${limited.map(pretty).join("\n")}${more}\n</diagnostics>`,
            )
          }

          if (totalErrors === 0) {
            return {
              title: "Verification passed",
              metadata: {},
              output: "✅ Verification passed — no LSP errors found.",
            }
          }

          return {
            title: "Verification failed",
            metadata: { errors: totalErrors },
            output: [
              `⚠️ Verification failed — ${totalErrors} error(s) found in ${fileCount} file(s). Fix them before continuing.`,
              "",
              ...blocks,
              "",
              "Fix the errors above, then run check again.",
            ].join("\n"),
          }
        }).pipe(Effect.orDie),
    }
  }),
)

function pretty(diagnostic: any): string {
  const severityMap: Record<number, string> = {
    1: "ERROR", 2: "WARN", 3: "INFO", 4: "HINT",
  }
  const severity = severityMap[diagnostic.severity || 1]
  const line = (diagnostic.range?.start?.line ?? 0) + 1
  const col = (diagnostic.range?.start?.character ?? 0) + 1
  return `${severity} [${line}:${col}] ${diagnostic.message}`
}
