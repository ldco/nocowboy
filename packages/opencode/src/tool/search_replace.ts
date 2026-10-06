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
import { Snapshot } from "@/snapshot"
import * as EncodedIO from "../nocowboy/tool/encoded-io"
import * as Bom from "@/util/bom"
import { trimDiff, buildFileDiff } from "./edit"
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

export interface FileEdit {
  filePath: string
  newFullContent: string
  diff: string
  additions: number
  deletions: number
}

/**
 * Locate the SEARCH text in the file. The contract is a UNIQUE exact match:
 *   - 0 matches → not found;
 *   - 2+ matches → ambiguous (a silent first-match edit is not uniqueness).
 * Returns the byte offset of the single match.
 */
export function findUniqueIndex(content: string, search: string, filePath: string): number {
  const first = content.indexOf(search)
  if (first === -1) {
    throw new Error(
      `Could not find SEARCH block content in ${filePath}. The search text must match exactly, including whitespace and indentation.`,
    )
  }
  // Search from first+1 (not first+len): an occurrence that OVERLAPS the first
  // (e.g. "aa" twice in "aaa") is still a second match and must be flagged.
  if (content.indexOf(search, first + 1) !== -1) {
    throw new Error(
      `SEARCH block is ambiguous in ${filePath}: the search text matches multiple locations. Add surrounding context so it matches exactly one place.`,
    )
  }
  return first
}

function prepareFileEdit(
  filePath: string,
  block: SearchReplaceBlock,
  contentOld: string,
): FileEdit {
  const ending = contentOld.includes("\r\n") ? "\r\n" : "\n"
  const old = ending === "\r\n" ? block.search.replaceAll("\n", "\r\n") : block.search
  const replacement = ending === "\r\n" ? block.replace.replaceAll("\n", "\r\n") : block.replace

  const index = findUniqueIndex(contentOld, old, filePath)

  const contentNew = contentOld.substring(0, index) + replacement + contentOld.substring(index + old.length)

  const diff = trimDiff(
    createTwoFilesPatch(filePath, filePath, contentOld, contentNew),
  )

  let additions = 0
  let deletions = 0
  for (const change of diffLines(contentOld, contentNew)) {
    if (change.added) additions += change.count || 0
    if (change.removed) deletions += change.count || 0
  }

  return { filePath, newFullContent: contentNew, diff, additions, deletions }
}

export const Parameters = Schema.Struct({
  blocks: Schema.String.annotate({
    description:
      "One or more Aider-style SEARCH/REPLACE blocks. Each block has a file path, <<<<<<< SEARCH, the exact code to find, =======, the replacement code, and >>>>>>> REPLACE.",
  }),
})

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

      // Contract: blocks are grouped per file and applied sequentially against
      // the evolving content, then each file is written exactly once. All blocks
      // are resolved BEFORE any write, so a failing block leaves no partial
      // state, and a batch is not treated as an atomic transaction across files.
      const grouped = new Map<string, SearchReplaceBlock[]>()
      for (const block of parsed) {
        // Normalize so two spellings of the same path (_dir/./a_ vs _dir/a_) group together.
        const filePath = path.resolve(instance.directory, block.filePath)
        yield* assertExternalDirectoryEffect(ctx, filePath)
        const list = grouped.get(filePath)
        if (list) list.push(block)
        else grouped.set(filePath, [block])
      }

      const edits: Array<{
        filePath: string
        newFullContent: string
        oldContent: string
        diff: string
        additions: number
        deletions: number
        encoding: string
        bom: boolean
        filediff: Snapshot.FileDiff
      }> = []

      let totalDiff = ""

      for (const [filePath, blocks] of grouped) {
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

        let current = source.text
        let diff = ""
        let additions = 0
        let deletions = 0
        for (const block of blocks) {
          const fileEdit = prepareFileEdit(filePath, block, current)
          current = fileEdit.newFullContent
          diff += fileEdit.diff + "\n"
          additions += fileEdit.additions
          deletions += fileEdit.deletions
        }

        edits.push({
          filePath,
          newFullContent: current,
          oldContent: source.text,
          diff,
          additions,
          deletions,
          encoding: read.encoding,
          bom: source.bom,
          filediff: buildFileDiff(filePath, source.text, current),
        })

        totalDiff += diff
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

      for (const edit of edits) {
        const next = Bom.split(edit.newFullContent)
        const desiredBom = edit.bom || next.bom
        const contentNew = next.text

        yield* EncodedIO.write(edit.filePath, Bom.join(contentNew, desiredBom), edit.encoding)

        if (yield* format.file(edit.filePath)) {
          yield* Bom.syncFile(afs, edit.filePath, desiredBom)
        }

        yield* bus.publish(File.Event.Edited, { file: edit.filePath })
        yield* bus.publish(FileWatcher.Event.Updated, {
          file: edit.filePath,
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
