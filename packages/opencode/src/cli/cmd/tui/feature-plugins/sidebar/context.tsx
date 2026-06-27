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

function providerBalanceURL(baseURL: unknown, defaultHost: string, defaultPath: string): string {
  if (typeof baseURL === "string" && baseURL.trim().length > 0) {
    const base = baseURL.replace(/\/+$/, "")
    return `${base}${defaultPath}`
  }
  return `${defaultHost}${defaultPath}`
}

import { appendFileSync } from "node:fs"
const BLOG = "/tmp/nocowboy-balance.log"

async function fetchDeepSeekBalance(key: string, baseURL?: unknown): Promise<number> {
  try {
    const url = providerBalanceURL(baseURL, "https://api.deepseek.com", "/user/balance")
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
      tls: { rejectUnauthorized: false },
    } as any)
    if (!res.ok) { appendFileSync(BLOG, `${new Date().toISOString()} DEEPSEEK status=${res.status}\n`); return 0 }
    const raw = await res.text()
    appendFileSync(BLOG, `${new Date().toISOString()} DEEPSEEK raw=${raw.substring(0, 500)}\n`)
    const data = JSON.parse(raw) as { balance_infos?: Array<{ currency: string; total_balance: string }> }
    const usd = (data.balance_infos ?? []).find((b) => b.currency === "USD")
    return usd ? parseFloat(usd.total_balance) : 0
  } catch (e: any) {
    appendFileSync(BLOG, `${new Date().toISOString()} DEEPSEEK err=${e?.message}\n`)
    return 0
  }
}

async function fetchKimiBalance(key: string, baseURL?: unknown): Promise<number> {
  try {
    const url = providerBalanceURL(baseURL, "https://api.moonshot.ai", "/v1/users/me/balance")
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
      tls: { rejectUnauthorized: false },
    } as any)
    if (!res.ok) { appendFileSync(BLOG, `${new Date().toISOString()} KIMI status=${res.status}\n`); return 0 }
    const raw = await res.text()
    appendFileSync(BLOG, `${new Date().toISOString()} KIMI raw=${raw.substring(0, 500)}\n`)
    const data = JSON.parse(raw) as { data?: { available_balance?: number } }
    return data.data?.available_balance ?? 0
  } catch (e: any) {
    appendFileSync(BLOG, `${new Date().toISOString()} KIMI err=${e?.message}\n`)
    return 0
  }
}

function parseBalanceResponse(data: Record<string, unknown>): number {
  // unused — kept for DeepSeek compatibility
  return 0
}

function isBalanceProvider(pid: string): boolean {
  return pid === "deepseek" || pid === "kimi" || pid === "moonshotai" || pid === "moonshotai-cn"
}

function isKimiModelID(mid: string): boolean {
  const lower = mid.toLowerCase()
  return lower.includes("kimi") || lower.includes("moonshot") || lower.includes("k2p")
}

function findProviderByKind(providers: Provider[], kind: "deepseek" | "kimi"): { id: string; key: string; name: string; baseURL?: unknown } | null {
  for (const p of providers) {
    if (!p.key) continue
    const lower = (p.id + p.name).toLowerCase()
    if (kind === "deepseek" && lower.includes("deepseek")) {
      return { id: p.id, key: p.key, name: p.name, baseURL: p.options?.baseURL }
    }
    if (kind === "kimi" && (lower.includes("kimi") || lower.includes("moonshot"))) {
      return { id: p.id, key: p.key, name: p.name, baseURL: p.options?.baseURL }
    }
  }
  return null
}

function balanceLabels(): Record<string, string> {
  return {
    deepseek: "DeepSeek",
    kimi: "Kimi",
    moonshotai: "Moonshot AI",
    "moonshotai-cn": "Moonshot AI",
  }
}

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const sync = useSync()
  const local = useLocal()
  const msg = createMemo(() => props.api.state.session.messages(props.session_id))

  const providerInfo = createMemo(() => {
    const cur = local.model.current()
    if (!cur) return null
    const pid = cur.providerID
    const mid = cur.modelID

    // Direct match: current provider IS a known balance provider
    if (isBalanceProvider(pid)) {
      for (const p of sync.data.provider as Provider[]) {
        if (p.id === pid && p.key) {
          return { id: p.id, key: p.key, name: p.name, baseURL: p.options?.baseURL ?? p.options?.baseUrl }
        }
      }
    }

    // Model-based match: model name contains kimi/moonshot → find the actual provider
    if (isKimiModelID(mid)) {
      const found = findProviderByKind(sync.data.provider as Provider[], "kimi")
      if (found) return found
    }

    // Model-based match: model name contains deepseek → find the actual provider
    if (mid.toLowerCase().includes("deepseek")) {
      const found = findProviderByKind(sync.data.provider as Provider[], "deepseek")
      if (found) return found
    }

    return null
  })

  const [balance] = createResource(
    () => {
      const info = providerInfo()
      if (!info) return null
      appendFileSync(BLOG, `${new Date().toISOString()} PROVIDER matched=${info.id} name=${info.name} baseURL=${info.baseURL ?? "none"}\n`)
      return { key: info.key, version: msg().length, info }
    },
    (input) => {
      if (input.info.id === "deepseek") return fetchDeepSeekBalance(input.key, input.info.baseURL)
      return fetchKimiBalance(input.key, input.info.baseURL)
    },
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

  const balanceLabel = createMemo(() => {
    const info = providerInfo()
    if (!info) return "Balance"
    const labels = balanceLabels()
    return `Balance (${labels[info.id] ?? info.name})`
  })

  return (
    <box>
      <Show when={providerInfo()}>
        <text fg={theme().text}>
          <b>{balanceLabel()}</b>
        </text>
        <text fg={balanceFg()}>{money.format(balance() ?? 0)}</text>
      </Show>
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
