import { Schema } from "effect"

/**
 * MemoryPort — the memory/MCP transport contract: observable status, structured
 * results, explicit project/session context, bounded flush.
 */

export const MemoryStatus = Schema.Literals(["available", "degraded", "unavailable"])
export type MemoryStatus = Schema.Schema.Type<typeof MemoryStatus>

export const MemoryErrorCode = Schema.Literals([
  "transport",
  "timeout",
  "http",
  "rpc",
  "invalid-response",
  "bad-request",
])
export type MemoryErrorCode = Schema.Schema.Type<typeof MemoryErrorCode>

export const MemoryError = Schema.Struct({
  code: MemoryErrorCode,
  message: Schema.String,
  httpStatus: Schema.optional(Schema.Number),
})
export type MemoryError = Schema.Schema.Type<typeof MemoryError>

export const MemoryResult = Schema.Union([
  Schema.Struct({ ok: Schema.Literal(true), text: Schema.String }),
  Schema.Struct({ ok: Schema.Literal(false), error: MemoryError, status: MemoryStatus }),
])
export type MemoryResult = Schema.Schema.Type<typeof MemoryResult>

export const MemoryCallContext = Schema.Struct({
  projectDir: Schema.String,
  sessionID: Schema.optional(Schema.String),
  timeoutMs: Schema.optional(Schema.Number),
})
export type MemoryCallContext = Schema.Schema.Type<typeof MemoryCallContext>

export interface MemoryPort {
  status(): MemoryStatus
  callTool(name: string, args: Record<string, unknown>, ctx: MemoryCallContext): Promise<MemoryResult>
  flush(opts?: { timeoutMs?: number }): Promise<{ drained: number; pending: number; timedOut: boolean }>
}
