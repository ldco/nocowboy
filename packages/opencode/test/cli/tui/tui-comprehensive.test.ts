/**
 * Comprehensive TUI test suite — covers all aspects of the TUI.
 *
 * Part A: Runtime tests (spawn TUI, check output)
 * Part B: Source code structure tests (verify files, imports, functions exist)
 */
import { afterAll, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

const STARTUP_WAIT = 6000
const OVERALL_TIMEOUT = 20_000

// Resolve the project root by walking up from this test file until we find package.json
function findProjectRoot(startDir: string): string {
  let dir = startDir
  while (dir !== "/") {
    if (existsSync(resolve(dir, "package.json"))) return dir
    dir = resolve(dir, "..")
  }
  throw new Error("Cannot find project root")
}
const PROJECT_ROOT = findProjectRoot(import.meta.dirname)
const SRC = resolve(PROJECT_ROOT, "src/cli/cmd/tui")
const TUI_ROOT = SRC
const SRC_ROOT = resolve(PROJECT_ROOT, "src")

function spawnTui(): { proc: ReturnType<typeof Bun.spawn>; promise: Promise<{ stdout: string; stderr: string }> } {
  const proc = Bun.spawn({
    cmd: ["bun", "run", "--conditions=browser", "src/index.ts"],
    cwd: PROJECT_ROOT,
    env: { ...process.env, NOCOWBOY_DB: ":memory:", FORCE_COLOR: "0" },
    stdout: "pipe",
    stderr: "pipe",
  })
  let stdout = "", stderr = ""
  const d = new TextDecoder()
  const r = proc.stdout.getReader(), er = proc.stderr.getReader()
  const rl = (async () => { while (true) { const { done, value } = await r.read(); if (done) break; stdout += d.decode(value, { stream: true }) } })()
  const el = (async () => { while (true) { const { done, value } = await er.read(); if (done) break; stderr += d.decode(value, { stream: true }) } })()
  const p = (async () => { await Bun.sleep(STARTUP_WAIT); proc.kill("SIGTERM"); await Bun.sleep(500); r.cancel(); er.cancel(); await Promise.allSettled([rl, el]); return { stdout, stderr } })()
  return { proc, promise: p }
}
function stripAnsi(s: string): string { return s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "") }

let proc: ReturnType<typeof Bun.spawn> | undefined
afterAll(() => { proc?.kill("SIGTERM") })

// ============================================================
// PART A — Runtime tests (TUI process)
// ============================================================

