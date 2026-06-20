import { For, Show, createMemo } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { TextAttributes, RGBA } from "@opentui/core"
import { useProject } from "@tui/context/project"
import { useSync } from "@tui/context/sync"
import { useRoute } from "@tui/context/route"
import type { AssistantMessage } from "@nocowboy/sdk/v2"
import { InstallationVersion, InstallationLocal } from "@opencode-ai/core/installation/version"
import { Global } from "@opencode-ai/core/global"

const brand = RGBA.fromInts(0xff, 0x68, 0x00)

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

type Section = { label: string; value: string }

export function InfoScreen() {
  const { theme } = useTheme()
  const project = useProject()
  const sync = useSync()
  const route = useRoute()

  const sessionID = createMemo(() =>
    route.data.type === "session" ? route.data.sessionID : null,
  )

  const session = createMemo(() => {
    const id = sessionID()
    return id ? sync.session.get(id) : null
  })

  const messages = createMemo(() => {
    const id = sessionID()
    return id ? (sync.data.message[id] ?? []) : []
  })

  const lastAssistant = createMemo(() =>
    messages().findLast((item): item is AssistantMessage =>
      item.role === "assistant" && item.tokens.output > 0,
    ),
  )

  const tokens = createMemo(() => {
    const msg = lastAssistant()
    if (!msg) return 0
    return msg.tokens.input + msg.tokens.output + msg.tokens.reasoning
      + msg.tokens.cache.read + msg.tokens.cache.write
  })

  const cost = createMemo(() => session()?.cost ?? 0)

  const diffs = createMemo(() => {
    const id = sessionID()
    return id ? (sync.data.session_diff[id] ?? []) : []
  })

  const todos = createMemo(() => {
    const id = sessionID()
    return id ? (sync.data.todo[id] ?? []) : []
  })

  const mcpServers = createMemo(() => Object.entries(sync.data.mcp ?? {}))
  const lspServers = createMemo(() => sync.data.lsp ?? [])
  const providers = createMemo(() => sync.data.provider ?? [])

  const env = createMemo(() => {
    const rows: Section[] = []
    const dir = project.data.instance.path.directory
    if (dir) {
      let display = dir.replace(Global.Path.home, "~")
      if (sync.data.vcs?.branch) display += ":" + sync.data.vcs.branch
      rows.push({ label: "Directory", value: display })
    }
    const v = sync.data.globalConfig as any
    if (v?.directory) rows.push({ label: "Config", value: v.directory.replace(Global.Path.home, "~") })
    if (!InstallationLocal) rows.push({ label: "Version", value: InstallationVersion })
    rows.push({ label: "Sessions", value: String(sync.data.session.length) })
    rows.push({ label: "Providers", value: String(providers().length) })
    return rows
  })

  const sessionRows = createMemo(() => {
    const s = session()
    if (!s) return [] as Section[]
    return [
      { label: "Session", value: s.title },
      { label: "Messages", value: String(messages().length) },
      { label: "Tokens", value: tokens().toLocaleString() },
      { label: "Cost", value: money.format(cost()) },
      { label: "Files changed", value: String(diffs().length) },
      { label: "Todos", value: String(todos().length) },
    ]
  })

  return (
    <box flexDirection="column" flexGrow={1} paddingX={4} paddingY={2}>
      <text attributes={TextAttributes.BOLD} fg={brand} paddingBottom={1}>
        NoCowboy Info
      </text>

      <text fg={theme.textMuted} paddingBottom={1}>Environment</text>
      <For each={env()}>
        {(row) => (
          <box flexDirection="row" gap={2}>
            <text fg={theme.textMuted} minWidth={14}>{row.label}:</text>
            <text fg={theme.text}>{row.value}</text>
          </box>
        )}
      </For>

      <Show when={sessionRows().length > 0}>
        <box paddingTop={1}>
          <text fg={theme.textMuted} paddingBottom={1}>Session</text>
          <For each={sessionRows()}>
            {(row) => (
              <box flexDirection="row" gap={2}>
                <text fg={theme.textMuted} minWidth={14}>{row.label}:</text>
                <text fg={theme.text}>{row.value}</text>
              </box>
            )}
          </For>
        </box>

        <Show when={diffs().length > 0}>
          <text fg={theme.text} paddingTop={1} paddingBottom={1}>
            <b>Modified Files</b>
          </text>
          <scrollbox maxHeight={8}>
            <For each={diffs()}>
              {(d: any) => (
                <box gap={1}>
                  <text fg={theme.success}>+{d.additions}</text>
                  <text fg={theme.error}>-{d.deletions}</text>
                  <text fg={theme.textMuted}>{d.file}</text>
                </box>
              )}
            </For>
          </scrollbox>
        </Show>

        <Show when={todos().length > 0}>
          <text fg={theme.text} paddingTop={1} paddingBottom={1}>
            <b>Todos</b>
          </text>
          <scrollbox maxHeight={8}>
            <For each={todos()}>
              {(t: any) => (
                <text fg={t.status === "completed" ? theme.success : theme.textMuted}>
                  {t.status === "completed" ? "✓" : "☐"} {t.content}
                </text>
              )}
            </For>
          </scrollbox>
        </Show>
      </Show>

      <Show when={mcpServers().length > 0}>
        <text fg={theme.text} paddingTop={1} paddingBottom={1}>
          <b>MCP Servers</b>
        </text>
        <For each={mcpServers()}>
          {([name, info]: [string, any]) => (
            <box gap={1}>
              <text fg={info?.status === "connected" ? theme.success : theme.error}>
                {info?.status === "connected" ? "●" : "○"}
              </text>
              <text fg={theme.textMuted}>{name}</text>
            </box>
          )}
        </For>
      </Show>

      <Show when={lspServers().length > 0}>
        <text fg={theme.text} paddingTop={1} paddingBottom={1}>
          <b>LSP Servers</b>
        </text>
        <For each={lspServers()}>
          {(srv: any) => (
            <box gap={1}>
              <text fg={srv.status === "connected" ? theme.success : theme.error}>
                {srv.status === "connected" ? "●" : "○"}
              </text>
              <text fg={theme.textMuted}>{srv.name ?? srv.id}</text>
            </box>
          )}
        </For>
      </Show>

      <Show when={!session()}>
        <text fg={theme.textMuted} paddingTop={1}>
          Open a session to see session-specific data.
        </text>
      </Show>
    </box>
  )
}
