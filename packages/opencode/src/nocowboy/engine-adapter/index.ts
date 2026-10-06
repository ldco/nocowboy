/**
 * @nocowboy/engine-adapter — the single entry point that binds the
 * `@nocowboy/runtime` ports to the live engine.
 *
 * This is the ONLY module (besides tests) that may reach for the concrete port
 * implementations (`nocowboy/agent/catalog`, `@/permission`, …). Consumers —
 * the worker + task + permissions vertical to start — obtain ports from here,
 * so there is one wiring point instead of scattered direct imports and
 * callbacks. `scripts/check-engine-adapter.ts` enforces that.
 */
import type {
  AgentCatalogPort,
  EditPort,
  MemoryPort,
  MemoryStatus,
  MemoryWriteResult,
  ModelPort,
  ModelRef,
  PolicyAction,
  PolicyPort,
  PolicyRequest,
  SessionPort,
  SessionRef,
  TelemetryPort,
  TelemetryEvent,
} from "@/nocowboy/runtime"
import type { EditRequest, EditResult, MemoryNamespace, MemoryRecord } from "@/nocowboy/runtime"
import { Permission } from "@/permission"
import { AgentCatalog } from "../agent/catalog"

export namespace EngineAdapter {
  // ── Ports implemented by the engine directly ──

  /** AgentCatalogPort backed by the concrete `AgentCatalog` spawn policy. */
  export function agentCatalog(): AgentCatalogPort {
    return AgentCatalog
  }

  /** PolicyPort backed by `Permission.evaluate` over the given ruleset. */
  export function policy(ruleset: Permission.Ruleset): PolicyPort {
    return {
      evaluate(request: PolicyRequest): PolicyAction {
        return Permission.evaluate(request.permission, request.pattern, ruleset).action
      },
    }
  }

  // ── Ports implemented by engine services (bound as they migrate) ──
  // Each takes the engine surface and returns the port contract, so later
  // verticals bind the live service without a second wiring point.

  export interface SessionEngine {
    create(input: { title: string; parentID?: string }): Promise<SessionRef>
    get(id: string): Promise<SessionRef | undefined>
    children(id: string): Promise<SessionRef[]>
  }
  export function session(engine: SessionEngine): SessionPort {
    return engine
  }

  export interface ModelEngine {
    resolve(input: { agent: string; fallback?: ModelRef }): Promise<ModelRef | undefined>
  }
  export function model(engine: ModelEngine): ModelPort {
    return engine
  }

  export interface MemoryEngine {
    status(): MemoryStatus
    add(namespace: MemoryNamespace, record: MemoryRecord): Promise<MemoryWriteResult>
  }
  export function memory(engine: MemoryEngine): MemoryPort {
    return engine
  }

  export interface TelemetryEngine {
    emit(event: TelemetryEvent): void
  }
  export function telemetry(engine: TelemetryEngine): TelemetryPort {
    return engine
  }

  export interface EditEngine {
    apply(request: EditRequest): Promise<EditResult>
  }
  export function edit(engine: EditEngine): EditPort {
    return engine
  }
}
