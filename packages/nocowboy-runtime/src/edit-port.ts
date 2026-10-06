import { Schema } from "effect"

/**
 * EditPort — the SEARCH/REPLACE edit contract: unique match, ordered batch,
 * stale-read guard and rollback. The engine provides the transport; the core
 * names the plan and the error taxonomy.
 */

export const EditErrorCode = Schema.Literals([
  "match-not-found",
  "duplicate-match",
  "empty-search",
  "stale-read",
  "write-failed",
])
export type EditErrorCode = Schema.Schema.Type<typeof EditErrorCode>

export const EditPlan = Schema.Struct({
  filePath: Schema.String,
  oldContent: Schema.String,
  newContent: Schema.String,
  encoding: Schema.String,
  bom: Schema.Boolean,
})
export type EditPlan = Schema.Schema.Type<typeof EditPlan>

export const EditBlock = Schema.Struct({
  search: Schema.String,
  replace: Schema.String,
})
export type EditBlock = Schema.Schema.Type<typeof EditBlock>

export interface EditPort {
  /** Locate a unique match; throws on missing/duplicate/empty. */
  findMatch(content: string, search: string, filePath: string): number
  /** Apply a file's blocks in order against the evolving content. */
  applyBlocks(
    content: string,
    blocks: ReadonlyArray<EditBlock>,
    filePath: string,
  ): { content: string; replaced: number }
  /** Commit a batch: stale-read guard before any write, rollback on failure. */
  commitBatch(plans: ReadonlyArray<EditPlan>): Promise<void>
}
