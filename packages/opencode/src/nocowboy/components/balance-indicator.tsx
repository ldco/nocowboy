// nocowboy_change — reusable balance indicator for TUI footers and prompt bar
import { createMemo, createResource, Show } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useSync } from "@tui/context/sync"
import { useLocal } from "@tui/context/local"
import { useDialog } from "@tui/ui/dialog"
import { RGBA } from "@opentui/core"
import type { Provider } from "@nocowboy/sdk/v2"
import {
  fetchBalance,
  findBalanceProvider,
  getBalanceColor,
  findBalanceDescriptor,
  getPeakPricing,
} from "@/nocowboy/provider-balance"
import { BalancePopup } from "./balance-popup"

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

interface BalanceIndicatorProps {
  /** When true, show the full "$X.XX" amount. When false, show only the dot. */
  showAmount?: boolean
}

/**
 * A small colored balance indicator: ● $X.XX
 *
 * - Color: green (success) if balance > $10, yellow (warning) if $3-10, red (error) if <$3
 * - During DeepSeek peak hours, shows "×2" tag in warning color
 * - Click to open a detailed balance popup
 */
export function BalanceIndicator(props: BalanceIndicatorProps) {
  const { theme } = useTheme()
  const sync = useSync()
  const local = useLocal()
  const dialog = useDialog()

  const currentModel = createMemo(() => local.model.current())

  const balanceProvider = createMemo(() => {
    const cur = currentModel()
    if (!cur) return null
    return findBalanceProvider(sync.data.provider as Provider[], cur.providerID, cur.modelID)
  })

  const [balanceData] = createResource(
    () => {
      const bp = balanceProvider()
      if (!bp) return null
      return { key: bp.apiKey, pid: bp.providerID, baseURL: bp.baseURL, version: currentModel()?.modelID }
    },
    (input) => fetchBalance(input.pid, input.key, input.baseURL),
  )

  const balance = createMemo(() => balanceData() ?? 0)

  const peakInfo = createMemo(() => {
    const bp = balanceProvider()
    if (!bp) return null
    // Only show peak indicator for DeepSeek
    if (bp.providerID !== "deepseek" && !bp.name.toLowerCase().includes("deepseek")) return null
    return getPeakPricing()
  })

  const brandColor = RGBA.fromInts(0xff, 0x68, 0x00)

  const color = createMemo(() => {
    // If peak pricing, use brand orange instead of yellow theme.warning
    if (peakInfo()?.isPeak) return brandColor
    const c = getBalanceColor(balance())
    return theme[c]
  })

  const descriptor = createMemo(() => {
    const cur = currentModel()
    if (!cur) return null
    return findBalanceDescriptor(cur.providerID, cur.modelID)
  })

  const handleClick = () => {
    const bp = balanceProvider()
    if (!bp) return
    dialog.replace(() => (
      <BalancePopup
        balance={balance()}
        providerLabel={descriptor()?.label ?? bp.providerID}
        providerID={bp.providerID}
        peak={peakInfo() ?? undefined}
      />
    ))
  }

  return (
    <Show when={balanceProvider()}>
      <text
        fg={color()}
        paddingLeft={1}
        paddingRight={props.showAmount !== false ? 1 : 0}
        onMouseUp={handleClick}
      >
        <span style={{ fg: color() }}>●</span>
        {peakInfo()?.isPeak ? <span style={{ fg: brandColor }}> ×2</span> : ""}
        {props.showAmount !== false ? ` ${money.format(balance())}` : ""}
      </text>
    </Show>
  )
}
