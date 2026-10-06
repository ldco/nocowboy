import { For, createSignal, createContext, useContext, createMemo, onMount, onCleanup, type Accessor, type Setter, type JSX } from "solid-js"
import { RGBA, TextAttributes, MouseEvent } from "@opentui/core"
import { useTheme } from "@tui/context/theme"
import { useSync } from "@tui/context/sync"
import { Clipboard } from "@tui/util/clipboard"
import { sidebarOpen, toggle as toggleSidebar } from "@/nocowboy/cli/cmd/tui/context/sidebar-state"
import { hasNutausik } from "@/nocowboy/nutausik-client" // nocowboy_change - health via the MemoryAdapter, not a literal endpoint
import { defaultGitPort, type GitState } from "@/nocowboy/git/git-port" // nocowboy_change - async git state, no render-path execSync
import { createButtonPort, SCREEN_LABELS, type ButtonPort, type ScreenKey } from "@/nocowboy/ui/input-port" // nocowboy_change - button propagation + navigation contract

function shortPath(p: string): string {
  const home = process.env.HOME || "/home/" + (process.env.USER || "user")
  let rel = p.startsWith(home) ? "~" + p.slice(home.length) : p
  const parts = rel.split("/")
  if (parts.length > 2) return parts.slice(-2).join("/")
  return rel
}

export type Screen = string

interface ScreenCtx {
  screen: Accessor<Screen>
  setScreen: Setter<Screen>
}

const ScreenCtx = createContext<ScreenCtx>()

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
  const sync = useSync()
  const [git, setGit] = createSignal<GitState>({ status: "unknown", reason: "loading" })
  onMount(() => {
    // Read git asynchronously (never execSync in render); unknown/error stays distinct from a clean tree.
    const refresh = () => void defaultGitPort.read(process.cwd()).then(setGit).catch(() => {})
    refresh()
    const id = setInterval(refresh, 10_000)
    onCleanup(() => clearInterval(id))
  })
  const pathDisplay = createMemo(() => shortPath(git().dir ?? process.cwd()))
  const gitLabel = createMemo(() => {
    const state = git()
    if (state.status !== "ok") return ""
    return `${state.branch}${state.ahead > 0 ? ` ⇡${state.ahead}` : ""}${state.behind > 0 ? ` ⇢${state.behind}` : ""}${state.dirty > 0 ? ` !${state.dirty}` : ""}${state.untracked > 0 ? ` ?${state.untracked}` : ""}`
  })
  const gitFg = createMemo(() => (git().status === "ok" ? theme.success : theme.textMuted))

  return (
    <box flexDirection="row" height={1} backgroundColor={theme.background} shouldFill>
      <text attributes={TextAttributes.BOLD} fg={brandOrange}> noCowboy</text>
      <text fg={theme.text}>
        {` ${pathDisplay()}`}
      </text>
        <text fg={gitFg()} flexGrow={1}>
          {` \uf126 ${gitLabel()}`}
        </text>
      {/* mcp status */}<NutausikDot /><McpDot />
    </box>
  )
}

function Btn(props: { port: ButtonPort; screenKey: ScreenKey }) {
  const { theme } = useTheme()
  return (
    <text
      fg={props.port.active(props.screenKey) ? brandOrange : theme.textMuted}
      paddingLeft={1}
      paddingRight={1}
      onMouseDown={(evt: { button?: number; preventDefault?: () => void }) => {
        // Handlers are mounted through the port: only a consumed click calls
        // preventDefault, so right/middle clicks propagate.
        if (props.port.click({ button: evt.button, key: props.screenKey }).handled) evt.preventDefault?.()
      }}
    >
      {SCREEN_LABELS[props.screenKey]}
    </text>
  )
}

export function BottomBar() {
  const { theme } = useTheme()
  const { screen, setScreen } = useScreen()
  const port = createButtonPort({
    screen: () => screen() as ScreenKey,
    setScreen: (next) => setScreen(next as Screen),
  })

  return (
    <box flexDirection="row" height={1} backgroundColor={theme.background} shouldFill>
      <For each={port.order}>{(key) => <Btn port={port} screenKey={key} />}</For>
      <text flexGrow={1} />
      <SidebarToggle />
      {sidebarOpen() && <text selectable={false} fg={theme.textMuted}> ⇄ ⇅ alt+arrows</text>}
    </box>
  )
}

function SidebarToggle() {
  const { theme } = useTheme()
  return (
    <text
      selectable={false}
      fg={sidebarOpen() ? brandOrange : theme.textMuted}
      paddingLeft={1}
      paddingRight={1}
      onMouseDown={(e: MouseEvent) => { e.preventDefault?.(); toggleSidebar() }}
    >
      {sidebarOpen() ? "▶ ctrl+b" : "◀ ctrl+b"}
    </text>
  )
}

function NutausikDot() {
  const { theme } = useTheme()
  const [alive, setAlive] = createSignal<boolean | null>(null)

  onMount(() => {
    const check = () => {
      // Health via the shared client (MemoryAdapter.probe) so the endpoint honours
      // NUTAUSIK_MCP_URL instead of a hardcoded literal.
      hasNutausik()
        .then((ok) => setAlive(ok))
        .catch(() => setAlive(false))
    }
    check()
    const id = setInterval(check, 30_000)
    onCleanup(() => clearInterval(id))
  })

  const fg = () => {
    return alive() === true ? theme.success : theme.textMuted
  }
  const label = () => {
    return alive() === true ? "Nutausik:✓" : "Nutausik:✗"
  }
  return (
    <text fg={fg()} paddingLeft={1}>
      {label()}
    </text>
  )
}

function McpDot() {
  const { theme } = useTheme()
  const sync = useSync()
  const info = createMemo(() => {
    const entries = Object.entries(sync.data.mcp ?? {})
    const total = entries.length
    const connected = entries.filter(([, i]: [string, any]) => i.status === "connected").length
    const failed = entries.filter(([, i]: [string, any]) => i.status === "failed").length
    return { total, connected, failed }
  })
  const fg = () => {
    const { connected, failed } = info()
    if (failed > 0) return theme.error
    if (connected > 0) return theme.success
    return theme.textMuted
  }
  return (
    <text fg={fg()} paddingRight={1}>
      {`⊙ ${info().connected}/${info().total} MCP`}
    </text>
  )
}
