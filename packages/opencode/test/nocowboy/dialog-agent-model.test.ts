/**
 * Tests for DialogAgentModel — per-agent model selection UI.
 *
 * The component renders; the decisions (which models, which agents, and the
 * exact config patch) live in agent-model-dialog-state and are tested here.
 */

import { describe, it, expect } from "bun:test"
import {
  agentModelPatch,
  currentAgentModel,
  isCurrentAgentModel,
  listAssignableAgents,
  listAssignableModels,
  type AgentLike,
  type ProviderLike,
} from "../../src/nocowboy/components/agent-model-dialog-state"

describe("DialogAgentModel", () => {
  const mockProviders: ProviderLike[] = [
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

  const mockAgents: AgentLike[] = [
    { name: "auto", model: { providerID: "deepseek", modelID: "deepseek-v4-flash" } },
    { name: "worker", model: { providerID: "deepseek", modelID: "deepseek-v4-flash" } },
    { name: "planner", model: { providerID: "deepseek", modelID: "deepseek-v4-pro" } },
    { name: "reviewer", model: { providerID: "opencode", modelID: "kimi-k2-thinking" } },
    { name: "nocowboy" },
  ]

  it("lists all non-deprecated models from providers", () => {
    const models = listAssignableModels(mockProviders)
    expect(models).toHaveLength(3) // 2 deepseek + 1 opencode, -1 deprecated
    expect(models.find((m) => m.modelID === "deepseek-v4-flash")).toBeDefined()
    expect(models.find((m) => m.modelID === "deepseek-nano")).toBeUndefined() // deprecated
  })

  it("sorts models alphabetically by label", () => {
    const models = listAssignableModels(mockProviders)
    for (let i = 1; i < models.length; i++) {
      expect(models[i].label.localeCompare(models[i - 1].label)).toBeGreaterThanOrEqual(0)
    }
  })

  it("filters out hidden/internal agents", () => {
    const agentsWithHidden: AgentLike[] = [
      ...mockAgents,
      { name: "compaction" },
      { name: "title" },
      { name: "summary" },
      { name: "router" },
    ]
    expect(listAssignableAgents(agentsWithHidden)).toHaveLength(5)
  })

  it("resolves the current model of an agent", () => {
    expect(currentAgentModel(mockAgents[0])).toEqual({ providerID: "deepseek", modelID: "deepseek-v4-flash" })
    expect(currentAgentModel(mockAgents.find((a) => a.name === "nocowboy"))).toBeUndefined()
    expect(currentAgentModel(undefined)).toBeUndefined()
  })

  it("matches current model by provider AND model, not model alone", () => {
    const auto = mockAgents[0]
    expect(
      isCurrentAgentModel(auto, { providerID: "deepseek", modelID: "deepseek-v4-flash", label: "x" }),
    ).toBe(true)
    // Same modelID behind a different provider must not count as current.
    expect(
      isCurrentAgentModel(auto, { providerID: "opencode", modelID: "deepseek-v4-flash", label: "x" }),
    ).toBe(false)
  })

  it("builds a nested patch with a provider/model string", () => {
    // ConfigModelID is a STRING; the overlay payload must be NESTED, not dotted.
    expect(agentModelPatch("worker", { providerID: "deepseek", modelID: "deepseek-v4-flash" })).toEqual({
      agent: { worker: { model: "deepseek/deepseek-v4-flash" } },
    })
    expect(Object.keys(agentModelPatch("architect", { providerID: "kimi-for-coding", modelID: "kimi-k2.7-code" }))).toEqual([
      "agent",
    ])
  })
})
