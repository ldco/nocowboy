import { useTheme } from "@tui/context/theme"
import { useOpencodeKeymap } from "@tui/keymap"

/**
 * Mouse affordance for the `prompt.attach` command, which opens a file picker
 * and attaches the chosen image or text file to the prompt.
 */
export function AttachButton() {
  const { theme } = useTheme()
  const keymap = useOpencodeKeymap()

  const attach = () => {
    void keymap.dispatchCommand("prompt.attach")
  }

  return (
    <text
      fg={theme.textMuted}
      paddingLeft={1}
      paddingRight={1}
      onMouseUp={() => attach()}
    >
      [Attach]
    </text>
  )
}
