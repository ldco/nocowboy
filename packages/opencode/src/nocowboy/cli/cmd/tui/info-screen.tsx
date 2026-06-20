import { For, Show, createMemo, onMount, type JSX } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { TextAttributes, RGBA } from "@opentui/core"
import { useProject } from "@tui/context/project"
import { useSync } from "@tui/context/sync"
import { useRoute } from "@tui/context/route"
import type { AssistantMessage } from "@nocowboy/sdk/v2"
import { TodoItem } from "@tui/component/todo-item"
import { InstallationVersion } from "@opencode-ai/core/installation/version"
import { Global } from "@opencode-ai/core/global"
import * as Model from "@tui/util/model"

const brand = RGBA.fromInts(0xff, 0x68, 0x00)

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

function Entry(props: { label: string; value: string }) {
  const { theme } = useTheme()
  return (
    <box flexDirection="row" gap={2}>
      <text fg={theme.textMuted} minWidth={14}>{props.label}:</text>
      <text fg={theme.text}>{props.value}</text>
    </box>
  )
}

function Section(props: { title: string; children: JSX.Element }) {
  const { theme } = useTheme()
  return (
    <box paddingTop={1}>
      <text fg={theme.text} paddingBottom={1}><b>{props.title}</b></text>
      {props.children}
    </box>
  )
}

function Dot(props: { status: string; connectedColor: any; errorColor?: any }) {
  const { theme } = useTheme()
  const c = () => {
    if (props.status === "connected") return props.connectedColor ?? theme.success
    if (props.status === "failed" || props.status === "error") return props.errorColor ?? theme.error
    if (props.status === "disabled") return theme.textMuted
    if (props.status === "needs_auth") return theme.warning
    if (props.status === "needs_client_registration") return theme.error
    return theme.textMuted
  }
  return <text flexShrink={0} style={{ fg: c() }}>•</text>
}

