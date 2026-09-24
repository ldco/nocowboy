/**
 * Autopilot UI entry — a clickable button that launches an unattended roadmap
 * run, plus the shared launcher used by the command palette.
 *
 * The slash command `/autopilot` already exists server-side; this makes the
 * feature discoverable as a button: sidebar Settings → "Autopilot" (one click →
 * scope dialog → run) and a palette entry (Ctrl+P → Autopilot).
 */
import { TextAttributes } from "@opentui/core"
import { useDialog } from "@tui/ui/dialog"
import { useSDK } from "@tui/context/sdk"
import { useRoute } from "@tui/context/route"
import { useToast } from "@tui/ui/toast"
import { useTheme } from "@tui/context/theme"
import { DialogPrompt } from "@tui/ui/dialog-prompt"
import type { KiloClient } from "@nocowboy/sdk/v2"

type Toast = ReturnType<typeof useToast>

/**
 * Ask for an optional scope, then start the autopilot run on the active session.
 * Shared by the sidebar button and the command-palette entry.
 */
export async function launchAutopilot(input: {
  dialog: ReturnType<typeof useDialog>
  sdk: { client: KiloClient }
  toast: Toast
  sessionID: string | undefined
  title?: string
}) {
  if (!input.sessionID) {
    input.toast.show({ message: "Open a session first to start autopilot", variant: "error" })
    return
  }

  const scope = await DialogPrompt.show(input.dialog, input.title ?? "Autopilot — scope", {
    description: () => (
      <text>
        Run the roadmap unattended: worker → reviewer gate → next, no human "continue". Leave empty
        for the default scope, or add --max-turns N to bound the run.
      </text>
    ),
    placeholder: "optional scope, e.g. docs cleanup   (Enter = start)",
  })
  if (scope === null) return // cancelled

  try {
    const result = await input.sdk.client.session.command({
      sessionID: input.sessionID,
      command: "autopilot",
      arguments: scope,
    })
    if (result.error) {
      input.toast.show({
        message: `Autopilot failed: ${result.error.data?.message ?? "unknown error"}`,
        variant: "error",
      })
      return
    }
    input.toast.show({ message: "Autopilot started", variant: "success" })
  } catch (error: any) {
    input.toast.show({ message: `Autopilot error: ${error?.message ?? error}`, variant: "error" })
  }
}

/** Sidebar row: click to start an autopilot run on the current session. */
export function AutopilotRow() {
  const { theme } = useTheme()
  const dialog = useDialog()
  const sdk = useSDK()
  const route = useRoute()
  const toast = useToast()

  const sessionID = () => (route.data.type === "session" ? route.data.sessionID : undefined)

  return (
    <box paddingTop={1}>
      <text attributes={TextAttributes.BOLD} fg={theme.text}>
        Autopilot
      </text>
      <text fg={theme.textMuted} onMouseDown={() => void launchAutopilot({ dialog, sdk, toast, sessionID: sessionID() })}>
        Start an unattended roadmap run →
      </text>
    </box>
  )
}
