/**
 * Comprehensive TUI test suite — covers all aspects of the TUI.
 *
 * Part A: Runtime tests (spawn TUI, check output)
 * Part B: Source code structure tests (verify files, imports, functions exist)
 */
import { afterAll, expect, test } from "bun:test"

const STARTUP_WAIT = 6000
const OVERALL_TIMEOUT = 20_000
const SRC = import.meta.dirname + "/../../../src/cli/cmd/tui"

function spawnTui(): { proc: ReturnType<typeof Bun.spawn>; promise: Promise<{ stdout: string; stderr: string }> } {
  const proc = Bun.spawn({
    cmd: ["bun", "run", "--conditions=browser", "src/index.ts"],
    cwd: import.meta.dirname + "/../../..",
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

test("B1. Theme nocowboy.json has correct colors (yellow warning, not 'darkOrange')", async () => {
  const t = JSON.parse(await Bun.file(SRC + "/context/theme/nocowboy.json").text())
  expect(t.defs.darkYellow).toBe("#ffff00")
  expect(t.defs.darkOrange).toBeUndefined()
  expect(t.theme.warning).toEqual({ dark: "darkYellow", light: "lightYellow" })
})

test("B2. Sidebar context plugin has Spent/Balance display", async () => {
  const f = await Bun.file(SRC + "/feature-plugins/sidebar/context.tsx").text()
  expect(f).toContain("Balance")
  expect(f).toContain("money")
  expect(f).toContain("fetchDeepSeekBalance")
})

test("B3. LSP sidebar plugin exists and shows status", async () => {
  const f = await Bun.file(SRC + "/feature-plugins/sidebar/lsp.tsx").text()
  expect(f).toContain("LSP")
  expect(f).toContain("disabled")
})

test("B4. Settings tab has LSP toggle with Ctrl+L keyboard handler", async () => {
  const f = await Bun.file(SRC + "/routes/session/sidebar.tsx").text()
  expect(f).toContain("useKeyboard")
  expect(f).toContain("toggleLsp")
  expect(f).toContain("lspEnabled")
})

test("B5. Model dialog has cost label function", async () => {
  const f = await Bun.file(SRC + "/component/dialog-model.tsx").text()
  expect(f).toContain("costLabel")
  expect(f).toContain("/M")
})

test("B6. Theme mappings use semantic names (warning, error, success)", async () => {
  const t = JSON.parse(await Bun.file(SRC + "/context/theme/nocowboy.json").text())
  expect(t.theme.warning).toBeDefined()
  expect(t.theme.error).toBeDefined()
  expect(t.theme.success).toBeDefined()
  expect(t.theme.primary).toBeDefined()
  expect(t.theme.accent).toBeDefined()
})
