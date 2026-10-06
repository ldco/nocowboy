import * as path from "path"
import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { LSP } from "@/lsp/lsp"
import { createTwoFilesPatch, diffLines } from "diff"
import DESCRIPTION from "./search_replace.txt"
import { Bus } from "../bus"
import { FileWatcher } from "../file/watcher"
import { Format } from "../format"
import { InstanceState } from "@/effect/instance-state"
import { AppFileSystem } from "@nocowboy/core/filesystem"
import { File } from "../file"
import * as EncodedIO from "../nocowboy/tool/encoded-io"
import * as Encoding from "../nocowboy/encoding"
import * as Bom from "@/util/bom"
import { EditPort } from "../nocowboy/tool/edit-port"
import { trimDiff } from "./edit"
import { assertExternalDirectoryEffect } from "./external-directory"
import { filterDiagnostics } from "./diagnostics"
import { ConfigValidation } from "../nocowboy/config-validation"

const SEARCH_MARKER = "<<<<<<< SEARCH"
const SEPARATOR = "======="
const REPLACE_MARKER = ">>>>>>> REPLACE"

export interface SearchReplaceBlock {
  filePath: string
  search: string
  replace: string
}

export function parseSearchReplaceBlocks(input: string): SearchReplaceBlock[] {
  const normalized = input.replace(/\r\n/g, "\n")
  const blocks: SearchReplaceBlock[] = []
  const lines = normalized.split("\n")

  let i = 0
  while (i < lines.length) {
    const searchIdx = lines.findIndex((l, idx) => idx >= i && l.trimEnd() === SEARCH_MARKER)
    if (searchIdx === -1) break

    const filePath = lines[searchIdx - 1]?.trim()
    if (!filePath) {
      throw new Error("SEARCH block missing file path on line before <<<<<<< SEARCH")
    }

    const searchStart = searchIdx + 1
    const sepIdx = lines.findIndex((l, idx) => idx >= searchStart && l.trimEnd() === SEPARATOR)
    if (sepIdx === -1) {
      throw new Error(`SEARCH block for ${filePath} missing ======= separator`)
    }

    const replaceEnd = lines.findIndex((l, idx) => idx >= sepIdx + 1 && l.trimEnd() === REPLACE_MARKER)
    if (replaceEnd === -1) {
      throw new Error(`REPLACE block for ${filePath} missing >>>>>>> REPLACE marker`)
    }

    const search = lines.slice(searchStart, sepIdx).join("\n")
    const replace = lines.slice(sepIdx + 1, replaceEnd).join("\n")

    blocks.push({ filePath, search, replace })
    i = replaceEnd + 1
  }

  if (blocks.length === 0) {
    throw new Error("No valid SEARCH/REPLACE blocks found")
  }

  return blocks
}

export const Parameters = Schema.Struct({
  blocks: Schema.String.annotate({
    description:
      "One or more Aider-style SEARCH/REPLACE blocks. Each block has a file path, <<<<<<< SEARCH, the exact code to find, =======, the replacement code, and >>>>>>> REPLACE. The SEARCH text must match exactly one location; multiple blocks for the same file apply in order.",
  }),
})

interface PreparedEdit {
  filePath: string
  oldContent: string
  newFullContent: string
  diff: string
  additions: number
  deletions: number
  encoding: string
  bom: boolean
}

/** One file's blocks, in the order they appeared in the call. */
interface FileGroup {
  blocks: Array<{ search: string; replace: string }>
}

