import { createMemo, createSignal } from "solid-js"
import { useLocal } from "@tui/context/local"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"

type AgentInfo = { name: string; displayName?: string; description?: string; native?: boolean }

interface AgentModelConfig {
  providerID: string
  modelID: string
}

const MODEL_OPTIONS: { label: string; value: AgentModelConfig }[] = [
  { label: "Flash (DeepSeek) — дёшево, для простых задач", value: { providerID: "deepseek", modelID: "deepseek-v4-flash" } },
  { label: "Pro (DeepSeek) — качественно, для планирования", value: { providerID: "deepseek", modelID: "deepseek-v4-pro" } },
  { label: "Kimi K2 (Moonshot) — другая модель для кросс-ревью", value: { providerID: "opencode", modelID: "kimi-k2-thinking" } },
  { label: "Default — системная модель по умолчанию", value: { providerID: "", modelID: "default" } },
]

export function DialogAgentModel() {
  const local = useLocal()
  const dialog = useDialog()
  dialog.setSize("large")

  // Track current selections per agent
  const [selections, setSelections] = createSignal<Record<string, string>>({})

  const agents = createMemo(() => local.agent.list().filter((a: AgentInfo) => a.name !== "compaction" && a.name !== "title" && a.name !== "summary" && !a.name.startsWith("_") && !a.native === undefined))

  const options = createMemo(() => {
    const list = agents()
    const result: any[] = []

    for (const agent of list) {
      const currentModel = selections()[agent.name] ?? getCurrentModel(agent.name)
      
      result.push({
        category: "Choose a model for " + (agent.displayName ?? agent.name),
        value: { agentName: agent.name },
        title: agent.description ?? "",
        disabled: true,
      })

      for (const model of MODEL_OPTIONS) {
        result.push({
          value: { agentName: agent.name, ...model.value },
          title: model.label,
          indent: 1,
          onSelect: () => setModel(agent.name, model.value),
        })
      }
    }
    return result
  })

  function getCurrentModel(agentName: string): string {
    const agents = local.agent.list() as AgentInfo[]
    const agent = agents.find((a: AgentInfo) => a.name === agentName)
    if (!agent) return "default"
    // Read current model from agent config - simplified
    return "default"
  }

  function setModel(agentName: string, model: AgentModelConfig) {
    // Save model selection
    setSelections((prev) => ({ ...prev, [agentName]: model.modelID }))
    // TODO: save to config
    // local.agent.setModel?.(agentName, model)
  }

  return (
    <DialogSelect
      title="Agent Model Settings"
      placeholder="Select agent to configure..."
      options={options()}
    />
  )
}
