import type { AssistantMessage, Message, Provider } from "@nocowboy/sdk/v2"
import type { TuiPlugin, TuiPluginApi } from "@nocowboy/plugin/tui"
import type { InternalTuiPlugin } from "../../plugin/internal"
import { createMemo, createResource, Show } from "solid-js"
import { useSync } from "@tui/context/sync"
import { useLocal } from "@tui/context/local"

const id = "internal:sidebar-context"

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

async function fetchDeepSeekBalance(key: string): Promise<number> {
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
}

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const sync = useSync()
  const local = useLocal()
  const msg = createMemo(() => props.api.state.session.messages(props.session_id))

  const providerKey = createMemo<string | null>(() => {
    for (const p of sync.data.provider as Provider[]) {
      if (p.id === "deepseek") return p.key ?? null
    }
    return null
  })

  const [balance] = createResource(
    () => {
      const key = providerKey()
      if (!key) return null
      return { key, version: msg().length }
    },
    (input) => fetchDeepSeekBalance(input.key),
  )

  const state = createMemo(() => {
    const last = msg().findLast((item: Message): item is AssistantMessage => item.role === "assistant" && (item as AssistantMessage).tokens?.output > 0)
    if (!last) {
      return { tokens: 0, percent: null }
    }
    const tokens =
      last.tokens.input + last.tokens.output + last.tokens.reasoning + last.tokens.cache.read + last.tokens.cache.write
    const model = (props.api.state.provider as Provider[]).find((item) => item.id === last.providerID)?.models[last.modelID]
    return {
      tokens,
      percent: model?.limit.context ? Math.round((tokens / model.limit.context) * 100) : null,
    }
  })

  const balanceFg = createMemo(() => {
    const b = balance() ?? 0
    if (b > 10) return theme().success
    if (b >= 3) return theme().warning
    return theme().error
  })

  return (
    <box>
      <text fg={theme().text}>
        <b>Balance</b>
      </text>
      <text fg={balanceFg()}>{money.format(balance() ?? 0)}</text>
      <text fg={theme().text}>
        <b>Context</b>
      </text>
      <text fg={theme().textMuted}>{state().tokens.toLocaleString()} tokens</text>
      <text fg={theme().textMuted}>{state().percent ?? 0}% used</text>
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 100,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} session_id={props.session_id} />
      },
    },
  })
}

const plugin: InternalTuiPlugin = {
  id,
  tui,
}

export default plugin
