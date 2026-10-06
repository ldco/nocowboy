import { Schema } from "effect"

/**
 * SessionPort — the ambient session identity a call belongs to. Used to pass
 * project/session explicitly instead of reading hidden globals.
 */

export const SessionContext = Schema.Struct({
  directory: Schema.String,
  sessionID: Schema.optional(Schema.String),
  agent: Schema.optional(Schema.String),
})
export type SessionContext = Schema.Schema.Type<typeof SessionContext>

export interface SessionPort {
  context(): SessionContext
}
