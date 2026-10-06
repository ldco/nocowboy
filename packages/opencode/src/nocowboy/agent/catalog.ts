/**
 * AgentCatalog — the single policy for which roles may be spawned as subagents.
 *
 * Two call sites must agree:
 *   - the task tool *listing* (`tool/registry.ts` describeTask) tells the model
 *     which subagent types exist;
 *   - the task tool *executor* (`KiloTask.validate`) must reject a spawn of a
 *     role the listing never offered.
 *
 * Before this, the listing filtered `mode !== "primary"` inline while the
 * executor validated nothing, so the two could drift — the model could spawn
 * `auto` (the primary dispatcher) even though it was never listed. Both now call
 * this module, so a role that is not spawnable cannot be listed and cannot be
 * executed.
 *
 * Pure: no engine, no config, no Effect.
 */

export namespace AgentCatalog {
  /**
   * Roles that must never be a subagent regardless of their `mode`. `auto` is
   * the primary dispatcher and owns its own tools; even a misconfigured
   * `mode: "all"` must not make it spawnable.
   */
  export const NEVER_SPAWNABLE = ["auto"] as const
  const never = new Set<string>(NEVER_SPAWNABLE)

  /** The one spawn policy: not primary-only and not explicitly banned. */
  export function isSpawnable(item: { name: string; mode: string }): boolean {
    if (never.has(item.name)) return false
    return item.mode !== "primary"
  }

  /** Spawnable roles, name-sorted (stable ordering for the listing). */
  export function spawnable<T extends { name: string; mode: string }>(items: readonly T[]): T[] {
    return items.filter(isSpawnable).toSorted((a, b) => a.name.localeCompare(b.name))
  }

  /** Render the "available agent types" block for the task tool description. */
  export function describe(
    items: readonly { name: string; description?: string }[],
  ): string {
    const list = items
      .map((item) => `- ${item.name}: ${item.description ?? "This subagent should only be called manually by the user."}`)
      .join("\n")
    return ["Available agent types and the tools they have access to:", list].join("\n")
  }
}
