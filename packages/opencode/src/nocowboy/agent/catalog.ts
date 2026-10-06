/**
 * AgentCatalog — the single source of truth for which agents may be spawned as
 * subagents via the `task` tool.
 *
 * Before this, the policy lived implicitly in the tool description
 * (`registry.ts` filtered `mode !== "primary"`) while the executor
 * (`tool/task.ts` → `KiloTask.validate`) enforced nothing — so a caller could
 * spawn the `auto` dispatcher (a primary agent) even though it was never listed.
 * Both sides now call through here, so listing and execution cannot drift.
 */
export interface SpawnableAgent {
  name: string
  mode: "subagent" | "primary" | "all"
  hidden?: boolean
}

export namespace AgentCatalog {
  /**
   * Primary agents (e.g. the `auto` dispatcher, and the hidden system agents
   * compaction/title/summary) drive their own session and must not be delegated
   * to. `all` and `subagent` agents are spawnable.
   */
  export function isSpawnable(agent: Pick<SpawnableAgent, "mode">): boolean {
    return agent.mode !== "primary"
  }

  /** The spawnable subset of an agent list — used to build the task tool listing. */
  export function spawnable<T extends Pick<SpawnableAgent, "mode">>(agents: readonly T[]): T[] {
    return agents.filter(isSpawnable)
  }

  export function spawnError(name: string, mode: SpawnableAgent["mode"]): Error {
    return new Error(
      `Agent type "${name}" (mode: ${mode}) is not spawnable as a subagent — primary agents cannot be delegated to`,
    )
  }
}
