/**
 * Session Metrics — сбор метрик по сессиям.
 *
 * Сохраняет в SQLite: tool_counts (JSON), token_usage, длительность, агенты.
 * Вызывается в onSessionEnded.
 */

import { join } from "path"
import { homedir } from "os"

interface SessionMetrics {
  sessionID: string
  title: string
  agent: string
  startTime: number
  endTime: number
  durationMs: number
  messageCount: number
  toolCallCount: number
  inputTokens: number
  outputTokens: number
}

const METRICS_TABLE = `
  CREATE TABLE IF NOT EXISTS session_metrics (
    session_id TEXT PRIMARY KEY,
    title TEXT,
    agent TEXT,
    start_time INTEGER,
    end_time INTEGER,
    duration_ms INTEGER,
    message_count INTEGER,
    tool_call_count INTEGER,
    input_tokens INTEGER,
    output_tokens INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )
`

function getDb() {
  const { Database } = require("bun:sqlite") as typeof import("bun:sqlite")
  const dbPath = join(homedir(), ".local/share/nocowboy/storage/nocowboy.db")
  const db = new Database(dbPath)
  db.exec(METRICS_TABLE)
  return db
}

/**
 * Save session metrics to the database.
 */
export function saveMetrics(metrics: SessionMetrics): void {
  try {
    const db = getDb()
    try {
      db.prepare(`
        INSERT OR REPLACE INTO session_metrics 
        (session_id, title, agent, start_time, end_time, duration_ms, message_count, tool_call_count, input_tokens, output_tokens)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        metrics.sessionID,
        metrics.title,
        metrics.agent,
        metrics.startTime,
        metrics.endTime,
        metrics.durationMs,
        metrics.messageCount,
        metrics.toolCallCount,
        metrics.inputTokens,
        metrics.outputTokens,
      )
    } finally {
      db.close()
    }
  } catch {
    // Metrics are non-critical — silently ignore errors
  }
}

/**
 * Получить агрегированные метрики для дашборда.
 */
export function getAggregatedMetrics(): {
  totalSessions: number
  totalTokens: number
  totalDuration: number
  avgTokensPerSession: number
  topTools: string
} {
  try {
    const db = getDb()
    try {
      const total = db.query("SELECT COUNT(*) as cnt FROM session_metrics").get() as { cnt: number }
      const tokens = db.query("SELECT COALESCE(SUM(input_tokens + output_tokens), 0) as t FROM session_metrics").get() as { t: number }
      const duration = db.query("SELECT COALESCE(SUM(duration_ms), 0) as d FROM session_metrics").get() as { d: number }

      return {
        totalSessions: total.cnt,
        totalTokens: tokens.t,
        totalDuration: duration.d,
        avgTokensPerSession: total.cnt > 0 ? Math.round(tokens.t / total.cnt) : 0,
        topTools: JSON.stringify([]),
      }
    } finally {
      db.close()
    }
  } catch {
    return { totalSessions: 0, totalTokens: 0, totalDuration: 0, avgTokensPerSession: 0, topTools: "[]" }
  }
}
