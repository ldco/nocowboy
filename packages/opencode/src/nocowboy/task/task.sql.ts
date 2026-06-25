export const TASK_TABLE_CREATE = `
CREATE TABLE IF NOT EXISTS task (
  id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  parent_task_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  summary TEXT NOT NULL,
  owner TEXT,
  created_at INTEGER NOT NULL,
  last_event_at INTEGER NOT NULL,
  ended_at INTEGER,
  cleanup_after INTEGER,
  PRIMARY KEY (session_id, id)
);

CREATE INDEX IF NOT EXISTS task_session_idx ON task(session_id);
CREATE INDEX IF NOT EXISTS task_parent_idx ON task(session_id, parent_task_id);
CREATE INDEX IF NOT EXISTS task_status_idx ON task(status);
`

export const TASK_EVENT_TABLE_CREATE = `
CREATE TABLE IF NOT EXISTS task_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  kind TEXT NOT NULL,
  summary TEXT,
  FOREIGN KEY (session_id, task_id) REFERENCES task(session_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS task_event_task_idx ON task_event(session_id, task_id, at);
`
