/**
 * Context profile — how much of a (potentially huge) model window a task may
 * occupy. This is the budgeting half of "deep context": a 2M-token window is
 * only useful if the cost of filling it is bounded per task.
 *
 * The module is pure: it resolves a requested profile against the model window
 * and the configured token budget, and never touches the session or the network,
 * so it is trivially unit-testable and, being a pure function of (profile,
 * window, budget), guarantees the same stable prefix across turns.
 *
 * `deep` is not a free upgrade: it requires an explicit `budget.max_tokens`
 * (a deep context without a budget is rejected) and a model window of at least
 * `DEEP_MIN_CONTEXT`; a smaller window downgrades to `standard` with a reason,
 * never silently.
 */

export const CONTEXT_PROFILES = ["compact", "standard", "deep"] as const
export type ContextProfile = (typeof CONTEXT_PROFILES)[number]

/** A `deep` profile needs a model window at least this large (tokens). */
export const DEEP_MIN_CONTEXT = 512_000

/** The fraction of the model window each profile may occupy, before the reserved buffer. */
export const PROFILE_FRACTION: Record<ContextProfile, number> = {
  compact: 0.5,
  standard: 0.8,
  deep: 0.9,
}

export interface ResolvedContextProfile {
  /** The profile actually in effect (after any downgrade). */
  profile: ContextProfile
  /** The fraction of the window this profile may occupy. */
  fraction: number
  /** Set when the requested profile was not usable and a lower one is in effect. */
  downgradedFrom?: ContextProfile
  /** Why the downgrade happened — always populated when `downgradedFrom` is set. */
  reason?: string
}

/**
 * Validate the requested profile against the budget. Returns a human-readable
 * error string when the pair is not usable, or `null` when it is.
 *
 * The only rule today: `deep` requires a positive `budget.max_tokens`.
 */
export function validateContextProfile(input: {
  profile?: ContextProfile
  budgetMaxTokens?: number
}): string | null {
  if (input.profile !== "deep") return null
  if (input.budgetMaxTokens !== undefined && input.budgetMaxTokens > 0) return null
  return `context_profile "deep" requires budget.max_tokens — a deep context without a token budget is not allowed`
}

/**
 * Resolve the requested profile to the one in effect. Pure: the result depends
 * only on `requested`, `modelContext` and `budgetMaxTokens` — never on the turn
 * or the clock — so it cannot perturb the cache-friendly stable prefix.
 */
export function resolveContextProfile(input: {
  requested?: ContextProfile
  modelContext: number
  budgetMaxTokens?: number
}): ResolvedContextProfile {
  const requested = input.requested ?? "standard"

  if (requested === "deep") {
    const invalid = validateContextProfile({ profile: requested, budgetMaxTokens: input.budgetMaxTokens })
    if (invalid) {
      return {
        profile: "standard",
        fraction: PROFILE_FRACTION.standard,
        downgradedFrom: "deep",
        reason: invalid,
      }
    }
    if (input.modelContext < DEEP_MIN_CONTEXT) {
      return {
        profile: "standard",
        fraction: PROFILE_FRACTION.standard,
        downgradedFrom: "deep",
        reason: `deep context needs a model window of at least ${DEEP_MIN_CONTEXT} tokens; this model has ${input.modelContext}`,
      }
    }
  }

  return { profile: requested, fraction: PROFILE_FRACTION[requested] }
}

/** Short human label for the active profile (sidebar). */
export function profileLabel(profile: ContextProfile): string {
  return profile.charAt(0).toUpperCase() + profile.slice(1)
}
