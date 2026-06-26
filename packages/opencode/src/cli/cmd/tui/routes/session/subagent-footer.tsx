import { createMemo, createResource, createSignal, Show } from "solid-js"
import { useRouteData } from "@tui/context/route"
import { useSync } from "@tui/context/sync"
import { useTheme } from "@tui/context/theme"
import { SplitBorder } from "@tui/component/border"
import { Spinner } from "@tui/component/spinner" // nocowboy_change
import { useLocal } from "@tui/context/local" // nocowboy_change
import type { AssistantMessage, Message, Provider, Session } from "@nocowboy/sdk/v2"
import { Locale } from "@/util/locale"
import { useTerminalDimensions } from "@opentui/solid"
import { useCommandPalette } from "../../context/command-palette"
import { useCommandShortcut } from "../../keymap"

export function SubagentFooter() {
  const route = useRouteData("session")
  const sync = useSync()
  const local = useLocal() // nocowboy_change
  const messages = createMemo(() => sync.data.message[route.sessionID] ?? [])
  const session = createMemo(() => sync.session.get(route.sessionID))

  // nocowboy_change start
  const lastAssistant = createMemo(() => messages().findLast((m: Message) => m.role === "assistant"))

  const isRunning = createMemo(() => {
    const status = sync.data.session_status?.[route.sessionID]
    if (status?.type === "busy") return true
    const last = lastAssistant()
    if (last && !last.time.completed) return true
    return false
  })

  const agentColor = createMemo(() => local.agent.color(lastAssistant()?.agent ?? ""))
  // nocowboy_change end

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

  // nocowboy_change start — reactive per-provider balance
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  })

  const currentProvider = createMemo(() => {
    const cur = local.model.current()
    return cur?.providerID ?? null
  })

  type BalanceFetcher = (key: string) => Promise<number>

  const BALANCE_APIS: Record<string, BalanceFetcher> = {
    deepseek: async (key) => {
      try {
        const res = await fetch("https://api.deepseek.com/user/balance", {
          headers: { Authorization: `Bearer ${key}` },
        })
        if (!res.ok) return 0
        const data = await res.json() as { balance_infos?: Array<{ currency: string; total_balance: string }> }
        const usd = (data.balance_infos ?? []).find((b) => b.currency === "USD")
        return usd ? parseFloat(usd.total_balance) : 0
      } catch {
        return 0
      }
    },
    openai: async (key) => {
      try {
        const res = await fetch("https://api.openai.com/v1/dashboard/billing/credit_grants", {
          headers: { Authorization: `Bearer ${key}` },
        })
        if (!res.ok) return 0
        const data = await res.json() as { total_available?: number }
        return data.total_available ?? 0
      } catch {
        return 0
      }
    },
  }

  const providerBalance = createMemo<{ key: string; fetcher: BalanceFetcher } | null>(() => {
    const pid = currentProvider()
    if (!pid) return null
    const fetcher = BALANCE_APIS[pid]
    if (!fetcher) return null
    for (const p of sync.data.provider as Provider[]) {
      if (p.id === pid && p.key) return { key: p.key, fetcher }
    }
    return null
  })

  const [balanceData] = createResource(
    () => {
      const info = providerBalance()
      if (!info) return null
      return { key: info.key, fetcher: info.fetcher, version: messages().length }
    },
    (input) => input.fetcher(input.key),
  )

  const balance = createMemo(() => balanceData() ?? 0)
  const balanceFg = createMemo(() => {
    const b = balance()
    if (b > 10) return theme.success
    if (b >= 3) return theme.warning
    return theme.error
  })
  // nocowboy_change end

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

  const { theme } = useTheme()
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
            {/* nocowboy_change start */}
            <Show when={isRunning()}>
              <Spinner color={agentColor()} />
            </Show>
            {/* nocowboy_change end */}
            <Show when={usage()} keyed={true}>
              {(item: { context: string }) => (
                <text fg={theme.textMuted} wrapMode="none">
                  {item.context}
                </text>
              )}
            </Show>
            <text fg={balanceFg()} wrapMode="none">
              {money.format(balance())}
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
