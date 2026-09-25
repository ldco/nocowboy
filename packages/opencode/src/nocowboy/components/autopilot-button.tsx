import { createEffect, createSignal, on } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useToast } from "@tui/ui/toast"
import { useRoute } from "@tui/context/route"
import { useSDK } from "@tui/context/sdk"
import { useSync } from "@tui/context/sync"
import { useLocal } from "@tui/context/local"
import { createAutopilotSessionFromLocal, launchAutopilot } from "@/nocowboy/cli/cmd/tui/component/autopilot-row"
import { runLabel } from "@/nocowboy/components/run-label"

/**
 * Autopilot toggle and live run indicator, styled like the YOLO badge. It
 * reflects the LIVE goal state of the current session (pushed by the server's
 * "session.goal" event), not a client-side guess: ON while autopilot is armed,
 * OFF otherwise. It also names the running target and the step the run is on
 * (see `runLabel`), so a roadmap run is never mistaken for a normal turn.
 *
 * Autopilot is the *mode*, not a target: this badge only turns unattended
 * continuation on or off for the goal the session already has. Clicking OFF
 * pauses (the goal is kept, so a click is never destructive and never restarts
 * a run); clicking ON arms it. To start "finish the roadmap" use the sidebar
 * row / command palette, or the [FINISH ROADMAP] badge on the home screen.
 * A custom scope stays available via `/autopilot <scope>`.
 */
export function AutopilotButton() {
  const { theme } = useTheme()
  const toast = useToast()
  const route = useRoute()
  const sdk = useSDK()
  const sync = useSync()

  const sessionID = () => (route.data.type === "session" ? route.data.sessionID : undefined)
  const goal = () => {
    const id = sessionID()
    return id ? sync.data.goal[id] : undefined
  }
  const active = () => goal()?.auto === true

  // Guard against a click that lands here right after a navigation: the subagent
  // footer's "Parent" button sits in the same screen region as this badge, and
  // the mouse-up that navigates can be re-dispatched onto the newly mounted
  // badge, silently toggling the run off. Ignore clicks for a short window after
  // the route changes.
  const [navAt, setNavAt] = createSignal(0)
  createEffect(on(() => route.data, () => setNavAt(Date.now()), { defer: true }))

  const toggle = async () => {
    if (Date.now() - navAt() < 250) return
    const id = sessionID()
    if (!id) return
    if (!active() && !goal()) {
      toast.show({
        message: "No goal to autopilot — /goal <condition>, or start /roadmap",
        variant: "error",
      })
      return
    }
    const wasActive = active()
    const result = await sdk.client.session.command({
      sessionID: id,
      command: "autopilot",
      // Use the same server-side transition as the command palette, so the two
      // toggle paths cannot drift apart; the toast still reports the intent we
      // captured (see below).
      arguments: "toggle",
    })
    if (result.error) {
      toast.show({ message: `Autopilot failed: ${result.error.data?.message ?? "unknown error"}`, variant: "error" })
      return
    }
    // Report the intent, captured before the await: the server pushes the new
    // goal state, so `active()` has already flipped by the time we get here.
    toast.show({
      message: wasActive ? "Autopilot paused — goal kept" : "Autopilot armed",
      variant: "success",
    })
  }

  const fg = () => (active() ? theme.accent : theme.textMuted)

  return (
    <text fg={fg()} paddingLeft={1} paddingRight={1} onMouseUp={() => void toggle()}>
      {runLabel(goal())}
    </text>
  )
}

/**
 * One-click "finish the roadmap" launcher, used on the home screen where there
 * is no session (and therefore no goal) to arm. It names the target honestly:
 * this is the action that starts the whole-roadmap run, not the autopilot mode
 * toggle. From a new chat it creates the session first, then navigates to it.
 */
export function RoadmapButton() {
  const { theme } = useTheme()
  const toast = useToast()
  const route = useRoute()
  const sdk = useSDK()
  const local = useLocal()

  const launch = () =>
    launchAutopilot({
      sdk,
      toast,
      command: "roadmap",
      sessionID: route.data.type === "session" ? route.data.sessionID : undefined,
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

  return (
    <text fg={theme.accent} paddingLeft={1} paddingRight={1} onMouseUp={() => void launch()}>
      [FINISH ROADMAP ▶]
    </text>
  )
}
