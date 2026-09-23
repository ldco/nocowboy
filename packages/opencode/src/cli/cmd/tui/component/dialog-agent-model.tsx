import { createMemo } from "solid-js"
import { reconcile } from "solid-js/store"
import { useLocal } from "@tui/context/local"
import { useSync } from "@tui/context/sync"
import { useSDK } from "@tui/context/sdk"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"
import { useToast } from "@tui/ui/toast"
import { t } from "@tui/context/i18n"
import {
  agentModelPatch,
  currentAgentModel,
  isCurrentAgentModel,
  listAssignableAgents,
  listAssignableModels,
  type AgentLike,
  type ProviderLike,
} from "@/nocowboy/components/agent-model-dialog-state"

export function DialogAgentModel() {
  const local = useLocal()
  const sync = useSync()
  const sdk = useSDK()
  const dialog = useDialog()
  const toast = useToast()
  dialog.setSize("xlarge")

  const allModels = createMemo(() => listAssignableModels((sync.data.provider ?? []) as unknown as ProviderLike[]))

  const agents = createMemo(() => listAssignableAgents((local.agent.list() ?? []) as unknown as AgentLike[]))

  const options = createMemo(() => {
    const models = allModels()
    const result: any[] = []

    for (const agent of agents()) {
      const name = agent.displayName ?? agent.name
      const cur = currentAgentModel(agent)
      const current = cur ? `${cur.modelID} (${cur.providerID})` : t("model.agentNotConfigured")

      result.push({
        title: `⚙ ${name}  —  ${current}`,
        value: { agentName: agent.name, kind: "header" },
        disabled: true,
      })

      for (const model of models) {
        const isCurrent = isCurrentAgentModel(agent, model)
        result.push({
          value: { agentName: agent.name, providerID: model.providerID, modelID: model.modelID },
          title: isCurrent ? `✓ ${model.label}` : model.label,
          description: t("model.agentAssignHint", { agent: name }),
          onSelect: async () => {
            const response = await sdk.client.config.overlayUpdate({
              scope: "global",
              set: agentModelPatch(agent.name, { providerID: model.providerID, modelID: model.modelID }),
              unset: undefined,
            })
            if (response.error) {
              toast.show({ message: t("model.agentAssignFailed", { agent: name }), variant: "error" })
              return
            }
            const [configResponse, globalResponse] = await Promise.all([
              sdk.client.config.get({}),
              sdk.client.global.config.get({}),
            ])
            if (configResponse.data) sync.set("config", reconcile(configResponse.data))
            if (globalResponse.data) sync.set("globalConfig", reconcile(globalResponse.data))
            toast.show({
              message: t("model.agentAssigned", { agent: name, model: model.modelID }),
              variant: "success",
            })
            dialog.clear()
          },
        })
      }
    }
    return result
  })

  return <DialogSelect title={t("model.agentTitle")} options={options()} />
}
