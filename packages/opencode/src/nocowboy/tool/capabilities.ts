/**
 * Tool capability config — pick the edit tool by *capability*, not by model name.
 *
 * Upstream hardcoded: "if the model id contains `gpt-` (but not `oss`/`gpt-4`),
 * prefer apply_patch; otherwise edit". There is no single required editing
 * methodology — the right tool depends on the model, the enabled tools and the
 * prompt — so this is now an ordered capability config: a list of
 * `{ match, tool }` rules evaluated against `providerID/modelID`, with a
 * fallback. The default rules reproduce the old gpt-* behaviour exactly, so the
 * switch is off the model name in call sites and into data.
 *
 * Pure: no engine, no config load, no Effect.
 */

export type EditCapability = "edit" | "apply_patch"

export interface ToolCapabilityConfig {
  /** Ordered rules over `providerID/modelID` (glob, `**` crosses `/`); first match wins. */
  edit?: ReadonlyArray<{ match: string; tool: EditCapability }>
  /** Used when no rule matches. */
  default_edit_tool?: EditCapability
}

/**
 * Defaults reproducing the legacy behaviour: apply_patch for gpt-* except the
 * `oss` variants and gpt-4, edit otherwise.
 */
export const DEFAULT_TOOL_CAPABILITIES: Required<ToolCapabilityConfig> = {
  edit: [
    { match: "**gpt-4**", tool: "edit" },
    { match: "**gpt-*oss**", tool: "edit" },
    { match: "**gpt-**", tool: "apply_patch" },
  ],
  default_edit_tool: "edit",
}

function escapeChar(char: string): string {
  return /[.*+?^${}()|[\]\\]/.test(char) ? "\\" + char : char
}

function globToRegExp(pattern: string): RegExp {
  let body = ""
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]!
    if (char === "*") {
      if (pattern[i + 1] === "*") {
        body += ".*"
        i++
      } else {
        body += "[^/]*"
      }
    } else {
      body += escapeChar(char)
    }
  }
  return new RegExp(`^${body}$`)
}

/**
 * Resolve the edit tool for a model. `force` (e.g. the E2E override) wins.
 */
export function selectEditCapability(input: {
  providerID: string
  modelID: string
  config?: ToolCapabilityConfig
  force?: EditCapability
}): EditCapability {
  if (input.force) return input.force
  const rules = input.config?.edit ?? DEFAULT_TOOL_CAPABILITIES.edit
  const fallback = input.config?.default_edit_tool ?? DEFAULT_TOOL_CAPABILITIES.default_edit_tool
  const haystack = `${input.providerID}/${input.modelID}`.toLowerCase()
  for (const rule of rules) {
    if (globToRegExp(rule.match.toLowerCase()).test(haystack)) return rule.tool
  }
  return fallback
}
