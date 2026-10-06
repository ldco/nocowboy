/**
 * @nocowboy/runtime — the port core.
 *
 * Domain dependencies cross this boundary only through the seven port
 * contracts below. The module is intentionally dependency-free apart from
 * `effect` (schemas): it must not import `@/session`, `@tui`, provider
 * services, or any other engine internals. `scripts/check-runtime-boundary.ts`
 * enforces that in pre-commit / CI, and the contracts are unit-tested without
 * booting the engine (packages/opencode/test/nocowboy/runtime).
 */
import { Schema } from "effect"

// ─────────────────────────────────────────────────────────────────────────────
// 1. AgentCatalogPort — which agents may be spawned as subagents.
// ─────────────────────────────────────────────────────────────────────────────

export const AgentMode = Schema.Literals(["subagent", "primary", "all"])
export type AgentMode = Schema.Schema.Type<typeof AgentMode>

export interface AgentCatalogPort {
  isSpawnable(agent: { mode: AgentMode }): boolean
  spawnable<T extends { mode: AgentMode }>(agents: readonly T[]): T[]
  spawnError(name: string, mode: AgentMode): Error
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PolicyPort — permission evaluation.
// ─────────────────────────────────────────────────────────────────────────────

export const PolicyAction = Schema.Literals(["allow", "ask", "deny"])
export type PolicyAction = Schema.Schema.Type<typeof PolicyAction>

export const PolicyRequest = Schema.Struct({
  permission: Schema.String,
  pattern: Schema.String,
})
export type PolicyRequest = Schema.Schema.Type<typeof PolicyRequest>

export interface PolicyPort {
  evaluate(request: PolicyRequest): PolicyAction | Promise<PolicyAction>
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SessionPort — session lifecycle.
// ─────────────────────────────────────────────────────────────────────────────

export const SessionRef = Schema.Struct({ id: Schema.String })
export type SessionRef = Schema.Schema.Type<typeof SessionRef>

export interface SessionPort {
  create(input: { title: string; parentID?: string }): Promise<SessionRef>
  get(id: string): Promise<SessionRef | undefined>
  children(id: string): Promise<SessionRef[]>
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. EditPort — deterministic, batch-safe editing.
// ─────────────────────────────────────────────────────────────────────────────

export const EditBlock = Schema.Struct({ search: Schema.String, replace: Schema.String })
export type EditBlock = Schema.Schema.Type<typeof EditBlock>

export const EditRequest = Schema.Struct({ path: Schema.String, blocks: Schema.Array(EditBlock) })
export type EditRequest = Schema.Schema.Type<typeof EditRequest>

/** `ambiguous` = duplicate match, `stale` = file changed since read, `partial` = aborted mid-batch. */
export const EditOutcome = Schema.Literals(["applied", "no-match", "ambiguous", "stale", "partial"])
export type EditOutcome = Schema.Schema.Type<typeof EditOutcome>

export interface EditResult {
  outcome: EditOutcome
  applied: number
}

export interface EditPort {
  apply(request: EditRequest): Promise<EditResult>
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ModelPort — model resolution.
// ─────────────────────────────────────────────────────────────────────────────

export const ModelRef = Schema.Struct({ providerID: Schema.String, modelID: Schema.String })
export type ModelRef = Schema.Schema.Type<typeof ModelRef>

export interface ModelPort {
  resolve(input: { agent: string; fallback?: ModelRef }): Promise<ModelRef | undefined>
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. MemoryPort — cross-session memory with observable status.
// ─────────────────────────────────────────────────────────────────────────────

export const MemoryStatus = Schema.Literals(["available", "degraded", "unavailable"])
export type MemoryStatus = Schema.Schema.Type<typeof MemoryStatus>

export const MemoryNamespace = Schema.Struct({ project: Schema.String, session: Schema.String })
export type MemoryNamespace = Schema.Schema.Type<typeof MemoryNamespace>

export const MemoryRecord = Schema.Struct({
  type: Schema.String,
  title: Schema.String,
  content: Schema.String,
})
export type MemoryRecord = Schema.Schema.Type<typeof MemoryRecord>

export type MemoryWriteResult = { ok: true } | { ok: false; error: string }

export interface MemoryPort {
  status(): MemoryStatus
  add(namespace: MemoryNamespace, record: MemoryRecord): Promise<MemoryWriteResult>
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. TelemetryPort — best-effort event emission.
// ─────────────────────────────────────────────────────────────────────────────

export const TelemetryEvent = Schema.Struct({
  name: Schema.String,
  properties: Schema.Record(Schema.String, Schema.Unknown),
})
export type TelemetryEvent = Schema.Schema.Type<typeof TelemetryEvent>

export interface TelemetryPort {
  emit(event: TelemetryEvent): void
}
