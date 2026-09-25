/**
 * Autopilot UI entry — a one-click toggle that launches an unattended roadmap
 * run, plus the shared launcher used by the command palette.
 *
 * The slash command `/autopilot` already exists server-side; this makes the
 * feature one click: pressing [AUTOPILOT] starts the run on the current session,
 * or creates the session first when the user is on the home screen. There is no
 * scope dialog — a custom scope stays available through the `/autopilot <scope>`
 * slash command.
 */
import { TextAttributes } from "@opentui/core"
import { useSDK } from "@tui/context/sdk"
import { useRoute } from "@tui/context/route"
import { useToast } from "@tui/ui/toast"
import { useTheme } from "@tui/context/theme"
import type { KiloClient } from "@nocowboy/sdk/v2"

type Toast = ReturnType<typeof useToast>

/**
 * Create a session for an autopilot run started from the home screen, reusing
 * the agent/model the user has selected. Returns the new session id, or
 * undefined (with a toast) when creation fails.
 */
export async function ensureAutopilotSession(input: {
  sdk: { client: KiloClient }
  toast: Toast
  agent: string
  model: { providerID: string; modelID: string; variant?: string }
}): Promise<string | undefined> {
  try {
    const res = await input.sdk.client.session.create({
      agent: input.agent,
      model: {
        providerID: input.model.providerID,
        id: input.model.modelID,
        variant: input.model.variant,
      },
    })
    if (res.error || !res.data) {
      input.toast.show({ message: "Creating a session failed", variant: "error" })
      return undefined
    }
    return res.data.id
  } catch (error: any) {
    input.toast.show({ message: `Autopilot error: ${error?.message ?? error}`, variant: "error" })
    return undefined
  }
}

/**
 * Create + navigate to a session for an autopilot run started from the home
 * screen. Shared by the [AUTOPILOT] badge and the command palette so both launch
 * paths resolve the agent/model and navigate identically (they must not drift).
 */
export async function createAutopilotSessionFromLocal(input: {
  sdk: { client: KiloClient }
  toast: Toast
  currentAgent: () => { name: string } | undefined
  currentModel: () => { providerID: string; modelID: string } | undefined
  currentVariant: () => string | undefined
  navigate: (sessionID: string) => void
}): Promise<string | undefined> {
  const agent = input.currentAgent()
  const model = input.currentModel()
  if (!agent || !model) {
    input.toast.show({ message: "Pick an agent and model first", variant: "error" })
    return undefined
  }
  const created = await ensureAutopilotSession({
    sdk: input.sdk,
    toast: input.toast,
    agent: agent.name,
    model: { providerID: model.providerID, modelID: model.modelID, variant: input.currentVariant() },
  })
  if (created) input.navigate(created)
  return created
}

/**
 * Start (or keep) the autopilot run on a session. When `sessionID` is absent,
 * `createSession` creates one and returns its id — this is what lets the button
 * work in a brand-new chat instead of demanding an existing session.
 */
export async function launchAutopilot(input: {
  sdk: { client: KiloClient }
  toast: Toast
  sessionID?: string
  createSession: () => Promise<string | undefined>
}) {
  const id = input.sessionID ?? (await input.createSession())
  if (!id) return

  try {
    const result = await input.sdk.client.session.command({
      sessionID: id,
      command: "autopilot",
      arguments: "",
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
  const sdk = useSDK()
  const route = useRoute()
  const toast = useToast()

  const sessionID = () => (route.data.type === "session" ? route.data.sessionID : undefined)

  return (
    <box paddingTop={1}>
      <text attributes={TextAttributes.BOLD} fg={theme.text}>
        Autopilot
      </text>
      <text
        fg={theme.textMuted}
        onMouseDown={() =>
          void launchAutopilot({
            sdk,
            toast,
            sessionID: sessionID(),
            createSession: async () => {
              toast.show({ message: "Open a session first to start autopilot", variant: "error" })
              return undefined
            },
          })
        }
      >
        Start an unattended roadmap run →
      </text>
    </box>
  )
}
