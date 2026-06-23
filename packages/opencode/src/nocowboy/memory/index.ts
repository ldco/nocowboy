import { buildFtsQuery } from "./fts-query"
import type { Database as BunDatabase } from "bun:sqlite"

export interface MemorySearchResult {
  path: string
  snippet: string
  score: number
  scope: string
  type: string
}

export interface MemoryIndexInput {
  path: string
  scope: string
  type: string
  body: string
  scope_id?: string
}

export namespace MemoryService {
  function db(): BunDatabase {
    // Use the same database instance as the main app
    const { Database } = require("bun:sqlite")
    const home = require("os").homedir()
    const dbPath = require("path").join(home, ".local/share/kilo/storage/nocowboy.db")
    return new Database(dbPath)
  }

  export function search(query: string, opts?: {
    scope?: string
    type?: string
    limit?: number
  }): MemorySearchResult[] {
    const ftsQuery = buildFtsQuery(query)
    if (!ftsQuery) return []

    const database = db()
    try {
      const limit = opts?.limit ?? 10
      const conditions: string[] = []
      const params: (string | number)[] = [ftsQuery]

      if (opts?.scope) {
        conditions.push("memory_fts.scope = ?")
        params.push(opts.scope)
      }
      if (opts?.type) {
        conditions.push("memory_fts.type = ?")
        params.push(opts.type)
      }

      const whereClause = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : ""

      const sql = `
        SELECT memory_fts.path, memory_fts.scope, memory_fts.type,
               snippet(memory_fts_idx, 0, '<<', '>>', '...', 32) AS snippet,
               bm25(memory_fts_idx) AS score
        FROM memory_fts_idx
        JOIN memory_fts ON memory_fts.id = memory_fts_idx.rowid
        WHERE memory_fts_idx MATCH ?
        ${whereClause}
        ORDER BY score
        LIMIT ?
      `
      params.push(limit * 3)
      const rows = database.query(sql).all(...params) as any[]

      const mapped = rows.map((r: any) => ({
        path: r.path,
        snippet: r.snippet,
        score: -r.score, // BM25: lower = better; invert for higher = better
        scope: r.scope,
        type: r.type,
      }))

      if (mapped.length === 0) return []

      // Keep results scoring at least 15% of top hit
      const topScore = mapped[0].score
      const cutoff = topScore * 0.15
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
