import { useTheme } from "@tui/context/theme"
import { useOpencodeKeymap } from "@tui/keymap"
import { icons } from "@/nocowboy/icons"

/**
 * Mouse affordance for the `prompt.paste` command. The command already reads the
 * system clipboard (image or text) and routes it through the same code path as
 * the keyboard shortcut, so the button is a thin dispatcher. Rendered as a
 * compact monochrome clipboard icon.
 */
export function PasteButton() {
  const { theme } = useTheme()
  const keymap = useOpencodeKeymap()

  const paste = () => {
    void keymap.dispatchCommand("prompt.paste")
  }

  return (
    <text
      fg={theme.textMuted}
      paddingLeft={1}
      paddingRight={1}
      onMouseUp={() => paste()}
    >
      {icons.paste}
    </text>
  )
}
