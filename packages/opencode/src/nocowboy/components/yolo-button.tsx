import { createMemo } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useSDK } from "@tui/context/sdk"
import { useSync } from "@tui/context/sync"
import { useToast } from "@tui/ui/toast"
import { isAllowEverythingConfig } from "@/nocowboy/permission/allow-everything-config"

export function YoloButton() {
  const { theme } = useTheme()
  const sdk = useSDK()
  const sync = useSync()
  const toast = useToast()

  // The synced config is the source of truth, so the button reflects YOLO
  // enabled from another session, the command palette or a previous run —
  // not just a click on this instance.
  const active = createMemo(() => isAllowEverythingConfig(sync.data.config.permission))

  const toggle = async () => {
    const next = !active()
    try {
      const result = await sdk.client.permission.allowEverything({ enable: next })
      if (result.error) throw result.error
      toast.show({
        variant: next ? "warning" : "info",
        message: next
          ? "YOLO mode on — all permission prompts are suppressed"
          : "YOLO mode off — permission prompts restored",
      })
    } catch {
      toast.show({
        variant: "error",
        message: `Failed to ${next ? "enable" : "disable"} YOLO mode`,
      })
    }
  }

  const fg = () => (active() ? theme.accent : theme.textMuted)

  return (
    <text
      fg={fg()}
      paddingLeft={1}
      paddingRight={1}
      onMouseUp={() => toggle()}
    >
      {active() ? "[YOLO ON]" : "[YOLO]"}
    </text>
  )
}
