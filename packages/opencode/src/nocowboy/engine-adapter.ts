import { createEngineAdapter, createSpawnPolicy, type EngineAdapter, type SpawnPolicy } from "@nocowboy/engine-adapter"
import type { Agent } from "@/agent/agent"
import { Permission } from "@/permission"
import type { AgentCatalogEntry, SessionContext } from "@nocowboy/runtime"

/**
 * Engine-side binding of @nocowboy/runtime ports to the concrete services.
 *
 * This is the ONE entry point the engine uses into the shared core: the task
 * tool listing and the task executor both obtain the spawn policy here, instead
 * of each importing policy helpers directly (which is how the two could drift).
 */

function entry(info: Agent.Info): AgentCatalogEntry {
  return { name: info.name, mode: info.mode, description: info.description, hidden: info.hidden }
}

/** The spawn policy bound to an agent roster — single entry point. */
export function spawnPolicy(agents: () => ReadonlyArray<Agent.Info>): SpawnPolicy {
  return createSpawnPolicy(() => agents().map(entry))
}

/** The full adapter bound to engine services (roster + permission + session). */
export function engineAdapter(input: {
  agents: ReadonlyArray<Agent.Info>
  agent: Agent.Info
  session: SessionContext
}): EngineAdapter {
  return createEngineAdapter({
    listAgents: () => input.agents.map(entry),
    evaluatePolicy: (request) => ({
      action: Permission.evaluate(request.permission, request.pattern, input.agent.permission).action,
    }),
    session: () => input.session,
  })
}
