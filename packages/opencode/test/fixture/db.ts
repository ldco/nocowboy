import { Database } from "@/storage/db"
import { disposeAllInstances } from "./fixture"

/**
 * Reset database state — TRUNCATE all tables instead of closing the connection.
 *
 * nocowboy_change: Soft reset вместо Database.close().
 * Database.close() убивает :memory: БД для ВСЕХ параллельных тестов.
 * TRUNCATE (DELETE FROM) очищает данные, не закрывая соединение.
 */
export async function resetDatabase() {
  // kilocode_change start
  const path = Database.getPath()
  const testDbPath = process.env["NOCOWBOY_TEST_DB_PATH"]
  const isTestDb =
    path === ":memory:" ||
    (testDbPath && path === testDbPath) ||
    (path.startsWith("/tmp/opencode-test-data-"))
  if (!isTestDb) throw new Error(`Refusing to reset non-test database: ${path}`)
  // kilocode_change end

  await disposeAllInstances().catch(() => undefined)

  // nocowboy_change: Soft reset — TRUNCATE вместо close
  // Database.close() закрывает соединение, что убивает :memory: БД.
  // Вместо этого очищаем все таблицы через DELETE FROM.
  try {
    const db = (Database as any).Client().$client
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_drizzle%'"
    ).all() as { name: string }[]

    for (const { name: table } of tables) {
      db.prepare(`DELETE FROM "${table}"`).run()
    }

    // Reset autoincrement sequences
    try { db.prepare("DELETE FROM sqlite_sequence").run() } catch {}
  } catch {
    // Fallback: если soft reset не сработал, делаем старый close
    Database.close()
  }
}
