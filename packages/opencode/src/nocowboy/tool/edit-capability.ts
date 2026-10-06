/**
 * Tool-capability config — which editing tool to expose.
 *
 * There is no single mandatory editing method: whether a model does better with
 * the patch-style editor (`apply_patch`) or the search/replace editor (`edit`)
 * depends on the model, the available tools and the prompt. Instead of guessing
 * from the model id in code, the choice is a capability the caller configures
 * (`experimental.edit_method`).
 *
 * The legacy model-id heuristic stays as the default, so behaviour is unchanged
 * unless a capability is configured. Pure and deterministic, so the precedence
 * is unit-testable without the engine.
 */

export type EditMethod = "patch" | "edit"

export const EDIT_METHODS: readonly EditMethod[] = ["patch", "edit"]

/**
 * The legacy compatibility default: `apply_patch` for the gpt-* family except
 * `oss` and `gpt-4`, `edit` otherwise. Kept verbatim so an unconfigured install
 * behaves exactly as before.
 */
export function legacyEditMethod(modelID: string): EditMethod {
  if (modelID.includes("gpt-") && !modelID.includes("oss") && !modelID.includes("gpt-4")) return "patch"
  return "edit"
}

/**
 * Resolve the editing method for a model.
 *
 * Precedence:
 *   1. the E2E harness always uses `patch` (its scenarios assume it);
 *   2. an exact `modelID` entry in the capability table;
 *   3. the `"*"` entry in the capability table (a global default);
 *   4. the legacy model-id heuristic.
 */
export function resolveEditMethod(input: {
  modelID: string
  e2e?: boolean
  table?: Record<string, EditMethod>
}): EditMethod {
  if (input.e2e) return "patch"
  const table = input.table
  if (table) {
    const exact = table[input.modelID]
    if (exact) return exact
    const fallback = table["*"]
    if (fallback) return fallback
  }
  return legacyEditMethod(input.modelID)
}
