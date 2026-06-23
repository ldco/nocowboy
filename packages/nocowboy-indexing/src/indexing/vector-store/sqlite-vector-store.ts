import type { IVectorStore, PointStruct, Payload, VectorStoreSearchResult } from "../interfaces"
import { DEFAULT_MAX_SEARCH_RESULTS, DEFAULT_SEARCH_MIN_SCORE } from "../constants"
import { Log } from "../../util/log"

const log = Log.create({ service: "sqlite-store" })

export interface SqliteDatabase {
  exec(sql: string): void
  prepare(sql: string): {
    all(...params: unknown[]): unknown[]
    get(...params: unknown[]): unknown
    run(...params: unknown[]): void
  }
}

export class SqliteVectorStore implements IVectorStore {
  private readonly db: SqliteDatabase
  private readonly table: string
  private readonly meta: string
  private readonly size: number

  constructor(db: SqliteDatabase, table: string, vectorSize: number) {
    this.db = db
    this.table = table
    this.meta = `${table}_meta`
    this.size = vectorSize
  }

  async initialize(): Promise<boolean> {
    const existed = await this.collectionExists()
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS "${this.table}" (
        id TEXT PRIMARY KEY,
        vector TEXT NOT NULL,
        payload TEXT,
        filePath TEXT
      )
    `)
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_${this.table}_filePath ON "${this.table}" (filePath)`)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS "${this.meta}" (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `)
    return !existed
  }

  async upsertPoints(points: PointStruct[]): Promise<void> {
    if (points.length === 0) return
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO "${this.table}" (id, vector, payload, filePath) VALUES (?, ?, ?, ?)`,
    )
    for (const point of points) {
      if (!this.validPayload(point.payload)) continue
      stmt.run(
        point.id,
        JSON.stringify(point.vector),
        JSON.stringify(point.payload),
        point.payload.filePath,
      )
    }
  }

  async search(
    queryVector: number[],
    directoryPrefix?: string,
    minScore?: number,
    maxResults?: number,
  ): Promise<VectorStoreSearchResult[]> {
    const min = minScore ?? DEFAULT_SEARCH_MIN_SCORE
    const limit = maxResults ?? DEFAULT_MAX_SEARCH_RESULTS

    let sql = `SELECT id, vector, payload FROM "${this.table}"`
    const params: string[] = []

    if (directoryPrefix) {
      sql += ` WHERE filePath LIKE ?`
      params.push(`${directoryPrefix.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`)
    }

    const rows = this.db.prepare(sql).all(...params) as Array<{
      id: string
      vector: string
      payload: string | null
    }>

    const scored = rows
      .map((row) => {
        const v = this.parseVector(row.vector)
        const score = v ? this.cosine(queryVector, v) : 0
        return { id: row.id, score, raw: row.payload }
      })
      .filter((item) => item.score >= min)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => ({
        id: item.id,
        score: item.score,
        payload: item.raw ? (JSON.parse(item.raw) as Payload) : undefined,
      }))

    return scored
  }

  async deletePointsByFilePath(filePath: string): Promise<void> {
    this.db.prepare(`DELETE FROM "${this.table}" WHERE filePath = ?`).run(filePath)
  }

  async deletePointsByMultipleFilePaths(filePaths: string[]): Promise<void> {
    if (filePaths.length === 0) return
    const placeholders = filePaths.map(() => "?").join(", ")
    this.db.prepare(`DELETE FROM "${this.table}" WHERE filePath IN (${placeholders})`).run(...filePaths)
  }

  async clearCollection(): Promise<void> {
    this.db.exec(`DELETE FROM "${this.table}"`)
    this.db.exec(`DELETE FROM "${this.meta}"`)
  }

  async deleteCollection(): Promise<void> {
    this.db.exec(`DROP TABLE IF EXISTS "${this.table}"`)
    this.db.exec(`DROP TABLE IF EXISTS "${this.meta}"`)
  }

  async collectionExists(): Promise<boolean> {
    const row = this.db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
      .get(this.table) as unknown
    return row !== undefined && row !== null
  }

  async hasIndexedData(): Promise<boolean> {
    const row = this.db
      .prepare(`SELECT COUNT(*) as cnt FROM "${this.table}"`)
      .get() as { cnt: number } | undefined
    const count = row?.cnt ?? 0
    if (count === 0) return false
    const meta = this.db
      .prepare(`SELECT value FROM "${this.meta}" WHERE key = ?`)
      .get("indexing_complete") as { value: string } | undefined
    return meta?.value === "true"
  }

  async markIndexingComplete(): Promise<void> {
    this.db
      .prepare(`INSERT OR REPLACE INTO "${this.meta}" (key, value) VALUES (?, ?)`)
      .run("indexing_complete", "true")
  }

  async markIndexingIncomplete(): Promise<void> {
    this.db
      .prepare(`INSERT OR REPLACE INTO "${this.meta}" (key, value) VALUES (?, ?)`)
      .run("indexing_complete", "false")
  }

  private parseVector(raw: string): number[] | null {
    try {
      const v = JSON.parse(raw)
      if (Array.isArray(v) && v.length > 0 && v.every((n) => typeof n === "number")) return v
      return null
    } catch {
      log.warn("failed to parse vector JSON", { raw: raw.slice(0, 64) })
      return null
    }
  }

  private dot(a: number[], b: number[]): number {
    let sum = 0
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
    return sum
  }

  private norm(v: number[]): number {
    let sum = 0
    for (let i = 0; i < v.length; i++) sum += v[i] * v[i]
    return Math.sqrt(sum)
  }

  private cosine(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    const na = this.norm(a)
    const nb = this.norm(b)
    if (na === 0 || nb === 0) return 0
    const score = this.dot(a, b) / (na * nb)
    return Math.max(0, Math.min(1, score))
  }

  private validPayload(payload: Record<string, unknown> | null | undefined): payload is Payload {
    if (!payload) return false
    return (
      "filePath" in payload &&
      "fileHash" in payload &&
      "codeChunk" in payload &&
      "startLine" in payload &&
      "endLine" in payload
    )
  }
}
