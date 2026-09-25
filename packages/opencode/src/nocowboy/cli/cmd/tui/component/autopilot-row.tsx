/**
 * Autopilot UI entry points.
 *
 * Autopilot is the *mode* (keep working with no human "continue"); the *target*
 * is a goal. "Finish the roadmap" is one target, started from the prompt-bar
 * [FINISH ROADMAP] button on the home screen or the command palette. The badge
 * that toggles the mode lives in `nocowboy/components/autopilot-button.tsx`; the
 * sidebar no longer carries a second roadmap button (it duplicated the home one
 * and overlapped the session title).
 */
import { useToast } from "@tui/ui/toast"
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
 * screen. Shared by the [FINISH ROADMAP] badge and the command palette so both
 * launch paths resolve the agent/model and navigate identically (they must not
 * drift).
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
 * Send a goal command to a session. When `sessionID` is absent, `createSession`
 * creates one and returns its id — this is what lets the home-screen launcher
 * work in a brand-new chat instead of demanding an existing session.
 *
 * `command` is `autopilot` (the mode: arm the active goal, or set a custom scope
 * when `arguments` is given) or `roadmap` (the target: finish docs/roadmap.json).
 */
export async function launchAutopilot(input: {
  sdk: { client: KiloClient }
  toast: Toast
  sessionID?: string
  createSession: () => Promise<string | undefined>
  command?: "autopilot" | "roadmap"
  arguments?: string
  /** Toast text on success; defaults from the command name. */
  successMessage?: string
}) {
  const id = input.sessionID ?? (await input.createSession())
  if (!id) return

  const command = input.command ?? "autopilot"
  try {
    const result = await input.sdk.client.session.command({
      sessionID: id,
      command,
      arguments: input.arguments ?? "",
    })
    if (result.error) {
      input.toast.show({
        message: `${command === "roadmap" ? "Roadmap" : "Autopilot"} failed: ${result.error.data?.message ?? "unknown error"}`,
        variant: "error",
      })
      return
    }
    input.toast.show({
      message:
        input.successMessage ?? (command === "roadmap" ? "Roadmap run started" : "Autopilot armed"),
      variant: "success",
    })
  } catch (error: any) {
    input.toast.show({ message: `Autopilot error: ${error?.message ?? error}`, variant: "error" })
  }
}
