import { Schema } from "effect"

/**
 * TelemetryPort — track a named event with opaque data. The engine owns the
 * telemetry backend; the core depends on this port only.
 */

export const TelemetryEvent = Schema.Struct({
  name: Schema.String,
  data: Schema.optional(Schema.Unknown),
  at: Schema.optional(Schema.Number),
})
export type TelemetryEvent = Schema.Schema.Type<typeof TelemetryEvent>

export interface TelemetryPort {
  track(event: TelemetryEvent): void
}
