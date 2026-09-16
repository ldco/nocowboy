/**
 * Headless render tests for the TUI.
 *
 * The TUI is spawned on a pseudo-terminal through test/cli/tui/pty-driver.py,
 * which answers the terminal capability queries OpenTUI waits for. Without those
 * answers the process writes ~500 bytes and never renders, which is why these
 * assertions used to be impossible to run without a real terminal — and why
 * features like the prompt buttons had no automated coverage at all.
 *
 * All pty spawns live in this one file so they run sequentially instead of
 * competing with each other for CPU.
 */
import { afterAll, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

const DRIVER_TIMEOUT = 18
const TEST_TIMEOUT = 45_000

function findProjectRoot(startDir: string): string {
  let dir = startDir
  while (dir !== "/") {
    if (existsSync(resolve(dir, "package.json"))) return dir
    dir = resolve(dir, "..")
  }
  throw new Error("Cannot find project root")
}
const PROJECT_ROOT = findProjectRoot(import.meta.dirname)
const DRIVER = resolve(PROJECT_ROOT, "test/cli/tui/pty-driver.py")

const HAS_PYTHON = (() => {
  try {
    return Bun.spawnSync(["python3", "--version"]).exitCode === 0
  } catch {
    return false
  }
})()

let child: ReturnType<typeof Bun.spawn> | undefined
afterAll(() => child?.kill("SIGTERM"))

/** Render the TUI once and return the raw pty output (stdout + stderr merged by the tty). */
async function render(): Promise<string> {
  const proc = Bun.spawn({
    cmd: ["python3", DRIVER, `--timeout=${DRIVER_TIMEOUT}`, "bun", "run", "--conditions=browser", "src/index.ts"],
    cwd: PROJECT_ROOT,
    env: { ...process.env, NOCOWBOY_DB: ":memory:", FORCE_COLOR: "0" },
    stdout: "pipe",
    stderr: "pipe",
  })
  child = proc
  const chunks: string[] = []
  const decoder = new TextDecoder()
  const reader = proc.stdout.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(decoder.decode(value, { stream: true }))
  }
  await proc.exited
  return chunks.join("")
}

const plain = (frame: string) =>
  frame
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "")
    .replace(/\x1b\][^\x07]*\x07/g, "")
    .replace(/\x1b[()][A-Z0-9]/g, "")

test.skipIf(!HAS_PYTHON)(
  "smoke: the TUI starts, migrates the database and renders a frame",
  async () => {
    const frame = await render()
    expect(frame).toContain("Database migration complete")
    // Entered the alternate screen and produced true-color output.
    expect(frame).toContain("\x1b[?1049h")
    expect(frame).toMatch(/\x1b\[38;2;\d+;\d+;\d+m/)
    expect(plain(frame).length).toBeGreaterThan(100)
  },
  TEST_TIMEOUT,
)

test.skipIf(!HAS_PYTHON)(
  "the prompt renders the Attach, Paste and YOLO mouse buttons",
  async () => {
    const frame = await render()
    expect(frame).toContain("[Attach]")
    expect(frame).toContain("[Paste]")
    expect(frame).toMatch(/\[YOLO( ON)?\]/)
  },
  TEST_TIMEOUT,
)

test.skipIf(!HAS_PYTHON)(
  "the rendered frame is a real UI, not a blank pty",
  async () => {
    const frame = await render()
    expect(frame).toContain("\x1b[?1049h")
    expect(frame.length).toBeGreaterThan(5_000)
    expect(plain(frame)).toContain("NoCowboy")
  },
  TEST_TIMEOUT,
)

test.skipIf(!HAS_PYTHON)(
  "no fatal startup errors and no left-over debug output",
  async () => {
    const frame = await render()
    const fatal = [
      "TuiConfig context must be used",
      "Keymap not found",
      "require is not defined",
      "appears to be invalid",
      "may have expired",
      "invalid API key",
      "Declaration or statement expected",
      "LSP toggle",
      "toggleLsp called",
    ]
    for (const pattern of fatal) expect(frame).not.toMatch(new RegExp(pattern, "i"))
  },
  TEST_TIMEOUT,
)
