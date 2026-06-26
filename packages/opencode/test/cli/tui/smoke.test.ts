/**
 * Smoke test — verifies the TUI actually starts and renders.
 *
 * Catches regressions like:
 * - Missing @opentui/solid/preload (black screen)
 * - Context provider failures (TuiConfig error)
 * - Fatal startup crashes
 * - Database migration failures
 *
 * Spawns the TUI process via Bun.spawn, waits for startup output,
 * kills it, and checks accumulated stdout/stderr for success markers.
 */
import { afterAll, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import path from "node:path"

const STARTUP_WAIT = 5000
const OVERALL_TIMEOUT = 20_000

function getCwd() {
  let dir = import.meta.dir
  while (!existsSync(path.join(dir, "package.json"))) {
    const parent = path.dirname(dir)
    if (parent === dir) throw new Error("Cannot find package root")
    dir = parent
  }
  return dir
}

test("TUI starts, migrates database, and renders content", async () => {
  const cwd = getCwd()

  const proc = Bun.spawn({
    cmd: ["bun", "run", "--conditions=browser", "src/index.ts"],
    cwd,
    env: { ...process.env, NOCOWBOY_DB: ":memory:", FORCE_COLOR: "0" },
    stdout: "pipe",
    stderr: "pipe",
  })

  let stdout = ""
  let stderr = ""

  // Read until process exits or timeout
  const decoder = new TextDecoder()
  const reader = proc.stdout.getReader()
  const errReader = proc.stderr.getReader()

  const readLoop = (async () => {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      stdout += decoder.decode(value, { stream: true })
    }
  })()

  const errLoop = (async () => {
    while (true) {
      const { done, value } = await errReader.read()
      if (done) break
      stderr += decoder.decode(value, { stream: true })
    }
  })()

  // Wait for startup, then kill
  await Bun.sleep(STARTUP_WAIT)
  proc.kill("SIGTERM")

  // Final flush
  await Bun.sleep(500)
  reader.cancel()
  errReader.cancel()
  await Promise.allSettled([readLoop, errLoop])

  const combined = stdout + stderr

  // 1. Database migration must complete
  expect(combined).toContain("Database migration complete")

  // 2. No fatal errors
  const errorIndicators = [
    "TuiConfig context must be used",
    "Keymap not found",
    "require is not defined",
    "appears to be invalid",
    "may have expired",
    "invalid API key",
    "API key.*invalid",
  ]
  for (const pattern of errorIndicators) {
    expect(stderr).not.toMatch(new RegExp(pattern, "i"))
  }

  // 3. TUI must produce rendered output with color codes
  //    [38;2;R;G;Bm = "set foreground to RGB color"
  expect(stdout).toMatch(/\x1b\[38;2;\d+;\d+;\d+m/)

  // 4. Must contain visible text beyond escape sequences
  const plain = stdout.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "")
  expect(plain.length).toBeGreaterThan(100)
}, OVERALL_TIMEOUT)
