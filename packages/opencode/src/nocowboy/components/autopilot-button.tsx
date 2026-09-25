import { useTheme } from "@tui/context/theme"
import { useToast } from "@tui/ui/toast"
import { useRoute } from "@tui/context/route"
import { useSDK } from "@tui/context/sdk"
import { useSync } from "@tui/context/sync"
import { useLocal } from "@tui/context/local"
import { createAutopilotSessionFromLocal, launchAutopilot } from "@/nocowboy/cli/cmd/tui/component/autopilot-row"

/**
 * Autopilot toggle, styled like the YOLO badge. It reflects the LIVE goal state
 * of the current session (pushed by the server's "session.goal" event), not a
 * client-side guess: ON while an auto goal is active, OFF otherwise.
 *
 * Clicking ON starts a run: on an existing session directly, and on the home
 * screen by creating the session first — no scope dialog. Clicking OFF clears
 * the goal. A custom scope stays available via `/autopilot <scope>`.
 */
export function AutopilotButton() {
  const { theme } = useTheme()
  const toast = useToast()
  const route = useRoute()
  const sdk = useSDK()
  const sync = useSync()
  const local = useLocal()

  const sessionID = () => (route.data.type === "session" ? route.data.sessionID : undefined)
  const goal = () => {
    const id = sessionID()
    return id ? sync.data.goal[id] : undefined
  }
  const active = () => goal()?.auto === true

  const toggle = async () => {
    const id = sessionID()
    if (active() && id) {
      // The server clears the goal and publishes the "session.goal" event, which
      // turns the badge off.
      void sdk.client.session.command({ sessionID: id, command: "autopilot", arguments: "clear" })
      return
    }
    await launchAutopilot({
      sdk,
      toast,
      sessionID: id,
      createSession: () =>
        createAutopilotSessionFromLocal({
          sdk,
          toast,
          currentAgent: () => local.agent.current(),
          currentModel: () => local.model.current(),
          currentVariant: () => local.model.variant.current(),
          navigate: (sessionID) => route.navigate({ type: "session", sessionID }),
        }),
    })
  }

  const fg = () => (active() ? theme.accent : theme.textMuted)

  return (
    <text fg={fg()} paddingLeft={1} paddingRight={1} onMouseUp={() => void toggle()}>
      {active() ? "[AUTOPILOT ON]" : "[AUTOPILOT]"}
    </text>
  )
}
