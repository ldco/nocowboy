import { TASK_TABLE_CREATE, TASK_EVENT_TABLE_CREATE } from "./task.sql"
import type { Task, TaskEvent, TaskStatus } from "./schema"

const DAY_MS = 24 * 60 * 60 * 1000

function db() {
  const { Database } = require("bun:sqlite") as typeof import("bun:sqlite")
  const { homedir } = require("os") as typeof import("os")
  const { join } = require("path") as typeof import("path")
  const dbPath = join(homedir(), ".local/share/nocowboy/storage/nocowboy.db")
  const database = new Database(dbPath)
  database.exec("PRAGMA journal_mode=WAL")
  database.exec(TASK_TABLE_CREATE)
  database.exec(TASK_EVENT_TABLE_CREATE)
  return database
}

function dbQuery<T>(fn: (database: ReturnType<typeof db>) => T): T {
  const database = db()
  try {
    return fn(database)
  } finally {
    database.close()
  }
}

function nextChildId(parentId: string | undefined, siblings: string[]): string {
  const prefix = parentId ? `${parentId}.` : "T"
  const used = siblings
    .filter((s) => (parentId ? s.startsWith(prefix) : /^T\d+$/.test(s)))
    .map((s) => {
      const tail = s.slice(prefix.length)
      return /^\d+$/.test(tail) ? Number(tail) : 0
    })
  const next = used.length > 0 ? Math.max(...used) + 1 : 1
  return `${prefix}${next}`
}

function insertEvent(
  database: ReturnType<typeof db>,
  session_id: string,
  task_id: string,
  kind: TaskEvent["kind"],
  summary: string | undefined,
  now: number,
) {
  database
    .prepare("INSERT INTO task_event (session_id, task_id, at, kind, summary) VALUES (?, ?, ?, ?, ?)")
    .run(session_id, task_id, now, kind, summary ?? null)
}

export namespace TaskRegistry {
  export function ensureTables(): void {
    dbQuery(() => {})
  }

  export function create(input: {
    session_id: string
    summary: string
    parent_id?: string
    owner?: string
  }): Task {
    return dbQuery((database) => {
      const now = Date.now()
      const siblings = database
        .prepare("SELECT id FROM task WHERE session_id = ? AND parent_task_id IS ?")
        .all(input.session_id, input.parent_id ?? null) as { id: string }[]
      const id = nextChildId(input.parent_id, siblings.map((s) => s.id))

      database
        .prepare(
          "INSERT INTO task (id, session_id, parent_task_id, status, summary, owner, created_at, last_event_at) VALUES (?, ?, ?, 'open', ?, ?, ?, ?)",
        )
        .run(id, input.session_id, input.parent_id ?? null, input.summary, input.owner ?? null, now, now)

      insertEvent(database, input.session_id, id, "created", undefined, now)

      return {
        id,
        session_id: input.session_id,
        parent_task_id: input.parent_id,
        status: "open" as TaskStatus,
        summary: input.summary,
        owner: input.owner,
        created_at: now,
        last_event_at: now,
      }
    })
  }

