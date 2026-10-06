import type {
  AgentCatalogEntry,
  AgentCatalogPort,
  PolicyDecision,
  PolicyPort,
  PolicyRequest,
  SessionContext,
  SessionPort,
} from "@nocowboy/runtime"
import { createSpawnPolicy, type SpawnPolicy } from "./spawn"

/**
 * EngineAdapter — binds the runtime ports to the engine's concrete services.
 *
 * The engine supplies three primitives (roster, policy evaluation, session
 * context); the adapter exposes them through the port interfaces plus the spawn
 * policy. This is the one seam the engine adapts to instead of threading
 * ad-hoc callbacks through the task tool.
 */
export interface EngineAdapterDeps {
  listAgents: () => ReadonlyArray<AgentCatalogEntry>
  evaluatePolicy: (request: PolicyRequest) => PolicyDecision
  session: () => SessionContext
}

export interface EngineAdapter {
  spawn: SpawnPolicy
  agentCatalog: AgentCatalogPort
  policy: PolicyPort
  session: SessionPort
}

export function createEngineAdapter(deps: EngineAdapterDeps): EngineAdapter {
  return {
    spawn: createSpawnPolicy(deps.listAgents),
    agentCatalog: { list: async () => deps.listAgents() },
    policy: { check: (request) => deps.evaluatePolicy(request) },
    session: { context: () => deps.session() },
  }
}