export const SearchReplaceTool = Tool.define(
  "search_replace",
  Effect.gen(function* () {
    const lsp = yield* LSP.Service
    const afs = yield* AppFileSystem.Service
    const format = yield* Format.Service
    const bus = yield* Bus.Service

    const run = Effect.fn("SearchReplaceTool.execute")(function* (
      params: Schema.Schema.Type<typeof Parameters>,
      ctx: Tool.Context,
    ) {
      if (!params.blocks) {
        return yield* Effect.fail(new Error("blocks is required"))
      }

      let parsed: SearchReplaceBlock[]
      try {
        parsed = parseSearchReplaceBlocks(params.blocks)
      } catch (error) {
        return yield* Effect.fail(new Error(`search_replace verification failed: ${error}`))
      }

      const instance = yield* InstanceState.context

      // Group blocks by resolved file path, preserving first-seen order, so a
      // file is read once and its blocks apply sequentially (batch contract).
      const order: string[] = []
      const groups = new Map<string, FileGroup>()
      for (const block of parsed) {
        const filePath = path.isAbsolute(block.filePath)
          ? block.filePath
          : path.join(instance.directory, block.filePath)

        yield* assertExternalDirectoryEffect(ctx, filePath)

        let group = groups.get(filePath)
        if (!group) {
          group = { blocks: [] }
          groups.set(filePath, group)
          order.push(filePath)
        }
        group.blocks.push({ search: block.search, replace: block.replace })
      }

      const edits: PreparedEdit[] = []
      let totalDiff = ""

      for (const filePath of order) {
        const group = groups.get(filePath)!

        const stats = yield* afs.stat(filePath).pipe(Effect.catch(() => Effect.succeed(undefined)))
        if (!stats || stats.type === "Directory") {
          return yield* Effect.fail(
            new Error(`search_replace verification failed: File not found: ${filePath}`),
          )
        }

        const read = yield* EncodedIO.read(filePath).pipe(
          Effect.catch((error) =>
            Effect.fail(
              new Error(
                `search_replace verification failed: ${error instanceof Error ? error.message : String(error)}`,
              ),
            ),
          ),
        )
        const source = Bom.split(read.text)

        // The parser normalizes block line endings to LF; re-apply the file's
        // own ending so exact matching works on CRLF files too.
        const ending = source.text.includes("\r\n") ? "\r\n" : "\n"
        const blocksForFile = group.blocks.map((b) => ({
          search: ending === "\r\n" ? b.search.replaceAll("\n", "\r\n") : b.search,
          replace: ending === "\r\n" ? b.replace.replaceAll("\n", "\r\n") : b.replace,
        }))

        let contentNew: string
        try {
          contentNew = EditPort.applyBlocks(source.text, blocksForFile, filePath).content
        } catch (error) {
          return yield* Effect.fail(
            new Error(
              `search_replace verification failed: ${error instanceof Error ? error.message : String(error)}`,
            ),
          )
        }

        const diff = trimDiff(createTwoFilesPatch(filePath, filePath, source.text, contentNew))

        let additions = 0
        let deletions = 0
        for (const change of diffLines(source.text, contentNew)) {
          if (change.added) additions += change.count || 0
          if (change.removed) deletions += change.count || 0
        }

        edits.push({
          filePath,
          oldContent: source.text,
          newFullContent: contentNew,
          diff,
          additions,
          deletions,
          encoding: read.encoding,
          bom: source.bom,
        })

        totalDiff += diff + "\n"
      }

      const files = edits.map((e) => ({
        filePath: e.filePath,
        relativePath: path.relative(instance.worktree, e.filePath).replaceAll("\\", "/"),
        type: "update" as const,
        patch: e.diff,
        additions: e.additions,
        deletions: e.deletions,
      }))

      const relativePaths = edits.map((e) =>
        path.relative(instance.worktree, e.filePath).replaceAll("\\", "/"),
      )

      yield* ctx.ask({
        permission: "edit",
        patterns: relativePaths,
        always: ["*"],
        metadata: {
          filepath: relativePaths.join(", "),
          diff: totalDiff,
          files,
        },
      })

      // Commit the whole batch through the EditPort contract: stale-read guard
      // for every file before the first write, then write with rollback so a
      // mid-batch failure cannot leave a half-applied state.
      const plans: EditPort.EditPlan[] = edits.map((e) => {
        const next = Bom.split(e.newFullContent)
        return {
          filePath: e.filePath,
          oldContent: e.oldContent,
          newContent: next.text,
          encoding: e.encoding,
          bom: e.bom || next.bom,
        }
      })

      const io: EditPort.BatchIO = {
        readText: async (filePath) => Bom.split((await Encoding.read(filePath)).text).text,
        writeText: async (filePath, text, encoding, bom) =>
          Encoding.write(filePath, Bom.join(text, bom), encoding),
      }

      yield* Effect.promise(() => EditPort.commitBatch(plans, io))

      for (const plan of plans) {
        if (yield* format.file(plan.filePath)) {
          yield* Bom.syncFile(afs, plan.filePath, plan.bom)
        }

        yield* bus.publish(File.Event.Edited, { file: plan.filePath })
        yield* bus.publish(FileWatcher.Event.Updated, {
          file: plan.filePath,
          event: "change",
        })
      }

      const changedPaths: string[] = []
      for (const edit of edits) {
        changedPaths.push(AppFileSystem.normalizePath(edit.filePath))
        yield* lsp.touchFile(edit.filePath, "document")
      }

      const diagnostics = yield* lsp.diagnostics()

      const summaryLines = edits.map(
        (e) => `M ${path.relative(instance.worktree, e.filePath).replaceAll("\\", "/")}`,
      )
      let output = `Success. Updated the following files:\n${summaryLines.join("\n")}`

      for (const edit of edits) {
        const block = LSP.Diagnostic.report(
          edit.filePath,
          diagnostics[AppFileSystem.normalizePath(edit.filePath)] ?? [],
        )
        if (block) {
          const rel = path.relative(instance.worktree, edit.filePath).replaceAll("\\", "/")
          output += `\n\nLSP errors detected in ${rel}, please fix:\n${block}`
        }
        output += yield* Effect.promise(() => ConfigValidation.check(edit.filePath))
      }

      return {
        title: output,
        metadata: {
          diff: totalDiff,
          files,
          diagnostics: filterDiagnostics(diagnostics, changedPaths),
        },
        output,
      }
    })

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
        run(params, ctx).pipe(Effect.orDie),
    }
  }),
)
