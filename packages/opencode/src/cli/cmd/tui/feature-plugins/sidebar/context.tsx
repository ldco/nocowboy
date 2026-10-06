import type { AssistantMessage, Message, Provider } from "@nocowboy/sdk/v2"
import type { TuiPlugin, TuiPluginApi } from "@nocowboy/plugin/tui"
import type { InternalTuiPlugin } from "../../plugin/internal"
import { createMemo, createResource, createSignal, onCleanup, onMount, Show } from "solid-js"
import { useSync } from "@tui/context/sync"
import { useLocal } from "@tui/context/local"
import {
  balanceAmount,
  balanceColorOf,
  clearBalanceCache,
  fetchBalance,
  findBalanceDescriptor,
  findBalanceProvider,
  getPeakPricing,
} from "@/nocowboy/provider-balance"
import { RGBA } from "@opentui/core"
import { appendFileSync } from "node:fs"
import { t, p } from "@tui/context/i18n"
import { profileLabel, resolveContextProfile, type ContextProfile } from "@/nocowboy/session/context-profile"

const BLOG = "/tmp/nocowboy-balance.log"

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
  const brand = RGBA.fromInts(0xff, 0x68, 0x00)

  const providerInfo = createMemo(() => {
    const cur = local.model.current()
    if (!cur) return null
    const found = findBalanceProvider(sync.data.provider as Provider[], cur.providerID, cur.modelID)
    if (!found) return null
    appendFileSync(BLOG, `${new Date().toISOString()} PROVIDER matched=${found.providerID} name=${found.name} baseURL=${found.baseURL ?? "none"}\n`)
    return found
  })

  const [balance, { refetch }] = createResource(
    () => {
      const info = providerInfo()
      if (!info) return null
      return { key: info.apiKey, version: msg().length, pid: info.providerID, baseURL: info.baseURL }
    },
    (input) => fetchBalance(input.pid, input.key, input.baseURL),
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

  // Active context profile — resolved from the config + the current model window
  // (pure, turn-independent), shown next to the window usage below.
  const activeProfile = createMemo<ContextProfile | null>(() => {
    const cur = local.model.current()
    if (!cur) return null
    const model = (props.api.state.provider as Provider[]).find((item) => item.id === cur.providerID)?.models[cur.modelID]
    const context = model?.limit.context ?? 0
    if (!context) return null
    const cfg = sync.data.config as { context_profile?: ContextProfile; budget?: { max_tokens?: number } }
    return resolveContextProfile({
      requested: cfg?.context_profile,
      modelContext: context,
      budgetMaxTokens: cfg?.budget?.max_tokens,
    }).profile
  })

  const contextHeader = createMemo(() => {
    const profile = activeProfile()
    return profile ? `${t("sidebar.context")} · ${profileLabel(profile)}` : t("sidebar.context")
  })

  const balanceFg = createMemo(() => {
    const color = balanceColorOf(balance())
    return color ? theme()[color] : theme().textMuted
  })

  const balanceLabel = createMemo(() => {
    const info = providerInfo()
    if (!info) return "Balance"
    const desc = findBalanceDescriptor(info.providerID, info.providerID)
    return `Balance (${desc?.label ?? info.name})`
  })

  // Peak info — пересчитывается каждую минуту (createMemo не работает, т.к. new Date() не реактивен)
  const [peakClock, setPeakClock] = createSignal(Date.now())
  onMount(() => {
    const interval = setInterval(() => setPeakClock(Date.now()), 60_000)
    onCleanup(() => clearInterval(interval))
  })
  const peakInfo = createMemo(() => {
    const info = providerInfo()
    if (!info) return null
    if (info.providerID !== "deepseek" && !info.name.toLowerCase().includes("deepseek")) return null
    peakClock() // depends on clock signal to re-evaluate
    return getPeakPricing()
  })

  const refresh = () => {
    clearBalanceCache()
    refetch()
  }

  return (
    <box>
      <Show when={providerInfo()}>
        <text fg={theme().text}>
          <b>{balanceLabel()}</b>
        </text>
        <box flexDirection="row" gap={1}>
          <text fg={balanceFg()}>{balanceAmount(balance()) === undefined ? "—" : money.format(balanceAmount(balance())!)}</text>
          <Show when={peakInfo()}>
            <text fg={peakInfo()!.isPeak ? brand : theme().success}>
              ({peakInfo()!.label})
            </text>
          </Show>
          <text fg={theme().textMuted} onMouseDown={refresh}>
            ⟳
          </text>
        </box>
      </Show>
      <text fg={theme().text}>
        <b>{contextHeader()}</b>
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
