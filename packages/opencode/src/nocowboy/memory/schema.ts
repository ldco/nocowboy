import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"

export const MemoryFtsTable = sqliteTable(
  "memory_fts",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    path: text().notNull().unique(),
    scope: text().notNull(),
    scope_id: text().notNull().default(""),
    type: text().notNull(),
    body: text().notNull(),
    fingerprint: text().notNull(),
    last_indexed_at: integer().notNull(),
  },
  (table) => [
    index("memory_fts_scope_idx").on(table.scope, table.scope_id),
    index("memory_fts_type_idx").on(table.type),
  ],
)

export const MEMORY_FTS_CREATE = `
CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts_idx USING fts5(
  path, scope, scope_id, type, body,
  content='memory_fts',
  content_rowid='id',
  tokenize='porter unicode61'
)
`

export const MEMORY_FTS_TRIGGERS = `
CREATE TRIGGER IF NOT EXISTS memory_fts_ai AFTER INSERT ON memory_fts BEGIN
  INSERT INTO memory_fts_idx(rowid, path, scope, scope_id, type, body)
  VALUES (new.id, new.path, new.scope, new.scope_id, new.type, new.body);
END;
CREATE TRIGGER IF NOT EXISTS memory_fts_ad AFTER DELETE ON memory_fts BEGIN
  INSERT INTO memory_fts_idx(memory_fts_idx, rowid, path, scope, scope_id, type, body)
  VALUES('delete', old.id, old.path, old.scope, old.scope_id, old.type, old.body);
END;
CREATE TRIGGER IF NOT EXISTS memory_fts_au AFTER UPDATE ON memory_fts BEGIN
  INSERT INTO memory_fts_idx(memory_fts_idx, rowid, path, scope, scope_id, type, body)
  VALUES('delete', old.id, old.path, old.scope, old.scope_id, old.type, old.body);
  INSERT INTO memory_fts_idx(rowid, path, scope, scope_id, type, body)
  VALUES (new.id, new.path, new.scope, new.scope_id, new.type, new.body);
END;
`
