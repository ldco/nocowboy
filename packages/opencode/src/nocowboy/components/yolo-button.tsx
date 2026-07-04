import { createSignal } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useSDK } from "@tui/context/sdk"

export function YoloButton() {
  const { theme } = useTheme()
  const sdk = useSDK()
  const [active, setActive] = createSignal(false)

  const toggle = async () => {
    const next = !active()
    try {
      await sdk.client.permission.allowEverything({ enable: next })
      setActive(next)
    } catch {
      // silently fail
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
      [YOLO]
    </text>
  )
}
