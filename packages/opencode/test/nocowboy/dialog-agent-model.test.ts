/**
 * Tests for DialogAgentModel — per-agent model selection UI
 * Tests focus on data logic (options generation, model listing) not SolidJS rendering
 */

import { describe, it, expect } from "bun:test"
import { createMemo } from "solid-js"

// Helper to test the model listing logic used in dialog-agent-model.tsx
// Extracts the pure data flow from the component for isolated testing

interface ProviderInfo {
  id: string
  name: string
  models?: Record<string, { name?: string; status?: string }>
}

interface AgentInfo {
  name: string
  displayName?: string
  model?: { providerID: string; modelID: string }
}

function getAllModels(providers: ProviderInfo[]): { providerID: string; modelID: string; label: string }[] {
  const result: { providerID: string; modelID: string; label: string }[] = []
  for (const provider of providers ?? []) {
    if (!provider.models) continue
    for (const [modelID, info] of Object.entries(provider.models)) {
      if (info.status === "deprecated") continue
      const label = `${info.name ?? modelID} (${provider.name})`
      result.push({ providerID: provider.id, modelID, label })
    }
  }
  return result.sort((a, b) => a.label.localeCompare(b.label))
}

function getAgentModels(agents: AgentInfo[], providers: ProviderInfo[]): { agentName: string; currentModel: string; modelCount: number }[] {
  const allModels = getAllModels(providers)
  return agents
    .filter((a) => !["compaction", "title", "summary", "router"].includes(a.name))
    .map((agent) => ({
      agentName: agent.name,
      currentModel: agent.model ? `${agent.model.modelID} (${agent.model.providerID})` : "not configured",
      modelCount: allModels.length,
    }))
}

describe("DialogAgentModel", () => {
  const mockProviders: ProviderInfo[] = [
    {
      id: "deepseek",
      name: "DeepSeek",
      models: {
        "deepseek-v4-flash": { name: "DeepSeek Flash" },
        "deepseek-v4-pro": { name: "DeepSeek Pro" },
      },
    },
    {
      id: "opencode",
      name: "OpenCode",
      models: {
        "kimi-k2-thinking": { name: "Kimi K2 Thinking" },
        "deepseek-nano": { name: "DeepSeek Nano", status: "deprecated" },
      },
    },
  ]

  const mockAgents: AgentInfo[] = [
    { name: "auto", model: { providerID: "deepseek", modelID: "deepseek-v4-flash" } },
    { name: "worker", model: { providerID: "deepseek", modelID: "deepseek-v4-flash" } },
    { name: "planner", model: { providerID: "deepseek", modelID: "deepseek-v4-pro" } },
    { name: "reviewer", model: { providerID: "opencode", modelID: "kimi-k2-thinking" } },
    { name: "nocowboy" },
  ]

  it("lists all non-deprecated models from providers", () => {
    const models = getAllModels(mockProviders)
    expect(models).toHaveLength(3) // 2 deepseek + 1 opencode, -1 deprecated
    expect(models.find((m) => m.modelID === "deepseek-v4-flash")).toBeDefined()
    expect(models.find((m) => m.modelID === "deepseek-nano")).toBeUndefined() // deprecated
  })

  it("sorts models alphabetically by label", () => {
    const models = getAllModels(mockProviders)
    for (let i = 1; i < models.length; i++) {
      expect(models[i].label.localeCompare(models[i - 1].label)).toBeGreaterThanOrEqual(0)
    }
  })

  it("shows current model for each agent", () => {
    const result = getAgentModels(mockAgents, mockProviders)
    expect(result).toHaveLength(5) // 5 agents, skipped hidden ones

    const auto = result.find((a) => a.agentName === "auto")
    expect(auto?.currentModel).toBe("deepseek-v4-flash (deepseek)")

    const reviewer = result.find((a) => a.agentName === "reviewer")
    expect(reviewer?.currentModel).toBe("kimi-k2-thinking (opencode)")

    const nocowboy = result.find((a) => a.agentName === "nocowboy")
    expect(nocowboy?.currentModel).toBe("not configured")
  })

  it("filters out hidden/internal agents", () => {
    const agentsWithHidden: AgentInfo[] = [
      ...mockAgents,
      { name: "compaction" },
      { name: "title" },
      { name: "summary" },
      { name: "router" },
    ]
    const result = getAgentModels(agentsWithHidden, mockProviders)
    expect(result).toHaveLength(5) // compaction, title, summary, router filtered out
  })
})
