// Tool: complete_task
// Programmatic gate: перед закрытием задачи запускает LSP diagnostics.
// Если есть ошибки — ОТКЛОНЯЕТ task_done.
// Агент НЕ МОЖЕТ закрыть задачу с type errors.
//
// Заменяет прямой вызов nutausik_task_done. Агент должен использовать
// complete_task вместо nutausik_task_done.

import * as Tool from "./tool"
import { LSP } from "@/lsp/lsp"
import { AppFileSystem } from "@nocowboy/core/filesystem"
import { Effect, Schema } from "effect"
import { filterDiagnostics } from "./diagnostics"

const NUTAUSIK_DEFAULT = "http://127.0.0.1:9210/mcp"

export const Parameters = Schema.Struct({
  slug: Schema.String.annotate({
    description: "Task slug (from nutausik_task_list or the task you're working on)",
  }),
  ac_verified: Schema.Boolean.annotate({
    description: "Acceptance criteria have been verified? MUST be true to complete.",
  }),
})

export const CompleteTaskTool = Tool.define(
  "complete_task",
  Effect.gen(function* () {
    const lsp = yield* LSP.Service

    return {
      description: [
        "Complete a NUTAUSIK task with verification.",
        "",
        "This tool REPLACES direct nutausik_task_done calls.",
        "Before completing the task, it:",
        "  1. Runs LSP diagnostics on changed files",
        "  2. Runs Constitution code quality check (if available)",
        "  3. Only if both pass — forwards to nutausik_task_done",
        "If there are any type errors or compilation errors — task completion is REJECTED.",
        "",
        "⚠️ You MUST use this tool instead of calling nutausik_task_done directly.",
        "Calling nutausik_task_done directly bypasses verification and BREAKS THE PROJECT.",
        "",
        "Returns:",
        "  ✅ Task '<slug>' completed successfully — if verification passes",
        "  ❌ Cannot complete task '<slug>' — verification failed — if there are errors",
      ].join("\n"),
      parameters: Parameters,
      execute: (
        params: Schema.Schema.Type<typeof Parameters>,
        _ctx: Tool.Context,
      ): Effect.Effect<Tool.ExecuteResult> =>
        Effect.gen(function* () {
          // Step 1: Run LSP diagnostics
          const diagnostics = yield* lsp.diagnostics()

          // Collect errors across ALL files
          const errors: Array<{ file: string; line: number; col: number; message: string }> = []
          for (const [file, issues] of Object.entries(diagnostics)) {
            for (const issue of issues) {
              if (issue.severity === 1) {
                errors.push({
                  file: AppFileSystem.normalizePath(file),
                  line: (issue.range?.start?.line ?? 0) + 1,
                  col: (issue.range?.start?.character ?? 0) + 1,
                  message: issue.message,
                })
              }
            }
          }

          // Step 2: If errors → REJECT
          if (errors.length > 0) {
            const sample = errors.slice(0, 20)
            const lines = sample.map(
              (e) => `  ERROR [${e.line}:${e.col}] ${e.file}: ${e.message}`,
            )
            if (errors.length > 20) {
              lines.push(`  ... and ${errors.length - 20} more errors`)
            }

            return {
              title: "Task completion rejected",
              metadata: { rejected: true, errors: errors.length },
              output: [
                `❌ Cannot complete task '${params.slug}' — verification failed`,
                `Found ${errors.length} LSP error(s). Fix them first, then retry complete_task.`,
                "",
                ...lines,
                "",
                "Run `check` to see full diagnostics.",
              ].join("\n"),
            }
          }

          // Step 3: Run Constitution check on changed files (optional — skip if unavailable)
          let constitutionWarnings: string[] = []
          try {
            const constitutionUrl =
              process.env.CONSTITUTION_MCP_URL ?? "http://127.0.0.1:9216/mcp"
            const response: Response = yield* Effect.tryPromise({
              try: () =>
                fetch(constitutionUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "tools/call",
                    params: {
                      name: "constitution_constitution_check_project",
                      arguments: {
                        glob: "src/**/*.{ts,tsx}",
                        max_files: 50,
                      },
                    },
                  }),
                  signal: AbortSignal.timeout(10000),
                }),
              catch: () => null,
            })

            if (response && response.ok) {
              const data: any = yield* Effect.tryPromise(() => response.json()).pipe(
                Effect.catch(() => Effect.succeed(undefined)),
              )
              const text = data?.result?.content?.[0]?.text ?? ""
              if (text && text.includes("violation")) {
                constitutionWarnings = text
                  .split("\n")
                  .filter((l: string) => l.includes("violation"))
                  .slice(0, 10)
              }
            }
          } catch {
            // Constitution unavailable — skip check
          }

          // Step 4: No errors → forward to nutausik_task_done
          const nutausikUrl = process.env.NUTAUSIK_MCP_URL ?? NUTAUSIK_DEFAULT
          let nutausikResult = ""

          const response: Response = yield* Effect.tryPromise({
            try: () =>
              fetch(nutausikUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  jsonrpc: "2.0",
                  id: 1,
                  method: "tools/call",
                  params: {
                    name: "nutausik_task_done",
                    arguments: {
                      slug: params.slug,
                      ac_verified: params.ac_verified,
                    },
                  },
                }),
                signal: AbortSignal.timeout(5000),
              }),
            catch: (err) =>
              new Error(
                `NUTAUSIK unavailable: ${err instanceof Error ? err.message : String(err)}`,
              ),
          })

          if (response.ok) {
            const data: any = yield* Effect.tryPromise(() => response.json())
            nutausikResult = data?.result?.content?.[0]?.text ?? "Task completed"
          } else {
            nutausikResult = `NUTAUSIK returned HTTP ${response.status}`
          }

          const constitutionBlock =
            constitutionWarnings.length > 0
              ? [
                  "",
                  "⚠️ Constitution warnings (non-blocking):",
                  ...constitutionWarnings.map((w: string) => `  ${w}`),
                ].join("\n")
              : ""

          return {
            title: "Task completed",
            metadata: { slug: params.slug, ac_verified: params.ac_verified },
            output: [
              `✅ Task '${params.slug}' completed successfully.`,
              `NUTAUSIK result: ${nutausikResult}`,
              "",
              "Verification passed — no LSP errors found.",
              constitutionBlock,
            ].join("\n"),
          }
        }).pipe(Effect.orDie),
    }
  }),
)
