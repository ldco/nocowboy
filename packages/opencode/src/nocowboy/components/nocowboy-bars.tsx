import { For, createSignal, createContext, useContext, createMemo, onMount, onCleanup, type Accessor, type Setter, type JSX } from "solid-js"
import { readFileSync, existsSync } from "node:fs"
import { execSync } from "node:child_process"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { RGBA, TextAttributes, MouseEvent } from "@opentui/core"
import { icons } from "@/nocowboy/icons"
import { useTheme } from "@tui/context/theme"
import { Clipboard } from "@tui/util/clipboard"
import { sidebarOpen, toggle as toggleSidebar } from "@/nocowboy/cli/cmd/tui/context/sidebar-state"

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, "../../../../..")

function shortPath(p: string): string {
  const home = process.env.HOME || "/home/" + (process.env.USER || "user")
  let rel = p.startsWith(home) ? "~" + p.slice(home.length) : p
  const parts = rel.split("/")
  if (parts.length > 2) return parts.slice(-2).join("/")
  return rel
}

function gitInfo() {
  let gitDir = ""
  for (const d of [process.cwd(), resolve(process.cwd(), ".."), resolve(process.cwd(), "../.."), resolve(process.cwd(), "../../..")]) {
    const p = resolve(d, ".git/HEAD")
    if (existsSync(p)) { gitDir = d; break }
  }
  if (!gitDir) return { branch: "", ahead: 0, behind: 0, dirty: 0, untracked: 0 }
  let branch = ""
  try {
    const head = readFileSync(resolve(gitDir, ".git/HEAD"), "utf-8").trim()
    const m = head.match(/ref: refs\/heads\/(.+)/)
    if (m) branch = m[1] ?? ""
  } catch {}
  let ahead = 0, behind = 0, dirty = 0, untracked = 0
  try {
    const fwd = execSync(`git rev-list --count @{upstream}..HEAD 2>/dev/null || echo 0`, { cwd: gitDir, encoding: "utf-8", timeout: 2000, stdio: ["pipe", "pipe", "pipe"] })
    ahead = parseInt(fwd.trim(), 10) || 0
    const bwd = execSync(`git rev-list --count HEAD..@{upstream} 2>/dev/null || echo 0`, { cwd: gitDir, encoding: "utf-8", timeout: 2000, stdio: ["pipe", "pipe", "pipe"] })
    behind = parseInt(bwd.trim(), 10) || 0
    const st = execSync(`git status --porcelain 2>/dev/null || true`, { cwd: gitDir, encoding: "utf-8", timeout: 2000, stdio: ["pipe", "pipe", "pipe"] })
    for (const line of st.split("\n")) {
      if (!line.trim()) continue
      if (line.startsWith("??")) untracked++
      else dirty++
    }
  } catch {}
  return { branch, ahead, behind, dirty, untracked }
}

export type Screen = string

interface ScreenCtx {
  screen: Accessor<Screen>
  setScreen: Setter<Screen>
}

const ScreenCtx = createContext<ScreenCtx>()

const builtinButtons = [
  { key: "chat",    label: "Chat" },
  
  
]

const appButtons = [
  { key: "api",     label: "API" },
  { key: "git",     label: "Git" },
  { key: "db",      label: "DB" },
  { key: "files",   label: "Files" },
  { key: "edit",    label: "Edit" },
]

export function ScreenProvider(props: { children: JSX.Element }) {
  const [screen, setScreen] = createSignal<Screen>("chat")
  globalSetScreen = setScreen as unknown as ((s: Screen) => void)
  return (
    <ScreenCtx.Provider value={{ screen, setScreen }}>
      {props.children}
    </ScreenCtx.Provider>
  )
}

export function useScreen(): ScreenCtx {
  return useContext(ScreenCtx)!
}

let globalSetScreen: ((s: Screen) => void) | null = null
export function setScreenFromModule(s: Screen): void { globalSetScreen?.(s) }

const brandOrange = RGBA.fromInts(0xff, 0x68, 0x00)

export function TopBar() {
  const { theme } = useTheme()
  const fullPath = projectRoot
  const pathDisplay = shortPath(fullPath)
  const [tick, setTick] = createSignal(0)
  onMount(() => { const id = setInterval(() => setTick((t) => t + 1), 10_000); onCleanup(() => clearInterval(id)) })
  const git = createMemo(() => { tick(); return gitInfo() })

  return (
    <box flexDirection="row" height={1} backgroundColor={theme.background} shouldFill>
      <text attributes={TextAttributes.BOLD} fg={brandOrange}> noCowboy</text>
      <text fg={theme.text}>
        {` ${pathDisplay}`}
      </text>
        <text fg={theme.success} flexGrow={1}>
          {` \uf126 ${git().branch}${git().ahead > 0 ? ` ⇡${git().ahead}` : ""}${git().behind > 0 ? ` ⇢${git().behind}` : ""}${git().dirty > 0 ? ` !${git().dirty}` : ""}${git().untracked > 0 ? ` ?${git().untracked}` : ""}`}
        </text>
      <text fg="#ff0000" paddingRight={1}>
        ●
      </text>
    </box>
  )
}

function Btn(props: { label: string; active: boolean; onClick: () => void }) {
  const { theme } = useTheme()
  return (
    <text
      fg={props.active ? brandOrange : theme.textMuted}
      paddingLeft={1}
      paddingRight={1}
      onMouseDown={(evt: MouseEvent) => { evt.preventDefault?.(); props.onClick() }}
    >
      {props.label}
    </text>
  )
}

export function BottomBar() {
  const { theme } = useTheme()
  const { screen, setScreen } = useScreen()

  return (
    <box flexDirection="row" height={1} backgroundColor={theme.background} shouldFill>
      <For each={builtinButtons}>
        {(b) => (
          <Btn
            label={b.label}
            active={screen() === b.key}
            onClick={() => setScreen(b.key as Screen)}
          />
        )}
      </For>
      <For each={appButtons}>
        {(b) => (
          <Btn
            label={b.label}
            active={screen() === b.key}
            onClick={() => setScreen(b.key as Screen)}
          />
        )}
      </For>
      <text flexGrow={1} />
      <SidebarToggle />
    </box>
  )
}

function SidebarToggle() {
  const { theme } = useTheme()
  return (
    <text
      fg={sidebarOpen() ? brandOrange : theme.textMuted}
      paddingLeft={1}
      paddingRight={1}
      onMouseDown={(e: MouseEvent) => { e.preventDefault?.(); toggleSidebar() }}
    >
      {sidebarOpen() ? "◀ ctrl+b" : "▶ ctrl+b"}
    </text>
  )
}
