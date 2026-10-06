import { createMemo, createResource, createSignal, Show } from "solid-js"
import { useRouteData } from "@tui/context/route"
import { useSync } from "@tui/context/sync"
import { useTheme } from "@tui/context/theme"
import { SplitBorder } from "@tui/component/border"
import { Spinner } from "@tui/component/spinner"
import { useLocal } from "@tui/context/local"
import type { AssistantMessage, Message, Provider, Session } from "@nocowboy/sdk/v2"
import { Locale } from "@/util/locale"
import { useTerminalDimensions } from "@opentui/solid"
import { useCommandPalette } from "../../context/command-palette"
import { useCommandShortcut } from "../../keymap"
import { balanceAmount, balanceColorOf, fetchBalance, findBalanceProvider } from "@/nocowboy/provider-balance"

export function SubagentFooter() {
  const route = useRouteData("session")
  const sync = useSync()
  const local = useLocal()
  const messages = createMemo(() => sync.data.message[route.sessionID] ?? [])
  const session = createMemo(() => sync.session.get(route.sessionID))

  const lastAssistant = createMemo(() => messages().findLast((m: Message) => m.role === "assistant"))

  const isRunning = createMemo(() => {
    const status = sync.data.session_status?.[route.sessionID]
    if (status?.type === "busy") return true
    const last = lastAssistant()
    if (last && !last.time.completed) return true
    return false
  })

  const agentColor = createMemo(() => local.agent.color(lastAssistant()?.agent ?? ""))

  const subagentInfo = createMemo(() => {
    const s = session()
    if (!s) return { label: "Subagent", index: 0, total: 0 }
    const agentMatch = s.title.match(/@(\w+) subagent/)
    const label = agentMatch ? Locale.titlecase(agentMatch[1]) : "Subagent"

    if (!s.parentID) return { label, index: 0, total: 0 }

    const siblings = sync.data.session
      .filter((x: Session) => x.parentID === s.parentID)
      .toSorted((a: Session, b: Session) => a.time.created - b.time.created)
    const index = siblings.findIndex((x: Session) => x.id === s.id)

    return { label, index: index + 1, total: siblings.length }
  })

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  })

  // For subagent footer, find any balance-aware provider (typically deepseek)
  const balanceProvider = createMemo(() => {
    return findBalanceProvider(sync.data.provider as Provider[], "deepseek", "")
  })

  const { theme } = useTheme()

  const [balanceData] = createResource(
    () => {
      const bp = balanceProvider()
      if (!bp) return null
      return { key: bp.apiKey, pid: bp.providerID, baseURL: bp.baseURL, version: messages().length }
    },
    (input) => fetchBalance(input.pid, input.key, input.baseURL),
  )

  const balance = createMemo(() => balanceData())
  const balanceFg = createMemo(() => {
    const color = balanceColorOf(balance())
    return color ? theme[color] : theme.textMuted
  })

  const usage = createMemo(() => {
    const msg = messages()
    const last = msg.findLast((item: Message): item is AssistantMessage => item.role === "assistant" && (item as any).tokens?.output > 0)
    if (!last) return

    const tokens =
      last.tokens.input + last.tokens.output + last.tokens.reasoning + last.tokens.cache.read + last.tokens.cache.write
    if (tokens <= 0) return

    const model = (sync.data.provider as Provider[]).find((item: Provider) => item.id === last.providerID)?.models[last.modelID]
    const pct = model?.limit.context ? `${Math.round((tokens / model.limit.context) * 100)}%` : undefined

    return {
      context: pct ? `${Locale.number(tokens)} (${pct})` : Locale.number(tokens),
    }
  })
  const command = useCommandPalette()
  const parentShortcut = useCommandShortcut("session.parent")
  const previousShortcut = useCommandShortcut("session.child.previous")
  const nextShortcut = useCommandShortcut("session.child.next")
  const [hover, setHover] = createSignal<"parent" | "prev" | "next" | null>(null)
  useTerminalDimensions()

  return (
    <box flexShrink={0}>
      <box
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={1}
        {...SplitBorder}
        border={["left"]}
        borderColor={theme.border}
        flexShrink={0}
        backgroundColor={theme.backgroundPanel}
      >
        <box flexDirection="row" justifyContent="space-between" gap={1}>
          <box flexDirection="row" gap={1}>
            <text fg={theme.text}>
              <b>{subagentInfo().label}</b>
            </text>
            <Show when={subagentInfo().total > 0}>
              <text style={{ fg: theme.textMuted }}>
                ({subagentInfo().index} of {subagentInfo().total})
              </text>
            </Show>
            <Show when={isRunning()}>
              <Spinner color={agentColor()} />
            </Show>
            <Show when={usage()} keyed={true}>
              {(item: { context: string }) => (
                <text fg={theme.textMuted} wrapMode="none">
                  {item.context}
                </text>
              )}
            </Show>
            <text fg={balanceFg()} wrapMode="none">
              {balanceAmount(balance()) === undefined ? "—" : money.format(balanceAmount(balance())!)}
            </text>
          </box>
          <box flexDirection="row" gap={2}>
            <box
              onMouseOver={() => setHover("parent")}
              onMouseOut={() => setHover(null)}
              onMouseUp={() => command.run("session.parent")}
              backgroundColor={hover() === "parent" ? theme.backgroundElement : theme.backgroundPanel}
            >
              <text fg={theme.text}>
                Parent <span style={{ fg: theme.textMuted }}>{parentShortcut()}</span>
              </text>
            </box>
            <box
              onMouseOver={() => setHover("prev")}
              onMouseOut={() => setHover(null)}
              onMouseUp={() => command.run("session.child.previous")}
              backgroundColor={hover() === "prev" ? theme.backgroundElement : theme.backgroundPanel}
            >
              <text fg={theme.text}>
                Prev <span style={{ fg: theme.textMuted }}>{previousShortcut()}</span>
              </text>
            </box>
            <box
              onMouseOver={() => setHover("next")}
              onMouseOut={() => setHover(null)}
              onMouseUp={() => command.run("session.child.next")}
              backgroundColor={hover() === "next" ? theme.backgroundElement : theme.backgroundPanel}
            >
              <text fg={theme.text}>
                Next <span style={{ fg: theme.textMuted }}>{nextShortcut()}</span>
              </text>
            </box>
          </box>
        </box>
      </box>
    </box>
  )
}
