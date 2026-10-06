import { Schema } from "effect"

/**
 * PolicyPort — the permission decision contract. The engine supplies the rules;
 * the core only names the shape of a decision so tools/agents depend on the port,
 * not on the permission service.
 */

export const PolicyAction = Schema.Literals(["allow", "deny", "ask"])
export type PolicyAction = Schema.Schema.Type<typeof PolicyAction>

export const PolicyRule = Schema.Struct({
  permission: Schema.String,
  pattern: Schema.String,
  action: PolicyAction,
})
export type PolicyRule = Schema.Schema.Type<typeof PolicyRule>

export const PolicyRequest = Schema.Struct({
  permission: Schema.String,
  pattern: Schema.String,
  agent: Schema.optional(Schema.String),
})
export type PolicyRequest = Schema.Schema.Type<typeof PolicyRequest>

export const PolicyDecision = Schema.Struct({
  action: PolicyAction,
  rule: Schema.optional(PolicyRule),
})
export type PolicyDecision = Schema.Schema.Type<typeof PolicyDecision>

export interface PolicyPort {
  check(request: PolicyRequest): PolicyDecision
}
