-- MiMo-Code memory FTS5 (MIT license, XiaomiMiMo/MiMo-Code)
-- Cross-session memory: full-text searchable project knowledge

CREATE TABLE IF NOT EXISTS memory_fts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL,
  scope_id TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL,
  body TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  last_indexed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS memory_fts_scope_idx ON memory_fts(scope, scope_id);
CREATE INDEX IF NOT EXISTS memory_fts_type_idx ON memory_fts(type);

-- FTS5 virtual table for full-text search with BM25 ranking
CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts_idx USING fts5(
  path, scope, scope_id, type, body,
  content='memory_fts',
  content_rowid='id',
  tokenize='porter unicode61'
);

-- Triggers to keep FTS5 index in sync
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
