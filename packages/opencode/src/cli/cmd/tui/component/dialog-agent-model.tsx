import { createMemo } from "solid-js"
import { useLocal } from "@tui/context/local"
import { useSync } from "@tui/context/sync"
import { useSDK } from "@tui/context/sdk"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"

type AgentItem = { name: string; displayName?: string; description?: string; native?: boolean }

export function DialogAgentModel() {
  const local = useLocal()
  const sync = useSync()
  const sdk = useSDK()
  const dialog = useDialog()
  dialog.setSize("xlarge")

  const allModels = createMemo(() => {
    const result: { providerID: string; modelID: string; label: string }[] = []
    for (const provider of sync.data.provider ?? []) {
      if (!provider.models) continue
      for (const [modelID, info] of Object.entries(provider.models) as [string, any][]) {
        if (info.status === "deprecated") continue
        const label = `${info.name ?? modelID} (${provider.name})`
        result.push({ providerID: provider.id, modelID, label })
      }
    }
    return result.sort((a, b) => a.label.localeCompare(b.label))
  })

  function currentModel(agentName: string): string {
    const agents = sync.data.agent ?? []
    const agent = agents.find((a: any) => a.name === agentName)
    if (!agent?.model) return ""
    return `${agent.model.modelID} (${agent.model.providerID})`
  }

  const options = createMemo(() => {
    const agents = (local.agent.list() as AgentItem[]).filter(
      (a) => !["compaction", "title", "summary", "router"].includes(a.name),
    )
    const models = allModels()
    const result: any[] = []

    for (const agent of agents) {
      const name = agent.displayName ?? agent.name
      const cur = currentModel(agent.name)
      result.push({
        category: `⚙ ${name}  (${cur || "not configured"})`,
        value: { agentName: agent.name },
        title: "",
        disabled: true,
      })
      for (const model of models) {
        const isCurrent = model.modelID === cur.split(" ")[0]
        result.push({
          value: { agentName: agent.name, providerID: model.providerID, modelID: model.modelID },
          title: model.label,
          indent: 1,
          ...(isCurrent ? { action: "(current)" } : {}),
          onSelect: async () => {
            // Save per-agent model to config via overlay endpoint
            try {
              await fetch("/config/overlay", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  scope: "project",
                  set: {
                    [`agents.${agent.name}.model.modelID`]: model.modelID,
                    [`agents.${agent.name}.model.providerID`]: model.providerID,
                  },
                }),
              })
            } catch {}
            dialog.clear()
          },
        })
      }
    }
    return result
  })

  return <DialogSelect title="Agent Models — click a model to assign" options={options()} />
}
