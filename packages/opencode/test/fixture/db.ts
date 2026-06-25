import { Database } from "@/storage/db"
import { disposeAllInstances } from "./fixture"

export async function resetDatabase() {
  // kilocode_change start
  // Closing the in-memory connection clears shared test state. Never reset a
  // disk-backed database because this helper can run without the test preload.
  const path = Database.getPath()
  const testDbPath = process.env["NOCOWBOY_TEST_DB_PATH"]
  const isTestDb =
    path === ":memory:" ||
    (testDbPath && path === testDbPath) ||
    (path.startsWith("/tmp/opencode-test-data-"))
  if (!isTestDb) throw new Error(`Refusing to reset non-test database: ${path}`)
  // kilocode_change end
  await disposeAllInstances().catch(() => undefined)
  Database.close()
}
