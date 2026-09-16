/**
 * Comprehensive TUI test suite — covers all aspects of the TUI.
 *
 * Part A: Runtime tests (spawn TUI, check output)
 * Part B: Source code structure tests (verify files, imports, functions exist)
 */
import { afterAll, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { readdir } from "node:fs/promises"
import { resolve } from "node:path"

const OVERALL_TIMEOUT = 25_000

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

const DRIVER = resolve(PROJECT_ROOT, "test/cli/tui/pty-driver.py")
const HAS_PYTHON = (() => {
  try {
    return Bun.spawnSync(["python3", "--version"]).exitCode === 0
  } catch {
    return false
  }
})()

/**
 * Spawn the TUI on a pseudo-terminal via the python pty driver, which answers the
 * terminal capability queries OpenTUI waits for. Without those answers the TUI
 * only writes ~500 bytes and never renders — which is why these tests used to
 * fail on any machine without a real terminal.
 */
function spawnTui(
  driverTimeout = 12,
): { proc: ReturnType<typeof Bun.spawn>; promise: Promise<{ stdout: string; stderr: string }> } {
  const proc = Bun.spawn({
    cmd: ["python3", DRIVER, `--timeout=${driverTimeout}`, "bun", "run", "--conditions=browser", "src/index.ts"],
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
  const p = (async () => { await proc.exited; r.cancel(); er.cancel(); await Promise.allSettled([rl, el]); return { stdout, stderr } })()
  return { proc, promise: p }
}
function stripAnsi(s: string): string { return s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "") }

let proc: ReturnType<typeof Bun.spawn> | undefined
afterAll(() => { proc?.kill("SIGTERM") })

// ============================================================
// PART A — Runtime tests (TUI process on a pty)
// ============================================================

test.skipIf(!HAS_PYTHON)("A1. TUI starts on a pty and renders a full frame", async () => {
  const s = spawnTui(); proc = s.proc; const { stdout } = await s.promise
  expect(stdout).toContain("\x1b[?1049h") // entered the alternate screen
  expect(stdout.length).toBeGreaterThan(5_000)
  expect(stripAnsi(stdout).length).toBeGreaterThan(200)
  expect(stdout).toMatch(/\x1b\[38;2;\d+;\d+;\d+m/)
}, OVERALL_TIMEOUT)

test.skipIf(!HAS_PYTHON)("A2. No fatal errors on startup", async () => {
  const s = spawnTui(); proc = s.proc; const { stdout, stderr } = await s.promise
  const combined = stdout + stderr
  const fatal = ["TuiConfig context must be used", "Keymap not found", "require is not defined",
    "appears to be invalid", "may have expired", "invalid API key", "Declaration or statement expected"]
  for (const p of fatal) expect(combined).not.toMatch(new RegExp(p, "i"))
}, OVERALL_TIMEOUT)

test.skipIf(!HAS_PYTHON)("A3. Brand orange #ff6800 present in rendered output", async () => {
  const s = spawnTui(); proc = s.proc; const { stdout } = await s.promise
  expect(stdout).toMatch(/\x1b\[38;2;255;104;0m/)
}, OVERALL_TIMEOUT)

test.skipIf(!HAS_PYTHON)("A4. No debug console.error left in startup output", async () => {
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

test("B2. Sidebar context plugin has Balance display + fetchBalance", async () => {
  const f = await readFile(resolve(TUI_ROOT, "feature-plugins/sidebar/context.tsx"))
  expect(f).toContain("Balance")
  expect(f).toContain("fetchBalance")
})

test("B3. LSP sidebar plugin exists and shows status", async () => {
  const f = await readFile(resolve(TUI_ROOT, "feature-plugins/sidebar/lsp.tsx"))
  expect(f).toContain("LSP")
  expect(f).toContain("disabled")
})

test("B4. Settings tab has LSP toggle with keyboard handler", async () => {
  const f = await readFile(resolve(TUI_ROOT, "routes/session/sidebar.tsx"))
  expect(f).toContain("useKeyboard")
  expect(f).toContain("onMouseDown={() => { toggleLsp() }}")
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
  // The heading label comes from the i18n dictionary now; what matters here is
  // that the section is wrapped for click events.
  const lspIdx = f.indexOf('{t("settings.lsp")}')
  expect(lspIdx).toBeGreaterThan(-1)
  // Check area around LSP element for box wrapper and click handler
  const lspSection = f.substring(Math.max(0, lspIdx - 200), lspIdx + 400)
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
  expect(f).toContain("onMouseDown={() => { console.error(\"INDEXING_CLICK\");")
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

test("B12. The app tree wraps the UI in the i18n provider", async () => {
  const app = await readFile(resolve(TUI_ROOT, "app.tsx"))
  // The bridge must sit inside SyncProvider (it reads the synced language) and
  // wrap the rest of the tree.
  const syncAt = app.indexOf("<SyncProvider>")
  const i18nAt = app.indexOf("<NoCowboyI18n>")
  const closeAt = app.indexOf("</NoCowboyI18n>")
  expect(syncAt).toBeGreaterThan(-1)
  expect(i18nAt).toBeGreaterThan(syncAt)
  expect(closeAt).toBeGreaterThan(i18nAt)
  const bridge = await readFile(resolve(SRC_ROOT, "nocowboy/cli/cmd/tui/context/i18n-bridge.tsx"))
  expect(bridge).toContain("I18nProvider")
  expect(bridge).toContain("sync.data.config")
})

test("B13. The sidebar and session list read their labels from the dictionary", async () => {
  const sidebar = await readFile(resolve(TUI_ROOT, "routes/session/sidebar.tsx"))
  expect(sidebar).toContain("useI18n")
  expect(sidebar).toContain('t("settings.title")')
  const sessionList = await readFile(resolve(TUI_ROOT, "component/dialog-session-list.tsx"))
  expect(sessionList).toContain("useI18n")
  expect(sessionList).toContain('t("sessions.')
})

test("B14. The prompt registers the attach and paste commands used by the buttons", async () => {
  const prompt = await readFile(resolve(TUI_ROOT, "component/prompt/index.tsx"))
  expect(prompt).toContain('name: "prompt.attach"')
  expect(prompt).toContain('name: "prompt.paste"')
  const attach = await readFile(resolve(SRC_ROOT, "nocowboy/components/attach-button.tsx"))
  expect(attach).toContain('dispatchCommand("prompt.attach")')
  const paste = await readFile(resolve(SRC_ROOT, "nocowboy/components/paste-button.tsx"))
  expect(paste).toContain('dispatchCommand("prompt.paste")')
})

test("B16. No dialog title or placeholder is a hardcoded English literal", async () => {
  // Localization is only real if new dialogs keep using the dictionary: a
  // `title="Something"` literal would silently stay English in both languages.
  const offenders: string[] = []
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue
      const full = resolve(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
        continue
      }
      if (!entry.name.endsWith(".tsx")) continue
      const text = await readFile(full)
      for (const match of text.matchAll(/(title|placeholder)="[A-Z][^"]*"/g)) {
        offenders.push(`${full.slice(SRC_ROOT.length + 1)}: ${match[0]}`)
      }
    }
  }
  await walk(TUI_ROOT)
  expect(offenders).toEqual([])
})

test("B15. The sidebar mounts the language switcher and keeps no debug logging", async () => {
  const sidebar = await readFile(resolve(TUI_ROOT, "routes/session/sidebar.tsx"))
  expect(sidebar).toContain("<LanguageRow />")
  // A previous session left console.log + appendFileSync("/tmp/nocowboy-sidebar.log")
  // in this module; it must not come back.
  expect(sidebar).not.toContain("appendFileSync")
  expect(sidebar).not.toContain("/tmp/nocowboy-sidebar.log")
  expect(sidebar).not.toMatch(/console\.log\(/)

  const row = await readFile(resolve(SRC_ROOT, "nocowboy/cli/cmd/tui/component/language-row.tsx"))
  expect(row).toContain('t("settings.language")')
  expect(row).toContain("sdk.client.config")
  expect(row).toContain(".update(")
  expect(row).toContain("lang")
})
