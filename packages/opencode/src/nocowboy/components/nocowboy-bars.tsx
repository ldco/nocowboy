import { For, createSignal, createContext, useContext, createMemo, type Accessor, type Setter } from "solid-js"
import { readFileSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { icons } from "@/nocowboy/icons"
import { useTheme } from "@tui/context/theme"
import { Clipboard } from "@tui/util/clipboard"
// useRoute removed

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, "../../../../..")

function shortPath(p: string): string {
  const home = process.env.HOME || "/home/" + (process.env.USER || "user")
  let rel = p.startsWith(home) ? "~" + p.slice(home.length) : p
  const parts = rel.split("/")
  if (parts.length > 3) return parts[0] + "/.../" + parts[parts.length - 1]
  return rel
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

export type Screen = string

interface ScreenCtx {
  screen: Accessor<Screen>
  setScreen: Setter<Screen>
}

const ScreenCtx = createContext<ScreenCtx>()

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

export function ScreenProvider(props: { children: any }) {
  const [screen, setScreen] = createSignal<Screen>("chat")
  globalSetScreen = setScreen as any
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

export function TopBar() {
  const { theme } = useTheme()
  const fullPath = projectRoot
  const pathDisplay = shortPath(fullPath)
  const branch = findGitHead()

  return (
    <box flexDirection="row" height={1} backgroundColor={theme.background} shouldFill>
      <text fg={theme.highlight} bold flexShrink={0}> noCowboy</text>
      <text
        fg={theme.text}
        flexGrow={1}
        onMouseDown={(evt: any) => { evt?.preventDefault?.(); Clipboard.copy(fullPath).catch(() => {}) }}
      >
        {" "}{pathDisplay}
      </text>
      <text fg={theme.success}>
        {branch ? ` ${icons.branch}${branch}` : ""}
      </text>
      <text fg={theme.textDim}>
        {"  Score: --  Tokens: 0  Cost: $0.00  "}
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
