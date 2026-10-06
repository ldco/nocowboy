/**
 * EditPort — the explicit contract for SEARCH/REPLACE style file editing.
 *
 * Three semantics that the search/replace path must never leave implicit:
 *
 *  - **match**: the SEARCH text must match exactly and *uniquely*. A string that
 *    occurs more than once is ambiguous — editing the first occurrence silently
 *    edits the wrong place — so it is an error, not a guess.
 *  - **batch**: several blocks for the same file apply sequentially, each against
 *    the content produced by the previous one, in the order they were written.
 *  - **stale-read / partial-failure**: the file is validated against the exact
 *    bytes it was read from immediately before the first write, and if a write
 *    fails every file already written in the batch is restored. A batch is *not*
 *    a cross-file transaction, but it never leaves a half-applied state behind.
 *
 * This module is pure apart from the `BatchIO` it is handed, so the whole
 * contract is unit-testable without the engine, the filesystem, or a tool layer.
 */

export namespace EditPort {
  export type EditErrorCode = "match-not-found" | "duplicate-match" | "empty-search" | "stale-read" | "write-failed"

  export class EditError extends Error {
    readonly code: EditErrorCode
    constructor(code: EditErrorCode, message: string) {
      super(message)
      this.name = "EditError"
      this.code = code
    }
  }

  /** Locate `search` in `content`, requiring exactly one occurrence. */
  export function findMatch(content: string, search: string, filePath: string): number {
    if (search.length === 0) {
      throw new EditError("empty-search", `Empty SEARCH block for ${filePath}. The SEARCH text must not be empty.`)
    }
    const index = content.indexOf(search)
    if (index === -1) {
      throw new EditError(
        "match-not-found",
        `Could not find SEARCH block content in ${filePath}. The search text must match exactly, including whitespace and indentation.`,
      )
    }
    const duplicate = content.indexOf(search, index + search.length)
    if (duplicate !== -1) {
      throw new EditError(
        "duplicate-match",
        `Found multiple matches for the SEARCH block in ${filePath} (offsets ${index} and ${duplicate}). ` +
          `The block must match exactly one location — include more surrounding context to make it unique.`,
      )
    }
    return index
  }

  /** Apply a single block to `content`, replacing its unique match. */
  export function applyBlock(content: string, search: string, replace: string, filePath: string): string {
    const index = findMatch(content, search, filePath)
    return content.substring(0, index) + replace + content.substring(index + search.length)
  }

  /**
   * Apply every block for one file in order. Each block is matched against the
   * content produced by the previous block, so two blocks touching adjacent or
   * overlapping regions compose deterministically.
   */
  export function applyBlocks(
    content: string,
    blocks: ReadonlyArray<{ search: string; replace: string }>,
    filePath: string,
  ): { content: string; replaced: number } {
    let next = content
    for (const block of blocks) next = applyBlock(next, block.search, block.replace, filePath)
    return { content: next, replaced: blocks.length }
  }

  /** One file's planned change, in the encoding it was read with. */
  export interface EditPlan {
    filePath: string
    /** File content as read, BOM stripped. */
    oldContent: string
    /** Desired content, BOM stripped. */
    newContent: string
    encoding: string
    bom: boolean
  }

  /** The side-effecting operations `commitBatch` needs, injected for testability. */
  export interface BatchIO {
    /** Read a file as UTF-decoded text with the BOM stripped. Throws if unreadable. */
    readText(filePath: string): Promise<string>
    /** Write text (BOM-stripped) back in the given encoding, re-emitted with `bom`. */
    writeText(filePath: string, text: string, encoding: string, bom: boolean): Promise<void>
  }

  /**
   * Validate every plan against the on-disk bytes, then write them. If any file
   * changed since it was read (stale read) nothing is written. If a write fails,
   * every file already written in this batch is restored to its pre-edit content,
   * so the failure cannot leave a half-applied batch behind.
   */
  export async function commitBatch(plans: ReadonlyArray<EditPlan>, io: BatchIO): Promise<void> {
    // 1. Stale-read guard: all validation before any write.
    for (const plan of plans) {
      const current = await io.readText(plan.filePath)
      if (current !== plan.oldContent) {
        throw new EditError(
          "stale-read",
          `${plan.filePath} changed on disk after it was read (stale read). Re-read the file and retry; no changes were written.`,
        )
      }
    }

    // 2. Write with rollback.
    const written: EditPlan[] = []
    try {
      for (const plan of plans) {
        await io.writeText(plan.filePath, plan.newContent, plan.encoding, plan.bom)
        written.push(plan)
      }
    } catch (error) {
      const restored: string[] = []
      const failed: string[] = []
      for (const plan of [...written].reverse()) {
        try {
          await io.writeText(plan.filePath, plan.oldContent, plan.encoding, plan.bom)
          restored.push(plan.filePath)
        } catch {
          failed.push(plan.filePath)
        }
      }
      const cause = error instanceof Error ? error.message : String(error)
      const detail = failed.length
        ? `restored ${restored.length} file(s); could NOT restore ${failed.join(", ")}`
        : `restored ${restored.length} already-written file(s)`
      throw new EditError("write-failed", `Edit batch failed: ${cause}. Rolled back: ${detail}.`)
    }
  }
}
