// nocowboy_change — detailed balance popup dialog
import { Show } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useDialog } from "@tui/ui/dialog"
import { RGBA } from "@opentui/core"
import { getBalanceColor, clearBalanceCache, type PeakPricingInfo } from "@/nocowboy/provider-balance"

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

type StatusLabel = { label: string; color: "success" | "warning" | "error" }

function statusLabel(balance: number): StatusLabel {
  const c = getBalanceColor(balance)
  const labels: Record<string, string> = {
    success: "Достаточно",
    warning: "Мало",
    error: "Критически",
  }
  return { label: labels[c], color: c }
}

interface BalancePopupProps {
  balance: number
  providerLabel: string
  providerID: string
  peak?: PeakPricingInfo
}

/**
 * Dialog showing detailed provider balance information.
 *
 * - Provider name
 * - Current balance with color and status text
 * - Last refreshed timestamp
 * - Refresh button
 */
export function BalancePopup(props: BalancePopupProps) {
  const { theme } = useTheme()
  const dialog = useDialog()

  const status = () => statusLabel(props.balance)
  const brandColor = RGBA.fromInts(0xff, 0x68, 0x00)

  const close = () => dialog.clear()

  const refresh = () => {
    clearBalanceCache()
    close()
    // The parent BalanceIndicator will re-fetch because the cache was cleared
  }

  return (
    <box flexDirection="column" padding={1} gap={1}>
      {/* Title */}
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.text}>
          <b>Баланс провайдера</b>
        </text>
        <text fg={theme.textMuted} onMouseDown={close}>
          ✕
        </text>
      </box>

      {/* Provider */}
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.textMuted}>Провайдер</text>
        <text fg={theme.text}>{props.providerLabel}</text>
      </box>

      {/* Balance */}
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.textMuted}>Текущий баланс</text>
        <text fg={theme[status().color]}>
          {money.format(props.balance)}
        </text>
      </box>

      {/* Status */}
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.textMuted}>Статус</text>
        <text fg={theme[status().color]}>
          <Show when={status().color === "success"}>🟢 </Show>
          <Show when={status().color === "warning"}>🟡 </Show>
          <Show when={status().color === "error"}>🔴 </Show>
          {status().label}
        </text>
      </box>

      {/* Peak pricing (DeepSeek only) */}
      <Show when={props.peak}>
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme.textMuted}>Тариф</text>
          <text fg={props.peak!.isPeak ? brandColor : theme.success}>
            {props.peak!.isPeak ? "Повышенный (×2)" : "Обычный"}
          </text>
        </box>
      </Show>

      {/* Actions */}
      <box flexDirection="row" gap={1} paddingTop={1}>
        <text
          fg={theme.accent}
          onMouseDown={refresh}
        >
          ⟳ Обновить
        </text>
        <text
          fg={theme.textMuted}
          onMouseDown={close}
        >
          Закрыть
        </text>
      </box>
    </box>
  )
}
