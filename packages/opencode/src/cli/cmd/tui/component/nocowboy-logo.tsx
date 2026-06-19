// nocowboy_change new file
import { useTheme } from "@tui/context/theme"

export function Logo() {
  const { theme } = useTheme()

  return (
    <box gap={1} paddingLeft={2}>
      <text fg={theme.highlight} bold>
        NoCowboy
      </text>
    </box>
  )
}
