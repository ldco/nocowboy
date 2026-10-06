import { Schema } from "effect"

/**
 * AgentCatalog port — the spawnable-roles policy, expressed once for the core.
 *
 * The host (the opencode engine) supplies the current roster through
 * `AgentCatalogPort`; the *policy* about which roles may be spawned lives here,
 * so the task-tool listing and the executor can never drift. No imports from
 * `@/session`, `@tui`, or provider services — this is a contract only.
 */

export const AgentMode = Schema.Literals(["subagent", "primary", "all"])
export type AgentMode = Schema.Schema.Type<typeof AgentMode>

export const AgentCatalogEntry = Schema.Struct({
  name: Schema.String,
  mode: AgentMode,
  description: Schema.optional(Schema.String),
  hidden: Schema.optional(Schema.Boolean),
})
export type AgentCatalogEntry = Schema.Schema.Type<typeof AgentCatalogEntry>

/** Host-supplied roster. The policy below decides what may be spawned. */
export interface AgentCatalogPort {
  list(): Promise<ReadonlyArray<AgentCatalogEntry>>
}

export namespace AgentCatalog {
  /**
   * Roles that must never be a subagent regardless of `mode`. `auto` is the
   * primary dispatcher and owns its own tools.
   */
  export const NEVER_SPAWNABLE = ["auto"] as const
  const never = new Set<string>(NEVER_SPAWNABLE)

  /** The one spawn policy: not primary-only and not explicitly banned. */
  export function isSpawnable(item: { name: string; mode: string }): boolean {
    if (never.has(item.name)) return false
    return item.mode !== "primary"
  }

  /** Spawnable roles, name-sorted (stable ordering for the listing). */
  export function spawnable<T extends { name: string; mode: string }>(items: ReadonlyArray<T>): T[] {
    return items.filter(isSpawnable).toSorted((a, b) => a.name.localeCompare(b.name))
  }

  /** Render the "available agent types" block for a task-tool description. */
  export function describe(items: ReadonlyArray<{ name: string; description?: string }>): string {
    const list = items
      .map((item) => `- ${item.name}: ${item.description ?? "This subagent should only be called manually by the user."}`)
      .join("\n")
    return ["Available agent types and the tools they have access to:", list].join("\n")
  }
}
