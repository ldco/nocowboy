import { AgentCatalog, type AgentCatalogEntry } from "@nocowboy/runtime"

/**
 * SpawnPolicy — the adapter-side view of the AgentCatalog port. Both the task
 * tool listing and the executor obtain the policy here, so there is a single
 * entry point into the shared core (no parallel callback paths).
 */
export interface SpawnPolicy {
  spawnable(): AgentCatalogEntry[]
  describe(items: ReadonlyArray<{ name: string; description?: string }>): string
  canSpawn(item: { name: string; mode: string }): boolean
}

export function createSpawnPolicy(listAgents: () => ReadonlyArray<AgentCatalogEntry>): SpawnPolicy {
  return {
    spawnable: () => AgentCatalog.spawnable(listAgents()),
    describe: (items) => AgentCatalog.describe(items),
    canSpawn: (item) => AgentCatalog.isSpawnable(item),
  }
}
