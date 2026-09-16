import { useProject } from "@tui/context/project"
import { useSync } from "@tui/context/sync"
import { useRoute } from "@tui/context/route"
import { useSDK } from "@tui/context/sdk"
import { useDialog } from "@tui/ui/dialog"
import { DialogPrompt } from "@tui/ui/dialog-prompt"
import { DialogMcp } from "../../component/dialog-mcp"
import { createMemo, createSignal, createResource, Show, For, type JSX } from "solid-js"
import { useTheme } from "../../context/theme"
import { useI18n } from "../../context/i18n"
import { useTuiConfig } from "../../context/tui-config"
import { InstallationVersion } from "@nocowboy/core/installation/version"
import { TuiPluginRuntime } from "@/cli/cmd/tui/plugin/runtime"
import { RGBA, TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/solid"
import { getScrollAcceleration } from "../../util/scroll"
import { WorkspaceLabel } from "../../component/workspace-label"
import { useBindings } from "../../keymap"
import { DialogProvider } from "../../component/dialog-provider"
import { DialogIndexing } from "@/nocowboy/components/dialog-indexing"
import * as Clipboard from "../../util/clipboard"
import { useToast } from "../../ui/toast"
import { slashDisplay } from "@/nocowboy/cli/cmd/command-display"
let _historyScrollbox: any = undefined

// DEBUG — remove after stable
import { appendFileSync } from "node:fs"
console.log("SIDEBAR MODULE LOADED")
const LOG = "/tmp/nocowboy-sidebar.log"
function log(msg: string) { appendFileSync(LOG, `${new Date().toISOString()} ${msg}\n`) }
log("=== SIDEBAR STARTED ===")

type SidebarTab = "info" | "history" | "commands" | "settings"
const brand = RGBA.fromInts(0xff, 0x68, 0x00)

function TabBar(props: { active: SidebarTab; onSelect: (tab: SidebarTab) => void }) {
  const { theme } = useTheme()
  const t = useI18n()
  const tabs: { key: SidebarTab; label: string }[] = [
    { key: "info", label: t("sidebar.info") },
    { key: "history", label: t("sidebar.history") },
    { key: "commands", label: t("sidebar.templates") },
    { key: "settings", label: t("settings.title") },
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
  // mcpMsg removed — MCP list moved to Info tab (sidebar/mcp.tsx)

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

  const toggleLsp = () => {
    setLspError(false)
    const dir = project.instance.directory() ?? ""
    const next = !lspEnabled()
    const updated = { ...(sync.data.config as any ?? {}), lsp: next }
    sync.set("config", updated)
    sdk.client.config.update({
      directory: dir,
      config: { lsp: next },
    }).catch(() => setLspError(true))
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
      <box paddingTop={1}>
        <text attributes={TextAttributes.BOLD} fg={theme.text}>LSP</text>
        <text fg={lspStatusColor()}>
          {lspError() ? "Error" : lspEnabled() ? "Enabled" : "Disabled"}
        </text>
        <text fg={theme.textMuted} onMouseDown={() => { toggleLsp() }}>
          {lspEnabled() ? "Click to disable" : "Click to enable"}
        </text>
      </box>

      {/* MCP Servers section */}
      <box paddingTop={1} flexDirection="column" gap={1}>
        <text attributes={TextAttributes.BOLD} fg={theme.text}>MCP Servers</text>
        <text fg={theme.textMuted} onMouseDown={() => dialog.replace(() => <DialogMcp />)}>
          + Add MCP Server
        </text>
      </box>
    </box>
  )
}

function CommandsTab() {
  const { theme } = useTheme()
  const sync = useSync()
  const sdk = useSDK()
  const route = useRoute()
  const dialog = useDialog()
  const toast = useToast()

  const sessionID = () => {
    if (route.data.type === "session") return route.data.sessionID
    return undefined
  }

  // Pick primary agent (first non-hidden with mode !== "primary" means subagent; primary is the main one)
  const primaryAgent = createMemo(() => {
    const agents = sync.data.agent
    const primary = agents.find((a: any) => a.mode === "primary" || a.name === "primary")
    if (primary) return primary.name
    // Fallback: first non-hidden
    const visible = agents.find((a: any) => !a.hidden)
    return visible?.name ?? ""
  })

  // Collect agentic commands from sync.data.command
  const entries = createMemo(() => {
    const items: { name: string; display: string; description: string; source: string; agent?: string; model?: string }[] = []

    for (const cmd of sync.data.command) {
      items.push({
        name: cmd.name,
        display: slashDisplay(cmd),
        description: cmd.description ?? "",
        source: cmd.source ?? "command",
        agent: cmd.agent,
        model: cmd.model,
      })
    }

    items.sort((a, b) => a.display.localeCompare(b.display))
    return items
  })

  // Group by source: Commands, MCP, Skills
  const sections = createMemo(() => {
    const all = entries()
    const groups: { label: string; items: typeof all }[] = []
    const order = ["command", "mcp", "skill"]
    const labels: Record<string, string> = {
      command: "Commands",
      mcp: "MCP",
      skill: "Skills",
    }
    for (const src of order) {
      const filtered = all.filter((i) => i.source === src)
      if (filtered.length > 0) {
        groups.push({ label: labels[src] ?? src, items: filtered })
      }
    }
    return groups
  })

  const [executing, setExecuting] = createSignal<string | null>(null)

  const fireCommand = async (item: { name: string; display: string; description: string; agent?: string; model?: string }) => {
    const sid = sessionID()
    if (!sid) {
      toast.show({ message: "No active session", variant: "error" })
      return
    }

    // Show input dialog — user can type arguments or submit empty to run as-is
    const input = await DialogPrompt.show(dialog, item.display, {
      description: () => <text fg={theme.textMuted}>{item.description}</text>,
      placeholder: "Arguments (optional) — Enter to submit, Esc to cancel",
    })
    if (input === null) return // user cancelled

    setExecuting(item.name)
    try {
      const result = await sdk.client.session.command({
        sessionID: sid,
        command: item.name,
        agent: item.agent ?? primaryAgent(),
        arguments: input,
      })
      if (result.error) {
        toast.show({ message: `Command failed: ${result.error.data?.message ?? "unknown error"}`, variant: "error" })
      } else {
        toast.show({ message: `Executed ${item.display}`, variant: "success" })
      }
    } catch (e: any) {
      toast.show({ message: `Command error: ${e?.message ?? e}`, variant: "error" })
    } finally {
      setExecuting(null)
    }
  }

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Hint text */}
      <box flexShrink={0} paddingBottom={1}>
        <text fg={theme.textMuted} wrapMode="word">
          Click a template to run it — add optional arguments in the dialog.
        </text>
      </box>

      <scrollbox flexGrow={1} paddingRight={1}>
        <For each={sections()}>
          {(sec) => (
            <box flexDirection="column" gap={1} paddingBottom={1}>
              <text fg={brand} attributes={TextAttributes.BOLD}>{sec.label}</text>
              <For each={sec.items}>
                {(item) => (
                  <box
                    flexDirection="column"
                    paddingLeft={1}
                    onMouseDown={() => fireCommand(item)}
                  >
                    <text
                      fg={executing() === item.name ? theme.warning : theme.text}
                      wrapMode="none"
                    >
                      {executing() === item.name ? `${item.display}...` : item.display}
                    </text>
                    <text fg={theme.textMuted} wrapMode="word">{item.description}</text>
                  </box>
                )}
              </For>
            </box>
          )}
        </For>

        <Show when={entries().length === 0}>
          <text fg={theme.textMuted}>No commands configured</text>
        </Show>
      </scrollbox>
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
  const toast = useToast()
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
  const [navigating, setNavigating] = createSignal(false)

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

  const shareSession = async (sessionID: string) => {
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
  }

  const tabKeys = ["info", "history", "commands", "settings"] as const

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
          setNavigating(true)
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
          setNavigating(true)
          const len = list().length
          const next = selectedIdx() < len - 1 ? selectedIdx() + 1 : len - 1
          log(`key.down ${selectedIdx()} -> ${next} len=${len} sb=${!!_historyScrollbox}`)
          setSelectedIdx(next)
          setTimeout(() => _historyScrollbox?.scrollTo(next), 0)
        },
      },
    ],
  }))

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
      {/* Commands Tab — nocowboy_change start */}
      <Show when={tab() === "commands"}>
        <CommandsTab />
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
