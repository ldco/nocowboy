import { useTheme } from "@tui/context/theme"
import { useToast } from "@tui/ui/toast"
import { useRoute } from "@tui/context/route"
import { useSDK } from "@tui/context/sdk"
import { useSync } from "@tui/context/sync"
import { useDialog } from "@tui/ui/dialog"
import { launchAutopilot } from "@/nocowboy/cli/cmd/tui/component/autopilot-row"

/**
 * Autopilot toggle, styled like the YOLO badge. It reflects the LIVE goal state
 * of the current session (pushed by the server's "session.goal" event), not a
 * client-side guess: ON while an auto goal is active, OFF otherwise. Clicking ON
 * starts a run (scope dialog); clicking OFF clears the goal.
 */
export function AutopilotButton() {
  const { theme } = useTheme()
  const toast = useToast()
  const route = useRoute()
  const sdk = useSDK()
  const sync = useSync()
  const dialog = useDialog()

  const sessionID = () => (route.data.type === "session" ? route.data.sessionID : undefined)
  const goal = () => {
    const id = sessionID()
    return id ? sync.data.goal[id] : undefined
  }
  const active = () => goal()?.auto === true

  const toggle = () => {
    const id = sessionID()
    if (!id) {
      toast.show({ message: "Open a session first to use autopilot", variant: "error" })
      return
    }
    if (active()) {
      // The server clears the goal and publishes the "session.goal" event, which
      // turns the badge off.
      void sdk.client.session.command({ sessionID: id, command: "autopilot", arguments: "clear" })
      return
    }
    void launchAutopilot({ dialog, sdk, toast, sessionID: id })
  }

  const fg = () => (active() ? theme.accent : theme.textMuted)

  return (
    <text fg={fg()} paddingLeft={1} paddingRight={1} onMouseUp={() => toggle()}>
      {active() ? "[AUTOPILOT ON]" : "[AUTOPILOT]"}
    </text>
  )
}
