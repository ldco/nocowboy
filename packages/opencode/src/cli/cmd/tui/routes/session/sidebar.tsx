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
import { getScrollAcceleration } from "../../util/scroll"
import { WorkspaceLabel } from "../../component/workspace-label"
import { useBindings } from "../../keymap"
import { DialogProvider } from "../../component/dialog-provider" // nocowboy_change
import { DialogIndexing } from "@/nocowboy/components/dialog-indexing" // nocowboy_change

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
    { key: "history", label: "History" },
    { key: "info", label: "Info" },
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

  const lspDisabled = () => sync.data.config?.lsp === false

  const toggleLsp = async () => {
    const dir = project.instance.directory() ?? ""
    if (lspDisabled()) {
      await sdk.client.config.update({ directory: dir, config: { lsp: true } as any })
    } else {
      await sdk.client.config.update({ directory: dir, config: { lsp: false } as any })
    }
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
        <text attributes={TextAttributes.BOLD} fg={theme.text}>LSP</text>
        <text fg={theme.textMuted} onMouseDown={() => toggleLsp()}>
          {lspDisabled() ? "Disabled — click to enable" : "Enabled — click to disable"}
        </text>
      </box>
      <box paddingTop={1}>
        <text attributes={TextAttributes.BOLD} fg={theme.text}>Code Indexing</text>
        <text fg={theme.textMuted} onMouseDown={() => dialog.replace(() => <DialogIndexing useSDK={() => sdk as any} />)}>
          Open indexing configuration →
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
  log(`sidebar.mount sessionID=${props.sessionID} overlay=${props.overlay}`) // debug
  const session = createMemo(() => sync.session.get(props.sessionID))
  const workspace = () => {
    const workspaceID = session()?.workspaceID
    if (!workspaceID) return
    return project.workspace.get(workspaceID)
  }
  const scrollAcceleration = createMemo(() => getScrollAcceleration(tuiConfig))
  const [tab, setTab] = createSignal<SidebarTab>("history")
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

  const tabKeys = ["history", "info", "settings"] as const

  useBindings(() => ({
    enabled: true,
    bindings: [
      {
        key: "left",
        desc: "Previous tab",
        group: "Sidebar",
        cmd: () => {
          const idx = tabKeys.indexOf(tab() as any)
          setTab(tabKeys[(idx - 1 + tabKeys.length) % tabKeys.length] as SidebarTab)
          setSelectedIdx(0)
        },
      },
      {
        key: "right",
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
        key: "up",
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
        key: "down",
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
          <scrollbox flexGrow={1}><text fg={theme.textMuted}>scrollbox works</text></scrollbox><box flexShrink={0} gap={1} paddingTop={1}><text fg={theme.textMuted} wrapMode="word">{project.data.instance.path.directory}{sync.data.vcs?.branch ? ":" + sync.data.vcs.branch : ""}</text><text fg={theme.textMuted} wrapMode="none"><span style={{ fg: theme.success }}>•</span> <b>NoCowboy</b> <span>{InstallationVersion}</span></text></box>
        </Show>
      </Show>

      {/* History Tab — session list */}
      <Show when={tab() === "history"}>
        <Show when={!sessions.loading} fallback={<text fg={theme.textMuted}>Loading...</text>}>
          <scrollbox ref={(r: any) => (_historyScrollbox = r)} flexGrow={1} scrollAcceleration={scrollAcceleration()}>{/* nocowboy_change */}
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

      {/* Settings Tab — API key management */}
      <Show when={tab() === "settings"}>
        <scrollbox flexGrow={1} scrollAcceleration={scrollAcceleration()}>
          <SettingsTab />
        </scrollbox>
      </Show>
    </box>
  )
}
