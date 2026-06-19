import { For, createSignal, createContext, useContext, type Accessor, type Setter } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { readFileSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { icons } from "@/nocowboy/icons"
import { Clipboard } from "@tui/util/clipboard"
import { useProject } from "@tui/context/project"

const buttons = [
  { key: "chat",    label: "Chat" },
  { key: "api",     label: "API" },
  { key: "git",     label: "Git" },
  { key: "db",     label: "DB" },
  { key: "files",   label: "Files" },
  { key: "edit",    label: "Edit" },
  { key: "settings",label: "Settings" },
  { key: "info",    label: "Info" },
  { key: "history", label: "History" },
]

export type Screen = (typeof buttons)[number]["key"]

interface ScreenCtx {
  screen: Accessor<Screen>
  setScreen: Setter<Screen>
}

const ScreenCtx = createContext<ScreenCtx>()

export function ScreenProvider(props: { children: any }) {
  const [screen, setScreen] = createSignal<Screen>("chat")
  return (
    <ScreenCtx.Provider value={{ screen, setScreen }}>
      {props.children}
    </ScreenCtx.Provider>
  )
}

export function useScreen(): ScreenCtx {
  return useContext(ScreenCtx)!
}

function shortPath(p: string): string {
  const home = process.env.HOME || "/home/" + (process.env.USER || "user")
  let rel = p.startsWith(home) ? "~" + p.slice(home.length) : p
  const parts = rel.split("/")
  if (parts.length > 3) return parts[0] + "/.../" + parts[parts.length - 1]
  return rel
}

function gitStatus(): string {
  try {
    const { execSync } = require("node:child_process")
    const out = execSync("git status --porcelain", { encoding: "utf-8", timeout: 2000, stdio: ["pipe", "pipe", "pipe"] })
    let staged = 0, unstaged = 0
    for (const line of out.split("\n")) {
      if (!line.trim()) continue
      const s = line.slice(0, 2).trim()
      if (s) staged++
      const us = line.slice(1, 2).trim()
      if (us) unstaged++
    }
    let s = ""
    if (staged > 0) s += ` ${icons.staged}${staged}`
    if (unstaged > 0) s += ` ${icons.unstaged}${unstaged}`
    if (!staged && !unstaged) s += ` ${icons.clean}`
    return s
  } catch { return "" }
}

function findGitHead(): string {
  const dirs = [process.cwd(), resolve(process.cwd(), ".."), resolve(process.cwd(), "../.."), resolve(process.cwd(), "../../..")]
  for (const d of dirs) {
    const p = resolve(d, ".git/HEAD")
    if (!existsSync(p)) continue
    try {
      const head = readFileSync(p, "utf-8").trim()
      const m = head.match(/ref: refs\/heads\/(.+)/)
      if (m) return m[1] ?? ""
    } catch {}
  }
  return ""
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, "../../../../..")

export function TopBar() {
  const { theme } = useTheme()
  const project = useProject()
  const fullPath = project.instance.path.directory || projectRoot
  const pathDisplay = shortPath(fullPath)
  const branch = findGitHead()
  const status = gitStatus()

  return (
    <box flexDirection="row" height={1} backgroundColor={theme.background} shouldFill>
      <text fg={theme.highlight} flexShrink={0}> {icons.logo}</text>
      <text
        fg={theme.text}
        flexGrow={1}
        onMouseDown={(evt: any) => { evt?.preventDefault?.(); Clipboard.copy(fullPath).catch(() => {}) }}
      >
        {" "}{pathDisplay}
      </text>
      <text fg={theme.success}>
        {branch ? ` ${icons.branch}${branch}${status}` : ""}
      </text>
      <text fg={theme.textDim}>
        {"  Score: --  Tokens: 0  Cost: $0.00"}
      </text>
      <text fg={theme.error} paddingLeft={1} paddingRight={1}>
        {icons.disconnected}
      </text>
    </box>
  )
}

function Btn(props: { label: string; active: boolean; onClick: () => void }) {
  const { theme } = useTheme()
  return (
    <text
      fg={props.active ? theme.highlight : theme.textDim}
      paddingLeft={1}
      paddingRight={1}
      onMouseDown={(evt: any) => { evt?.preventDefault?.(); props.onClick() }}
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
      <For each={buttons}>
        {(b) => (
          <Btn
            label={b.label}
            active={screen() === b.key}
            onClick={() => setScreen(b.key as Screen)}
          />
        )}
      </For>
    </box>
  )
}
