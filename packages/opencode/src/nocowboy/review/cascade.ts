/**
 * Cross-model review cascade.
 *
 * The idea: a review is only as independent as the model performing it, so the
 * reviewer should be a different model family from the author. Given the model
 * that wrote the code, this resolver picks:
 *
 *   phase 1 — a reviewer model mapped from the author's model family
 *             (e.g. author deepseek -> reviewer qwen; author qwen -> reviewer deepseek)
 *   phase 2 — an optional second reviewer for the phase-1 findings. It is
 *             **opt-in**: `second_phase` must name a model, or the literal
 *             `author` to explicitly reuse the author's model. With no
 *             `second_phase`, there is no second phase — the cascade never
 *             silently reuses the author's model.
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
   * Model for the second review phase: a `provider/model` id, or the literal
   * `author` to explicitly reuse the model that wrote the code. There is no
   * default — the second phase is opt-in.
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
  // Explicit opt-in only: the second phase never silently reuses the author's
  // model. `second_phase` must name a model, or the literal "author" to opt in.
  if (!secondPhaseDisabled && secondPhase.length > 0) {
    secondary = secondPhaseLower === "author" ? author : parseCascadeModel(secondPhase)
  }

  // Reviewing with the same model that just reviewed adds cost without adding
  // independence.
  if (secondary && primary && secondary.providerID === primary.providerID && secondary.modelID === primary.modelID) {
    secondary = undefined
  }

  return { primary, secondary }
}

/**
 * Review-independence diagnosis — is the reviewer actually a different model?
 *
 * `resolveModel` prefers an agent-specific model and otherwise falls back to the
 * global `cfg.model`, so a reviewer and worker can silently resolve to the *same*
 * model and the "cross-model" review becomes a self-review. This reports that so
 * it can be surfaced as a warning instead of being assumed.
 */
export interface ReviewIndependenceInput {
  /** The worker's effective model (agent.worker.model ?? cfg.model). */
  worker?: { providerID: string; modelID: string } | undefined
  /** The reviewer's effective model. */
  reviewer?: { providerID: string; modelID: string } | undefined
  /** The author of the code under review, when known. */
  author?: { providerID: string; modelID: string } | undefined
  /** Explicit opt-in to a same-model review. */
  allowSameModel?: boolean
}

export interface ReviewIndependenceDiagnosis {
  independent: boolean
  code?: "reviewer-equals-worker" | "reviewer-equals-author"
  message?: string
}

function sameModel(
  a: { providerID: string; modelID: string } | undefined,
  b: { providerID: string; modelID: string } | undefined,
): boolean {
  return !!a && !!b && a.providerID === b.providerID && a.modelID === b.modelID
}

function ref(model: { providerID: string; modelID: string }): string {
  return `${model.providerID}/${model.modelID}`
}

export function diagnoseReviewIndependence(input: ReviewIndependenceInput): ReviewIndependenceDiagnosis {
  if (input.allowSameModel) return { independent: true }
  if (sameModel(input.reviewer, input.worker)) {
    return {
      independent: false,
      code: "reviewer-equals-worker",
      message: `reviewer model ${ref(input.reviewer!)} equals the worker model — the review is not model-independent; set agent.reviewer.model (or review.cascade) to a different model`,
    }
  }
  if (sameModel(input.reviewer, input.author)) {
    return {
      independent: false,
      code: "reviewer-equals-author",
      message: `reviewer model ${ref(input.reviewer!)} equals the author model — the review is not model-independent`,
    }
  }
  return { independent: true }
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