test("A1. TUI starts, DB migrates, renders content", async () => {
  const s = spawnTui(); proc = s.proc; const { stdout, stderr } = await s.promise
  expect(stdout + stderr).toContain("Database migration complete")
  expect(stripAnsi(stdout).length).toBeGreaterThan(100)
  expect(stdout).toMatch(/\x1b\[38;2;\d+;\d+;\d+m/)
}, OVERALL_TIMEOUT)

test("A2. No fatal errors on startup", async () => {
  const s = spawnTui(); proc = s.proc; const { stdout, stderr } = await s.promise
  const combined = stdout + stderr
  const fatal = ["TuiConfig context must be used", "Keymap not found", "require is not defined",
    "appears to be invalid", "may have expired", "invalid API key", "Declaration or statement expected"]
  for (const p of fatal) expect(combined).not.toMatch(new RegExp(p, "i"))
}, OVERALL_TIMEOUT)

test("A3. Brand orange #ff6800 present in rendered output", async () => {
  const s = spawnTui(); proc = s.proc; const { stdout } = await s.promise
  expect(stdout).toMatch(/\x1b\[38;2;255;104;0m/)
}, OVERALL_TIMEOUT)

test("A4. No debug console.error left in startup output", async () => {
  const s = spawnTui(); proc = s.proc; const { stderr } = await s.promise
  expect(stderr).not.toContain("LSP toggle")
  expect(stderr).not.toContain("toggleLsp called")
}, OVERALL_TIMEOUT)

// ============================================================
// PART B — Source code structure tests (compile-time verification)
// ============================================================

const readFile = (p: string) => Bun.file(p).text()

test("B1. Theme nocowboy.json has correct colors (yellow warning, not 'darkOrange')", async () => {
  const t = JSON.parse(await readFile(resolve(TUI_ROOT, "context/theme/nocowboy.json")))
  expect(t.defs.darkYellow).toBe("#ffff00")
  expect(t.defs.darkOrange).toBeUndefined()
  expect(t.theme.warning).toEqual({ dark: "darkYellow", light: "lightYellow" })
})

test("B2. Sidebar context plugin has Balance display + fetchDeepSeekBalance", async () => {
  const f = await readFile(resolve(TUI_ROOT, "feature-plugins/sidebar/context.tsx"))
  expect(f).toContain("Balance")
  expect(f).toContain("fetchDeepSeekBalance")
})

test("B3. LSP sidebar plugin exists and shows status", async () => {
  const f = await readFile(resolve(TUI_ROOT, "feature-plugins/sidebar/lsp.tsx"))
  expect(f).toContain("LSP")
  expect(f).toContain("disabled")
})

test("B4. Settings tab has LSP toggle with keyboard handler", async () => {
  const f = await readFile(resolve(TUI_ROOT, "routes/session/sidebar.tsx"))
  expect(f).toContain("useKeyboard")
  expect(f).toContain("box paddingTop={1} onMouseDown={() => toggleLsp()}")
  expect(f).toContain("lspEnabled")
})

test("B5. Model dialog has cost label function", async () => {
  const f = await readFile(resolve(TUI_ROOT, "component/dialog-model.tsx"))
  expect(f).toContain("costLabel")
  expect(f).toContain("/M")
})

test("B6. Theme mappings use semantic names (warning, error, success)", async () => {
  const t = JSON.parse(await readFile(resolve(TUI_ROOT, "context/theme/nocowboy.json")))
  expect(t.theme.warning).toBeDefined()
  expect(t.theme.error).toBeDefined()
  expect(t.theme.success).toBeDefined()
  expect(t.theme.primary).toBeDefined()
  expect(t.theme.accent).toBeDefined()
})

test("B7. LSP text is wrapped in box paddingTop=1 (required for click events)", async () => {
  const f = await readFile(resolve(TUI_ROOT, "routes/session/sidebar.tsx"))
  const lspIdx = f.indexOf("<text attributes={TextAttributes.BOLD} fg={theme.text}>LSP</text>")
  const ciIdx = f.indexOf("<text attributes={TextAttributes.BOLD} fg={theme.text}>Code Indexing</text>")
  expect(lspIdx).toBeGreaterThan(-1)
  expect(ciIdx).toBeGreaterThan(-1)
  const lspSection = f.substring(lspIdx - 100, ciIdx)
  expect(lspSection).toContain("<box paddingTop={1}>")
  expect(lspSection).toContain("onMouseDown")
})

test("B8. Sidebar indexing info tab has NO clickable elements (info only)", async () => {
  const f = await readFile(resolve(SRC_ROOT, "nocowboy/plugins/sidebar-indexing.tsx"))
  expect(f).not.toContain("onMouseUp={() => refresh()}")
  expect(f).not.toContain("onMouseDown")
  expect(f).not.toContain("click to retry")
})

test("B9. Settings tab has onMouseDown for LSP and Indexing, plus keyboard shortcuts", async () => {
  const f = await readFile(resolve(TUI_ROOT, "routes/session/sidebar.tsx"))
  expect(f).toContain("onMouseDown={(e")
  expect(f).toContain("onMouseDown={() => dialog.replace(() => <DialogIndexing")
  expect(f).toContain("useKeyboard")
  expect(f).toContain("KeyL")
  expect(f).toContain("KeyI")
})

test("B10. Theme warning color stays yellow #ffff00, not changed to brand", async () => {
  const t = JSON.parse(await readFile(resolve(TUI_ROOT, "context/theme/nocowboy.json")))
  expect(t.defs.darkYellow).toBe("#ffff00")
  expect(t.theme.primary).toBeDefined()
  expect(t.theme.primary.dark).toBe("darkPrimary")
})

test("B11. Config file exists at PROJECT_ROOT/nocowboy.jsonc", async () => {
  expect(existsSync(resolve(PROJECT_ROOT, "nocowboy.jsonc"))).toBe(true)
  const text = await readFile(resolve(PROJECT_ROOT, "nocowboy.jsonc"))
  expect(text).toContain("lsp")
})
