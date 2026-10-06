import { Schema } from "effect"

/**
 * ModelPort — resolve the model for a role. The engine owns provider access;
 * the core depends on this port so agents are not tied to a provider service.
 */

export const ModelRef = Schema.Struct({
  providerID: Schema.String,
  modelID: Schema.String,
  variant: Schema.optional(Schema.String),
})
export type ModelRef = Schema.Schema.Type<typeof ModelRef>

export interface ModelPort {
  resolve(role: string): ModelRef | undefined
  fallback(role: string): ModelRef | undefined
}
