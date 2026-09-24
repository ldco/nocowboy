import { useTheme } from "@tui/context/theme"
import { useOpencodeKeymap } from "@tui/keymap"
import { icons } from "@/nocowboy/icons"

/**
 * Mouse affordance for the `prompt.attach` command, which opens a file picker
 * and attaches the chosen image or text file to the prompt. Rendered as a
 * compact monochrome paperclip icon.
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
      {icons.attach}
    </text>
  )
}
