import { useProject } from "@tui/context/project"
import { useSync } from "@tui/context/sync"
import { useRoute } from "@tui/context/route"
import { useSDK } from "@tui/context/sdk"
import { useDialog } from "@tui/ui/dialog"
import { DialogPrompt } from "@tui/ui/dialog-prompt"
import { createMemo, createSignal, createResource, Show, For, type JSX } from "solid-js"
import { useTheme } from "../../context/theme"
import { useTuiConfig } from "../../context/tui-config"
import { InstallationVersion } from "@opencode-ai/core/installation/version"
import { TuiPluginRuntime } from "@/cli/cmd/tui/plugin/runtime"
import { RGBA, TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/solid"
import { getScrollAcceleration } from "../../util/scroll"
import { WorkspaceLabel } from "../../component/workspace-label"
import { useBindings } from "../../keymap"
import { DialogProvider } from "../../component/dialog-provider" // nocowboy_change
import { DialogIndexing } from "@/nocowboy/components/dialog-indexing" // nocowboy_change
import * as Clipboard from "../../util/clipboard" // nocowboy_change
import { useToast } from "../../ui/toast" // nocowboy_change

// nocowboy_change - module-level ref survives SolidJS remount
let _historyScrollbox: any = undefined

// DEBUG — remove after stable
import { appendFileSync } from "node:fs"
console.log("SIDEBAR MODULE LOADED")
const LOG = "/tmp/nocowboy-sidebar.log"
function log(msg: string) { appendFileSync(LOG, `${new Date().toISOString()} ${msg}\n`) }
log("=== SIDEBAR STARTED ===")

type SidebarTab = "info" | "history" | "settings"
const brand = RGBA.fromInts(0xff, 0x68, 0x00)

function TabBar(props: { active: SidebarTab; onSelect: (tab: SidebarTab) => void }) {
  const { theme } = useTheme()
  const tabs: { key: SidebarTab; label: string }[] = [
    { key: "info", label: "Info" },
    { key: "history", label: "History" },
    { key: "settings", label: "Settings" },
  ]
  return (
    <box flexDirection="row" flexShrink={0} paddingBottom={1} gap={1}>
      <For each={tabs}>
        {(tab) => (
          <text
            fg={props.active === tab.key ? brand : theme.textMuted}
            onMouseDown={(e: any) => { e?.preventDefault?.(); props.onSelect(tab.key) }}
          >
            {tab.label}
          </text>
        )}
      </For>
    </box>
  )
}

function HistoryTab(props: {
  list: any[]
  currentID?: string
  selectedIdx: number
  onNavigate: (sessionID: string) => void
  onSelectIdx: (idx: number) => void
}) {
  const { theme } = useTheme()

  const ago = (ts: number) => {
    const diff = Date.now() - ts
    if (diff < 60000) return "now"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return `${Math.floor(diff / 86400000)}d`
  }

  return (
    <Show when={props.list.length > 0} fallback={<text fg={theme.textMuted}>No sessions</text>}>
      <For each={props.list}>
        {(s: any, idx) => (
          <text
            fg={s.id === props.currentID ? brand : idx() === props.selectedIdx ? theme.text : theme.textMuted}
            attributes={s.id === props.currentID ? TextAttributes.BOLD : 0}
            onMouseDown={(e: any) => { e?.preventDefault?.(); props.onSelectIdx(idx()); props.onNavigate(s.id) }}
            wrapMode="none"
          >
            {ago(s.time?.updated ?? 0)} {s.title}
          </text>
        )}
      </For>
    </Show>
  )
}

function SettingsTab() {
  const { theme } = useTheme()
  const sync = useSync()
  const dialog = useDialog()
  const sdk = useSDK()
  const project = useProject()
  const [mcpMsg, setMcpMsg] = createSignal("")

  useKeyboard((event: { ctrl: boolean; code?: string }) => {
    if (event.ctrl && event.code === "KeyL") {
      toggleLsp()
    }
    if (event.ctrl && event.code === "KeyI") {
      dialog.replace(() => <DialogIndexing useSDK={() => sdk as any} />)
    }
  })

  const lspEnabled = () => !!sync.data.config?.lsp
  const [lspError, setLspError] = createSignal(false)

  const lspStatusColor = () => {
    if (lspError()) return theme.error
    if (lspEnabled()) return theme.success
    return theme.warning
  }

  const toggleLsp = async () => {
    setLspError(false)
    const dir = project.instance.directory() ?? ""
    const next = !lspEnabled()
    try {
      await sdk.client.config.update({
        directory: dir,
        config: { lsp: next },
      })
      const updated = await sdk.client.config.get()
      if (updated.data) {
        sync.set("config", updated.data as any)
      }
    } catch {
      setLspError(true)
    }
  }

  const indexingStatus = createMemo(() => {
    const s = sync.data.indexing as any
    if (!s) return { state: "Unknown" as const, message: "" }
    return { state: s.state as string, message: s.message as string }
  })

  const indexingColor = () => {
    const state = indexingStatus().state
    if (state === "Complete" || state === "Idle") return theme.success
    if (state === "Error") return theme.error
    if (state === "In Progress") return theme.warning
    return theme.textMuted
  }

  const indexingText = () => {
    const { state, message } = indexingStatus()
    const enabled = sync.data.config.indexing?.enabled === true
    if (state === "Complete") return "Enabled"
    if (state === "Error") return message || "Error"
    if (state === "In Progress") return "Indexing..."
    if (!enabled) return "Disabled"
    return message || "Enabled"
  }

  const connected = createMemo(() => {
    const next = sync.data.provider_next
    if (!next?.all) return []
    return next.all.filter((p: any) => next.connected?.includes(p.id))
  })

  return (
    <box flexDirection="column" gap={1}>
      <text attributes={TextAttributes.BOLD} fg={theme.text}>Providers</text>
      <For each={connected()}>
        {(p: any) => (
          <text wrapMode="none">
            <span style={{ fg: theme.success }}>•</span> {p.name}
          </text>
        )}
      </For>
      <text fg={theme.textMuted} onMouseDown={() => dialog.replace(() => <DialogProvider />)}>
        + Connect a provider
      </text>
      <box paddingTop={1}>
        <text attributes={TextAttributes.BOLD} fg={theme.text}>Code Indexing</text>
        <text fg={indexingColor()}>
          {indexingText()}
        </text>
        <text fg={theme.textMuted} onMouseDown={() => { console.error("INDEXING_CLICK"); dialog.replace(() => <DialogIndexing useSDK={() => sdk as any} />) }}>
          Open indexing configuration →
        </text>
      </box>
      <box paddingTop={1} flexDirection="row" onMouseDown={() => toggleLsp()}>
        <text attributes={TextAttributes.BOLD} fg={theme.text}>LSP </text>
        <text fg={lspStatusColor()}>
          {lspError() ? "Error" : lspEnabled() ? "Enabled" : "Disabled"}
        </text>
        <text fg={theme.textMuted}> — click to toggle</text>
      </box>

      {/* MCP Servers section */}
      <box paddingTop={1} flexDirection="column" gap={1}>
        <text attributes={TextAttributes.BOLD} fg={theme.text}>MCP Servers</text>
        <Show when={mcpMsg()}>
          <text fg={theme.warning}>{mcpMsg()}</text>
        </Show>
        <For each={Object.entries(sync.data.config?.mcp ?? {})}>
          {([name, server]: [string, any]) => {
            const status = () => (sync.data.mcp as any)?.[name]
            const st = () => status()?.status ?? ""
            const vendor = () => server?.vendor ?? "community"
            const enabled = () => server?.enabled !== false
            const isNocowboy = () => vendor() === "nocowboy"
            const color = () => {
              if (!enabled()) return theme.textMuted
              if (st() === "connected") return theme.success
              if (st() === "failed" || st() === "needs_client_registration") return theme.error
              if (st() === "needs_auth") return theme.warning
              return theme.textMuted
            }
            const icon = () => {
              if (!enabled()) return "○"
              if (st() === "connected") return "✓"
              if (st() === "failed") return "✗"
              if (st() === "needs_auth") return "⚠"
              return "○"
            }
            const err = () => status()?.error ? ` ${status()!.error}` : ""

            const toggle = async () => {
              setMcpMsg("")
              const dir = project.instance.directory() ?? ""
              const next = !enabled()
              try {
                const current = sync.data.config as any
                const updatedMcp = { ...(current.mcp ?? {}) }
                updatedMcp[name] = { ...(updatedMcp[name] ?? {}), enabled: next }
                await sdk.client.config.update({
                  directory: dir,
                  config: { mcp: updatedMcp },
                })
                const updated = await sdk.client.config.get()
                if (updated.data) sync.set("config", updated.data as any)
              } catch (e: any) {
                setMcpMsg(e?.message ?? "Toggle failed")
              }
            }

            const remove = async () => {
              setMcpMsg("")
              const dir = project.instance.directory() ?? ""
              try {
                const current = sync.data.config as any
                const updatedMcp = { ...(current.mcp ?? {}) }
                delete updatedMcp[name]
                await sdk.client.config.update({
                  directory: dir,
                  config: { mcp: updatedMcp },
                })
                const updated = await sdk.client.config.get()
                if (updated.data) sync.set("config", updated.data as any)
              } catch (e: any) {
                setMcpMsg(e?.message ?? "Remove failed")
              }
            }

            const toggleMcp = (e: any) => { e?.preventDefault?.(); toggle() }

            return (
              <text wrapMode="none" onMouseDown={toggleMcp}>
                <span style={{ fg: color() }}>{icon()}</span>{" "}
                {name}{" "}
                <span style={{ fg: isNocowboy() ? brand : theme.textMuted }}>{isNocowboy() ? "nc" : "com"}</span>
                <Show when={err()}>
                  {" "}<span style={{ fg: theme.error }}>{err()}</span>
                </Show>
              </text>
            )
          }}
        </For>
        <Show when={Object.keys(sync.data.config?.mcp ?? {}).length === 0}>
          <text fg={theme.textMuted} wrapMode="word">No MCP servers configured. Run nocowboy init or add manually.</text>
        </Show>
        <text fg={theme.textMuted} onMouseDown={() => setMcpMsg("Use: nocowboy mcp add")}>
          + Add MCP Server
        </text>
      </box>
    </box>
  )
}

export function Sidebar(props: { sessionID: string; overlay?: boolean }) {
  const project = useProject()
  const sync = useSync()
  const { theme } = useTheme()
  const tuiConfig = useTuiConfig()
  const route = useRoute()
  const sdk = useSDK()
  const toast = useToast() // nocowboy_change
  log(`sidebar.mount sessionID=${props.sessionID} overlay=${props.overlay}`) // debug
  const session = createMemo(() => sync.session.get(props.sessionID))
  const workspace = () => {
    const workspaceID = session()?.workspaceID
    if (!workspaceID) return
    return project.workspace.get(workspaceID)
  }
  const scrollAcceleration = createMemo(() => getScrollAcceleration(tuiConfig))
  const [tab, setTab] = createSignal<SidebarTab>("info")
  const [selectedIdx, setSelectedIdx] = createSignal(0)
  const [navigating, setNavigating] = createSignal(false) // nocowboy_change - context-aware return

  const [sessions] = createResource(async () => {
    const result = await sdk.client.experimental.session.list(
      { directory: null as any },
      { throwOnError: false },
    )
    return result.data ?? []
  })

  const list = createMemo(() => {
    const items = sessions() ?? []
    return items
      .filter((s: any) => !s.parentID)
      .sort((a: any, b: any) => (b.time?.updated ?? 0) - (a.time?.updated ?? 0))
      .slice(0, 50)
  })

  const currentID = createMemo(() =>
    route.data.type === "session" ? route.data.sessionID : undefined,
  )

  const shareSession = async (sessionID: string) => { // nocowboy_change start
    log(`shareSession.start ${sessionID}`)
    const sess = sync.session.get(sessionID)
    const existingUrl = sess?.share?.url
    if (existingUrl) {
      log(`shareSession.existing-url ${existingUrl}`)
      await Clipboard.copy(existingUrl)
      toast.show({ message: "Share URL copied to clipboard!", variant: "success" })
      return
    }
    try {
      const res = await sdk.client.session.share({ sessionID })
      log(`shareSession.res keys=${Object.keys(res).join(",")} hasError=${!!(res as any).error} dataType=${typeof (res as any).data}`)
      const d = (res as any).data
      if (d?.share?.url) {
        await Clipboard.copy(d.share.url)
        log(`shareSession.copied ${d.share.url}`)
        toast.show({ message: "Share URL copied to clipboard!", variant: "success" })
      } else {
        toast.show({ message: "Failed to share session", variant: "error" })
      }
    } catch (e: any) {
      log(`shareSession.error ${e?.message ?? e}`)
      toast.show({ message: e?.message ?? "Failed to share session", variant: "error" })
    }
  } // nocowboy_change end

  const tabKeys = ["info", "history", "settings"] as const

  useBindings(() => ({
    enabled: true,
    bindings: [
      {
        key: "alt+left",
        desc: "Previous tab",
        group: "Sidebar",
        cmd: () => {
          const idx = tabKeys.indexOf(tab() as any)
          setTab(tabKeys[(idx - 1 + tabKeys.length) % tabKeys.length] as SidebarTab)
          setSelectedIdx(0)
        },
      },
      {
        key: "alt+right",
        desc: "Next tab",
        group: "Sidebar",
        cmd: () => {
          const idx = tabKeys.indexOf(tab() as any)
          setTab(tabKeys[(idx + 1) % tabKeys.length] as SidebarTab)
          setSelectedIdx(0)
        },
      },
    ],
  }))

  useBindings(() => ({
    enabled: tab() === "history",
    bindings: [
      {
        key: "alt+up",
        desc: "Previous session",
        group: "Sidebar",
        cmd: () => {
          setNavigating(true) // nocowboy_change
          const next = selectedIdx() > 0 ? selectedIdx() - 1 : 0
          log(`key.up ${selectedIdx()} -> ${next} sb=${!!_historyScrollbox}`)
          setSelectedIdx(next)
          setTimeout(() => _historyScrollbox?.scrollTo(next), 0)
        },
      },
      {
        key: "alt+down",
        desc: "Next session",
        group: "Sidebar",
        cmd: () => {
          setNavigating(true) // nocowboy_change
          const len = list().length
          const next = selectedIdx() < len - 1 ? selectedIdx() + 1 : len - 1
          log(`key.down ${selectedIdx()} -> ${next} len=${len} sb=${!!_historyScrollbox}`)
          setSelectedIdx(next)
          setTimeout(() => _historyScrollbox?.scrollTo(next), 0)
        },
      },
    ],
  }))

  // nocowboy_change - return only active while navigating history via ↑↓
  useBindings(() => ({
    enabled: tab() === "history" && navigating(),
    bindings: [
      {
        key: "return",
        desc: "Open selected session",
        group: "Sidebar",
        cmd: () => {
          setNavigating(false)
          const s = list()[selectedIdx()]
          if (s) route.navigate({ type: "session", sessionID: s.id })
        },
      },
    ],
  }))

  return (
    <box
      backgroundColor={theme.backgroundPanel}
      width={42}
      height="100%"
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={2}
      paddingRight={2}
      position={props.overlay ? "absolute" : "relative"}
    >
      <TabBar active={tab()} onSelect={(t) => { setTab(t); setSelectedIdx(0) }} />

      {/* Info Tab — original sidebar content */}
      <Show when={tab() === "info"}>
        <Show when={session()} fallback={<text fg={theme.textMuted}>No active session</text>}>
          <scrollbox flexGrow={1}><box flexShrink={0} gap={1} paddingRight={1}><TuiPluginRuntime.Slot name="sidebar_title" mode="single_winner" session_id={props.sessionID} title={session()!.title} share_url={session()!.share?.url}><box paddingRight={1}><text fg={theme.text}><b>{session()!.title}</b></text><Show when={session()!.workspaceID}><text fg={theme.textMuted}><Show when={workspace()} fallback={<WorkspaceLabel type="unknown" name={session()!.workspaceID!} status="error" icon />}>{(item: any) => <WorkspaceLabel type={item().type} name={item().name} status={project.workspace.status(item().id) ?? "error"} icon />}</Show></text></Show><Show when={session()!.share?.url}><text fg={theme.textMuted}>{session()!.share!.url}</text></Show></box></TuiPluginRuntime.Slot><TuiPluginRuntime.Slot name="sidebar_content" session_id={props.sessionID} /></box></scrollbox><box flexShrink={0} gap={1} paddingTop={1}><text fg={theme.textMuted} wrapMode="word">{project.data.instance.path.directory}{sync.data.vcs?.branch ? ":" + sync.data.vcs.branch : ""}</text><text fg={theme.textMuted} wrapMode="none"><span style={{ fg: theme.success }}>•</span> <b>NoCowboy</b> <span>{InstallationVersion}</span></text></box>
        </Show>
      </Show>

      {/* History Tab — session list / nocowboy_change start */}
      <Show when={tab() === "history"}>
        <box flexDirection="row" flexShrink={0} gap={2}>
          <text fg={brand} onMouseDown={() => route.navigate({ type: "home" })}>[+ New Session]</text>
          <text fg={theme.textMuted} onMouseDown={() => { const s = list()[selectedIdx()]; if (s) { log(`share.click ${s.id}`); shareSession(s.id) } }}>[ Share ]</text>
        </box>
        <box height={1} flexShrink={0} />
        <Show when={!sessions.loading} fallback={<text fg={theme.textMuted}>Loading...</text>}>
          <scrollbox ref={(r: any) => (_historyScrollbox = r)} flexGrow={1} scrollAcceleration={scrollAcceleration()}>
            <HistoryTab
              list={list()}
              currentID={currentID()}
              selectedIdx={selectedIdx()}
               onNavigate={(id) => route.navigate({ type: "session", sessionID: id })}
               onSelectIdx={setSelectedIdx}
             />
          </scrollbox>
        </Show>
      </Show>
      {/* nocowboy_change end */}

      {/* Settings Tab — API key management */}
      <Show when={tab() === "settings"}>
        <scrollbox flexGrow={1} scrollAcceleration={scrollAcceleration()}>
          <SettingsTab />
        </scrollbox>
      </Show>
    </box>
  )
}