  export function list(input: {
    session_id?: string
    status?: TaskStatus
    owner?: string
    include_terminal?: boolean
    include_archived?: boolean
  }): Task[] {
    return dbQuery((database) => {
      const now = Date.now()
      const conditions: string[] = []
      const params: any[] = []

      if (input.session_id) {
        conditions.push("session_id = ?")
        params.push(input.session_id)
      }
      if (input.status) {
        conditions.push("status = ?")
        params.push(input.status)
      }
      if (input.owner) {
        conditions.push("owner = ?")
        params.push(input.owner)
      }
      if (!input.include_terminal) {
        conditions.push("status IN ('open', 'in_progress', 'blocked')")
      }
      if (!input.include_archived) {
        conditions.push("(cleanup_after IS NULL OR cleanup_after > ?)")
        params.push(now)
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
      const rows = database.prepare(`SELECT * FROM task ${where} ORDER BY created_at`).all(...params) as any[]
      return rows.map(fromRow)
    })
  }

  export function get(input: { session_id: string; id: string }): Task | undefined {
    return dbQuery((database) => {
      const row = database
        .prepare("SELECT * FROM task WHERE session_id = ? AND id = ?")
        .get(input.session_id, input.id) as any
      return row ? fromRow(row) : undefined
    })
  }

  export function events(input: { session_id: string; task_id: string }): TaskEvent[] {
    return dbQuery((database) => {
      const rows = database
        .prepare("SELECT * FROM task_event WHERE session_id = ? AND task_id = ? ORDER BY at")
        .all(input.session_id, input.task_id) as any[]
      return rows.map(fromEventRow)
    })
  }

  export function block(input: { session_id: string; id: string; event_summary?: string }): Task | undefined {
    return updateStatus(input.session_id, input.id, "blocked", input.event_summary)
  }

  export function unblock(input: { session_id: string; id: string; event_summary?: string }): Task | undefined {
    return updateStatus(input.session_id, input.id, "open", input.event_summary)
  }

  export function start(input: {
    session_id: string
    id: string
    owner?: string
    event_summary?: string
  }): Task | undefined {
    return dbQuery((database) => {
      const now = Date.now()
      const existing = database
        .prepare("SELECT * FROM task WHERE session_id = ? AND id = ?")
        .get(input.session_id, input.id) as any
      if (!existing) return undefined

      if (existing.status === "done" || existing.status === "abandoned") return fromRow(existing)

      const owner = input.owner ?? existing.owner
      if (existing.status === "in_progress" && owner === existing.owner) return fromRow(existing)

      database
        .prepare("UPDATE task SET status = 'in_progress', owner = ?, last_event_at = ? WHERE session_id = ? AND id = ?")
        .run(owner ?? null, now, input.session_id, input.id)

      insertEvent(database, input.session_id, input.id, "started", input.event_summary, now)

      return database
        .prepare("SELECT * FROM task WHERE session_id = ? AND id = ?")
        .get(input.session_id, input.id) as any
        ? fromRow(
            database
              .prepare("SELECT * FROM task WHERE session_id = ? AND id = ?")
              .get(input.session_id, input.id) as any,
          )
        : undefined
    })
  }

  export function done(input: { session_id: string; id: string; event_summary?: string }): Task | undefined {
    return terminalUpdate(input.session_id, input.id, "done", input.event_summary)
  }

  export function abandon(input: { session_id: string; id: string; event_summary?: string }): Task | undefined {
    return terminalUpdate(input.session_id, input.id, "abandoned", input.event_summary)
  }

  export function rename(input: { session_id: string; id: string; summary: string }): Task | undefined {
    return dbQuery((database) => {
      const now = Date.now()
      database
        .prepare("UPDATE task SET summary = ?, last_event_at = ? WHERE session_id = ? AND id = ?")
        .run(input.summary, now, input.session_id, input.id)
      insertEvent(database, input.session_id, input.id, "renamed", input.summary, now)
      const row = database
        .prepare("SELECT * FROM task WHERE session_id = ? AND id = ?")
        .get(input.session_id, input.id) as any
      return row ? fromRow(row) : undefined
    })
  }
}

function fromRow(row: any): Task {
  return {
    id: row.id,
    session_id: row.session_id,
    parent_task_id: row.parent_task_id ?? undefined,
    status: row.status,
    summary: row.summary,
    owner: row.owner ?? undefined,
    created_at: row.created_at,
    last_event_at: row.last_event_at,
    ended_at: row.ended_at ?? undefined,
    cleanup_after: row.cleanup_after ?? undefined,
  }
}

function fromEventRow(row: any): TaskEvent {
  return {
    id: row.id,
    task_id: row.task_id,
    at: row.at,
    kind: row.kind,
    summary: row.summary ?? undefined,
  }
}

function updateStatus(
  session_id: string,
  id: string,
  status: string,
  event_summary?: string,
): Task | undefined {
  return dbQuery((database) => {
    const now = Date.now()
    database
      .prepare("UPDATE task SET status = ?, last_event_at = ? WHERE session_id = ? AND id = ?")
      .run(status, now, session_id, id)
    insertEvent(database, session_id, id, status as TaskEvent["kind"], event_summary, now)
    const row = database
      .prepare("SELECT * FROM task WHERE session_id = ? AND id = ?")
      .get(session_id, id) as any
    return row ? fromRow(row) : undefined
  })
}

function terminalUpdate(
  session_id: string,
  id: string,
  status: "done" | "abandoned",
  event_summary?: string,
): Task | undefined {
  return dbQuery((database) => {
    const now = Date.now()
    const cleanupAfter = now + 7 * DAY_MS
    database
      .prepare(
        "UPDATE task SET status = ?, ended_at = ?, cleanup_after = ?, last_event_at = ? WHERE session_id = ? AND id = ?",
      )
      .run(status, now, cleanupAfter, now, session_id, id)
    insertEvent(database, session_id, id, status, event_summary, now)
    // Dependency chain: when a parent task reaches a terminal state, unblock
    // its children (they were blocked waiting on this task's completion).
    const children = database
      .prepare("SELECT id, status FROM task WHERE session_id = ? AND parent_task_id = ?")
      .all(session_id, id) as any[]
    for (const child of children) {
      if (child.status !== "blocked") continue
      database
        .prepare("UPDATE task SET status = 'open', last_event_at = ? WHERE session_id = ? AND id = ?")
        .run(now, session_id, child.id)
      insertEvent(database, session_id, child.id, "unblocked", `parent ${id} ${status}`, now)
    }
    const row = database
      .prepare("SELECT * FROM task WHERE session_id = ? AND id = ?")
      .get(session_id, id) as any
    return row ? fromRow(row) : undefined
  })
}