export function InfoScreen() {
  const { theme } = useTheme()
  const project = useProject()
  const sync = useSync()
  const route = useRoute()

  const sessionID = createMemo(() => {
    if (route.data.type === "session") return route.data.sessionID
    return (sync.data.session as any[])?.[0]?.id ?? null
  })
  const session = createMemo(() => {
    const id = sessionID()
    return id ? sync.session.get(id) : null
  })
  const messages = createMemo(() => {
    const id = sessionID()
    return id ? (sync.data.message[id] ?? []) : []
  })

  // --- Context widget ---
  const lastAssistant = createMemo(() =>
    messages().findLast((item): item is AssistantMessage =>
      item.role === "assistant" && item.tokens.output > 0,
    ),
  )
  const contextData = createMemo(() => {
    const last = lastAssistant()
    if (!last) return { tokens: null, percent: null, cost: null }
    const tokens =
      last.tokens.input + last.tokens.output + last.tokens.reasoning
      + last.tokens.cache.read + last.tokens.cache.write
    const providers = Model.index(sync.data.provider)
    const model = providers.get(last.providerID)?.models[last.modelID]
    const percent = model?.limit.context ? Math.round((tokens / model.limit.context) * 100) : null
    return { tokens, percent, cost: session()?.cost ?? 0 }
  })

  // --- Files widget ---
  const diffs = createMemo(() => {
    const id = sessionID()
    return id ? (sync.data.session_diff[id] ?? []) : []
  })

  // --- Todo widget ---
  const todos = createMemo(() => {
    const id = sessionID()
    return id ? (sync.data.todo[id] ?? []) : []
  })
  const showTodos = createMemo(() =>
    todos().length > 0 && todos().some((item: any) => item.status !== "completed"),
  )

  // --- MCP widget ---
  const mcpList = createMemo(() =>
    Object.entries(sync.data.mcp ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, item]: [string, any]) => ({
        name,
        status: item.status,
        error: item.status === "failed" ? item.error : undefined,
      })),
  )
  const mcpOn = createMemo(() => mcpList().filter((item) => item.status === "connected").length)
  const mcpBad = createMemo(() =>
    mcpList().filter((item) =>
      item.status === "failed" || item.status === "needs_auth" || item.status === "needs_client_registration",
    ).length,
  )
  const mcpStatusText = createMemo(() => {
    if (mcpOn() === 0 && mcpBad() === 0) return ""
    const parts: string[] = []
    if (mcpOn() > 0) parts.push(`${mcpOn()} active`)
    if (mcpBad() > 0) parts.push(`${mcpBad()} error${mcpBad() > 1 ? "s" : ""}`)
    return " (" + parts.join(", ") + ")"
  })

  // --- LSP widget ---
  const lspList = createMemo(() => (sync.data.lsp ?? []).map((item: any) => ({
    id: item.id,
    root: item.root,
    status: item.status,
  })))
  const lspOff = createMemo(() => sync.data.config?.lsp === false)

  // --- Footer path ---
  const pathData = createMemo(() => {
    const dir = project.data.instance.path.directory || process.cwd()
    const out = dir.replace(Global.Path.home, "~")
    const branch = sync.data.vcs?.branch
    return branch ? out + ":" + branch : out
  })

  onMount(() => {
    const id = sessionID()
    if (id) sync.session.sync(id)
  })

  return (
    <box flexDirection="column" flexGrow={1} paddingX={4} paddingY={2}>
      <text attributes={TextAttributes.BOLD} fg={brand} paddingBottom={1}>
        NoCowboy Info {InstallationVersion}
      </text>

      {/* --- Context / Tokens --- */}
      <Section title="Context">
        <Entry label="Tokens" value={contextData().tokens?.toLocaleString() ?? "--"} />
        <Entry label="Used" value={`${contextData().percent ?? 0}%`} />
        <Entry label="Cost" value={contextData().cost != null ? money.format(contextData().cost!) : "--"} />
      </Section>

      {/* --- Session --- */}
      <Section title="Session">
        <Entry label="Name" value={session()?.title ?? "-"} />
        <Entry label="Messages" value={String(messages().length)} />
      </Section>

      {/* --- Environment --- */}
      <Section title="Environment">
        <Entry label="Directory" value={pathData()} />
        <Entry label="Sessions" value={String(sync.data.session.length)} />
        <Entry label="Providers" value={String(sync.data.provider.length)} />
      </Section>

      {/* --- Modified Files --- */}
      <Show when={diffs().length > 0}>
        <Section title="Modified Files">
          <For each={diffs()}>
            {(d: any) => (
              <box flexDirection="row" gap={1} justifyContent="space-between">
                <text fg={theme.textMuted} wrapMode="none">{d.file ?? d.path}</text>
                <box flexDirection="row" gap={1} flexShrink={0}>
                  <Show when={d.additions}><text fg={theme.diffAdded}>+{d.additions}</text></Show>
                  <Show when={d.deletions}><text fg={theme.diffRemoved}>-{d.deletions}</text></Show>
                </box>
              </box>
            )}
          </For>
        </Section>
      </Show>

      {/* --- Todos --- */}
      <Show when={showTodos()}>
        <Section title="Todo">
          <For each={todos()}>
            {(t: any) => <TodoItem status={t.status} content={t.content} />}
          </For>
        </Section>
      </Show>

      {/* --- MCP --- */}
      <Show when={mcpList().length > 0}>
        <Section title={"MCP" + mcpStatusText()}>
          <For each={mcpList()}>
            {(item: any) => (
              <box flexDirection="row" gap={1}>
                <Dot status={item.status} connectedColor={theme.success} errorColor={theme.error} />
                <text fg={theme.text} wrapMode="word">
                  {item.name}{" "}
                  <span style={{ fg: theme.textMuted }}>
                    <Show when={item.status === "connected"}>Connected</Show>
                    <Show when={item.status === "failed"}>{item.error ?? "Failed"}</Show>
                    <Show when={item.status === "disabled"}>Disabled</Show>
                    <Show when={item.status === "needs_auth"}>Needs auth</Show>
                    <Show when={item.status === "needs_client_registration"}>Needs client ID</Show>
                    <Show when={!["connected", "failed", "disabled", "needs_auth", "needs_client_registration"].includes(item.status)}>
                      {item.status}
                    </Show>
                  </span>
                </text>
              </box>
            )}
          </For>
        </Section>
      </Show>

      {/* --- LSP --- */}
      <Section title="LSP">
        <Show when={lspList().length === 0}>
          <text fg={theme.textMuted}>
            {lspOff() ? "LSPs are disabled" : "LSPs will activate as files are read"}
          </text>
        </Show>
        <For each={lspList()}>
          {(item: any) => (
            <box flexDirection="row" gap={1}>
              <Dot status={item.status} connectedColor={theme.success} errorColor={theme.error} />
              <text fg={theme.textMuted}>{item.id} {item.root ?? ""}</text>
            </box>
          )}
        </For>
      </Section>

      {/* --- Footer --- */}
      <box paddingTop={2}>
        <text fg={theme.textMuted}>
          <span style={{ fg: theme.success }}>•</span> <b>NoCowboy</b> <span>{InstallationVersion}</span>
        </text>
      </box>
    </box>
  )
}
