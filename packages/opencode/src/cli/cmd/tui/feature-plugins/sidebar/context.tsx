import type { AssistantMessage, Message, Provider, Session } from "@nocowboy/sdk/v2"
import type { TuiPlugin, TuiPluginApi } from "@nocowboy/plugin/tui"
import type { InternalTuiPlugin } from "../../plugin/internal"
import { createMemo, Show } from "solid-js"
import { useSync } from "@tui/context/sync"
import { useLocal } from "@tui/context/local"

const id = "internal:sidebar-context"

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const sync = useSync()
  const local = useLocal()
  const msg = createMemo(() => props.api.state.session.messages(props.session_id))
  const messages = msg

  const currentProvider = createMemo(() => {
    const cur = local.model.current()
    return cur?.providerID ?? null
  })

  const totalSpent = createMemo(() =>
    (sync.data.session as Session[]).reduce((sum: number, s: Session) => sum + (s.cost ?? 0), 0),
  )

  const state = createMemo(() => {
    const last = messages().findLast((item: Message): item is AssistantMessage => item.role === "assistant" && (item as AssistantMessage).tokens?.output > 0)
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
    const b = totalSpent()
    if (b > 10) return theme().success
    if (b >= 3) return theme().warning
    return theme().error
  })

  return (
    <box>
      <text fg={theme().text}>
        <b>Spent</b>
      </text>
      <text fg={balanceFg()}>{money.format(totalSpent())}</text>
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
