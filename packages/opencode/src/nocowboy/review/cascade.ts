/**
 * Cross-model review cascade.
 *
 * The idea: a review is only as independent as the model performing it, so the
 * reviewer should be a different model family from the author. Given the model
 * that wrote the code, this resolver picks:
 *
 *   phase 1 — a reviewer model mapped from the author's model family
 *             (e.g. author deepseek -> reviewer qwen; author qwen -> reviewer deepseek)
 *   phase 2 — a second reviewer for the phase-1 findings. It is NEVER the author
 *             implicitly: it is set only by explicit config (a third model, or the
 *             literal `author` as an explicit opt-in). Without it there is no
 *             second phase.
 *
 * Everything is configuration-driven (config `review.cascade`), never hardcoded.
 * The module is pure so it can be unit-tested without a provider registry.
 */

export interface ReviewCascadeConfig {
  enabled?: boolean
  /**
   * Author-family keyword (matched case-insensitively against
   * `providerID modelID`) -> reviewer model id in `provider/model` form.
   */
  map?: Record<string, string>
  /**
   * Model for the second review phase: a `provider/model` id, the literal
   * `author` to explicitly reuse the model that wrote the code (opt-in), or
   * `off`/`none` to disable. Unset means no second phase — the author is never
   * reused implicitly.
   */
  second_phase?: string | null
}

export interface CascadeModel {
  providerID: string
  modelID: string
}

export interface ReviewCascadeResolution {
  /** Reviewer for phase 1; undefined means "fall back to the configured reviewer agent model". */
  primary?: CascadeModel
  /** Reviewer for phase 2; undefined means "no second phase". */
  secondary?: CascadeModel
}

/** `provider/model` split — the provider id never contains a slash, the model id may. */
export function parseCascadeModel(model: string): CascadeModel | undefined {
  const trimmed = model.trim()
  if (!trimmed.includes("/")) return undefined
  const [providerID, ...rest] = trimmed.split("/")
  const modelID = rest.join("/")
  if (!providerID || !modelID) return undefined
  return { providerID, modelID }
}

function haystack(providerID: string, modelID: string): string {
  return `${providerID} ${modelID}`.toLowerCase()
}

/**
 * Find the first map entry whose keyword occurs in the author's provider/model.
 * Empty keywords are ignored so a stray `"": "..."` cannot match everything.
 */
function matchMap(needle: string, map: Record<string, string>): string | undefined {
  for (const [keyword, model] of Object.entries(map)) {
    if (keyword.trim().length === 0) continue
    if (needle.includes(keyword.trim().toLowerCase())) return model
  }
  return undefined
}

export function resolveReviewCascade(input: {
  config?: ReviewCascadeConfig
  author: { providerID: string; modelID: string }
}): ReviewCascadeResolution {
  const config = input.config
  if (!config?.enabled) return {}

  const author: CascadeModel = { providerID: input.author.providerID, modelID: input.author.modelID }
  const mapped = config.map ? matchMap(haystack(author.providerID, author.modelID), config.map) : undefined
  const primary = mapped ? parseCascadeModel(mapped) : undefined

  const secondPhase = config.second_phase?.trim() ?? ""
  const secondPhaseLower = secondPhase.toLowerCase()
  const secondPhaseDisabled = secondPhaseLower === "none" || secondPhaseLower === "off"
  let secondary: CascadeModel | undefined
  if (!secondPhaseDisabled) {
    if (secondPhase.length > 0) {
      // `author` is the only path back to the author's model, and it is
      // explicit — never the default.
      secondary = secondPhaseLower === "author" ? author : parseCascadeModel(secondPhase)
    }
  }

  // Reviewing with the same model that just reviewed adds cost without adding
  // independence.
  if (secondary && primary && secondary.providerID === primary.providerID && secondary.modelID === primary.modelID) {
    secondary = undefined
  }

  return { primary, secondary }
}

function sameModel(a: CascadeModel, b: CascadeModel): boolean {
  return a.providerID === b.providerID && a.modelID === b.modelID
}

export interface IndependenceDiagnostic {
  code: "reviewer-matches-author" | "second-phase-matches-author"
  severity: "warning"
  message: string
}

/**
 * Turn review independence into a checkable policy: an independent review needs
 * a reviewer whose model differs from the author's. This reports the two ways
 * that can be broken — the phase-1 reviewer matching the author (coincidental
 * config), and the second phase reusing the author (which must be an explicit
 * opt-in, so it is reported as a warning rather than silently accepted).
 */
export function diagnoseReviewIndependence(input: {
  author: CascadeModel
  resolution: ReviewCascadeResolution
}): IndependenceDiagnostic[] {
  const diagnostics: IndependenceDiagnostic[] = []
  const { primary, secondary } = input.resolution
  const model = (m: CascadeModel) => `${m.providerID}/${m.modelID}`
  if (primary && sameModel(primary, input.author)) {
    diagnostics.push({
      code: "reviewer-matches-author",
      severity: "warning",
      message: `Reviewer model ${model(primary)} matches the author; phase 1 is not independent. Configure review.cascade.map to a different family.`,
    })
  }
  if (secondary && sameModel(secondary, input.author)) {
    diagnostics.push({
      code: "second-phase-matches-author",
      severity: "warning",
      message: `Second review phase reuses the author model ${model(secondary)} (explicit opt-in). Independence depends on a different model.`,
    })
  }
  return diagnostics
}

/**
 * Prompt for the second review phase: it hands the phase-1 review to the second
 * reviewer and asks for an independent verification of it, with the original
 * task context preserved.
 */
export function secondPhasePrompt(originalPrompt: string, firstReview: string): string {
  return [
    originalPrompt,
    "",
    "---",
    "A second review phase is now required. Another model produced the review below.",
    "Independently verify every finding against the actual code, correct anything it got wrong,",
    "and add what it missed. Do not merely restate the first review.",
    "",
    "# First review",
    "",
    firstReview,
  ].join("\n")
}
