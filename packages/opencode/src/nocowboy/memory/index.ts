import { buildFtsQuery } from "./fts-query"
import { reconcile } from "./reconcile"
import type { Database as BunDatabase } from "bun:sqlite"
import * as path from "node:path"
import * as os from "node:os"

const MEMORY_ROOT = path.join(os.homedir(), ".local/share/kilo/storage/memory")

export interface MemorySearchResult {
  path: string
  snippet: string
  score: number
  scope: string
  type: string
  scope_id?: string
}

export interface MemoryIndexInput {
  path: string
  scope: string
  type: string
  body: string
  scope_id?: string
}

export interface MemorySearchOptions {
  scope?: string
  scope_id?: string
  type?: string
  limit?: number
  /** Minimum BM25 score ratio relative to the top hit (default 0.15, 0 disables). */
  scoreFloor?: number
  /** When true, reconcile memory files before searching (default true). */
  reconcileFirst?: boolean
}

export namespace MemoryService {
  export function root(): string {
    return MEMORY_ROOT
  }

  function db(): BunDatabase {
    const { Database } = require("bun:sqlite")
    return new Database(path.join(MEMORY_ROOT, "..", "nocowboy.db"))
  }

  export function search(query: string, opts?: MemorySearchOptions): MemorySearchResult[] {
    // Lazy reconcile before search so the index is fresh.
    if (opts?.reconcileFirst ?? true) {
      try {
        reconcile()
      } catch {
        // non-critical — proceed with stale index
      }
    }

    const ftsQuery = buildFtsQuery(query)
    if (!ftsQuery) return []

    const database = db()
    try {
      const limit = opts?.limit ?? 10
      const scoreFloor = opts?.scoreFloor ?? 0.15
      const conditions: string[] = []
      const params: (string | number)[] = [ftsQuery]

      if (opts?.scope) {
        conditions.push("memory_fts.scope = ?")
        params.push(opts.scope)
      }
      if (opts?.scope_id) {
        conditions.push("memory_fts.scope_id = ?")
        params.push(opts.scope_id)
      }
      if (opts?.type) {
        conditions.push("memory_fts.type = ?")
        params.push(opts.type)
      }

      const whereClause = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : ""

      const sql = `
        SELECT memory_fts.path, memory_fts.scope, memory_fts.scope_id, memory_fts.type,
               snippet(memory_fts_idx, 0, '<<', '>>', '...', 32) AS snippet,
               bm25(memory_fts_idx) AS score
        FROM memory_fts_idx
        JOIN memory_fts ON memory_fts.id = memory_fts_idx.rowid
        WHERE memory_fts_idx MATCH ?
        ${whereClause}
        ORDER BY score
        LIMIT ?
      `
      const fetchLimit = Math.min(limit * 3, 50)
      params.push(fetchLimit)
      const rows = database.query(sql).all(...params) as any[]

      // FTS5 bm25() returns lower = better; invert for caller
      const mapped = rows.map((r: any) => ({
        path: r.path,
        snippet: r.snippet,
        score: -r.score,
        scope: r.scope,
        scope_id: r.scope_id ?? "",
        type: r.type,
      }))

      if (mapped.length === 0) return []

      // Relative score floor: drop rows scoring below `scoreFloor` of top hit
      const topScore = mapped[0].score
      const cutoff = scoreFloor > 0 ? topScore * scoreFloor : -Infinity
      // Always keep #1, filter trailing
      return mapped.filter((r, i) => i === 0 || r.score >= cutoff).slice(0, limit)
    } finally {
      database.close()
    }
  }

  export function index(input: MemoryIndexInput): void {
    const database = db()
    try {
      const fingerprint = `${input.body.length}-${Date.now()}`
      database.query(`
        INSERT INTO memory_fts (path, scope, scope_id, type, body, fingerprint, last_indexed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(path) DO UPDATE SET
          scope = excluded.scope,
          scope_id = excluded.scope_id,
          type = excluded.type,
          body = excluded.body,
          fingerprint = excluded.fingerprint,
          last_indexed_at = excluded.last_indexed_at
      `).run(
        input.path,
        input.scope,
        input.scope_id ?? "",
        input.type,
        input.body,
        fingerprint,
        Date.now(),
      )
    } finally {
      database.close()
    }
  }

  export function prune(paths: string[]): number {
    if (paths.length === 0) return 0
    const database = db()
    try {
      const placeholders = paths.map(() => "?").join(",")
      return database.query(`DELETE FROM memory_fts WHERE path NOT IN (${placeholders})`)
        .run(...paths).changes
    } finally {
      database.close()
    }
  }
}
