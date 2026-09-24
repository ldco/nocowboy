import { useTheme } from "@tui/context/theme"
import { useToast } from "@tui/ui/toast"
import { autopilotArmed, toggleAutopilot } from "@/nocowboy/cli/cmd/tui/context/autopilot-state"

/**
 * Autopilot toggle, styled like the YOLO badge. When ON, plain prompts in this
 * session are sent as autopilot runs: the harness sets an auto goal from your
 * message and keeps the session working (worker → reviewer gate → next) until
 * the goal is met or the turn budget is spent, with no human "continue".
 */
export function AutopilotButton() {
  const { theme } = useTheme()
  const toast = useToast()

  const toggle = () => {
    const next = toggleAutopilot()
    toast.show({
      variant: next ? "warning" : "info",
      message: next
        ? "Autopilot on — your message runs the roadmap unattended"
        : "Autopilot off — messages run normally",
    })
  }

  const fg = () => (autopilotArmed() ? theme.accent : theme.textMuted)

  return (
    <text fg={fg()} paddingLeft={1} paddingRight={1} onMouseUp={() => toggle()}>
      {autopilotArmed() ? "[AUTOPILOT ON]" : "[AUTOPILOT]"}
    </text>
  )
}
