import { createMemo } from "solid-js"
import { useLocal } from "@tui/context/local"
import { useSync } from "@tui/context/sync"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"

type AgentItem = { name: string; displayName?: string; description?: string; native?: boolean }

export function DialogAgentModel() {
  const local = useLocal()
  const sync = useSync()
  const dialog = useDialog()
  dialog.setSize("xlarge")

  // Build list of all available models from all providers
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

  // Get current model for an agent (read from agent definition config)
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
      // Header row — shows current model
      result.push({
        category: `⚙ ${name}  (${cur || "not configured"})`,
        value: { agentName: agent.name },
        title: "",
        disabled: true,
      })
      // Model options
      for (const model of models) {
        const selected = model.modelID === cur.split(" ")[0] // simple compare
        result.push({
          value: { agentName: agent.name, providerID: model.providerID, modelID: model.modelID },
          title: model.label,
          indent: 1,
          ...(selected ? { action: "(current)" } : {}),
          onSelect: async () => {
            dialog.clear()
          },
        })
      }
    }
    return result
  })

  return <DialogSelect title="Agent Models — click a model to assign" options={options()} />
}
