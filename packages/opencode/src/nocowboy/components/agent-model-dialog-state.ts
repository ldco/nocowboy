/**
 * Pure data logic for the per-agent model dialog (DialogAgentModel).
 *
 * Kept apart from the SolidJS component so the option building, the
 * current-model detection and — most importantly — the config patch shape can
 * be tested without a renderer.
 */

export type AgentModelRef = { providerID: string; modelID: string }

export type AgentLike = {
  name: string
  displayName?: string
  model?: AgentModelRef
}

export type ProviderLike = {
  id: string
  name: string
  models?: Record<string, { name?: string; status?: string }>
}

export type AgentModelOption = { providerID: string; modelID: string; label: string }

/** Internal agents are not routable work profiles — never offer them. */
export const INTERNAL_AGENTS = ["compaction", "title", "summary", "router"] as const

export function listAssignableModels(providers: readonly ProviderLike[]): AgentModelOption[] {
  const result: AgentModelOption[] = []
  for (const provider of providers ?? []) {
    if (!provider.models) continue
    for (const [modelID, info] of Object.entries(provider.models)) {
      if (info.status === "deprecated") continue
      result.push({ providerID: provider.id, modelID, label: `${info.name ?? modelID} (${provider.name})` })
    }
  }
  return result.sort((a, b) => a.label.localeCompare(b.label))
}

export function listAssignableAgents(agents: readonly AgentLike[]): AgentLike[] {
  return (agents ?? []).filter((a) => !(INTERNAL_AGENTS as readonly string[]).includes(a.name))
}

export function currentAgentModel(agent: AgentLike | undefined): AgentModelRef | undefined {
  const model = agent?.model
  if (!model?.providerID || !model?.modelID) return undefined
  return model
}

export function isCurrentAgentModel(agent: AgentLike | undefined, model: AgentModelOption): boolean {
  const cur = currentAgentModel(agent)
  return cur?.modelID === model.modelID && cur?.providerID === model.providerID
}

/**
 * Config patch for assigning a model to an agent.
 *
 * Two invariants live here and nowhere else:
 *  - `agent.<name>.model` is a `provider/model` STRING (ConfigModelID), not an object;
 *  - the overlay payload is a NESTED object — dotted keys are not expanded.
 */
export function agentModelPatch(agentName: string, model: AgentModelRef): Record<string, unknown> {
  return { agent: { [agentName]: { model: `${model.providerID}/${model.modelID}` } } }
}
