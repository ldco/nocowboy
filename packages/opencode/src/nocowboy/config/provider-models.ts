/**
 * Tolerant decoding of provider model entries.
 *
 * A provider's `models` map is strict: one malformed entry (a wrong type on any
 * field) would fail the whole config decode and take every other provider down
 * with it. A user typo in one model should not brick the config, so we drop the
 * bad entry, keep the rest, and report exactly which one was dropped and why.
 *
 * Pure: no engine, no I/O. Used by the config loader before the strict decode.
 */

import { Cause, Exit, Schema } from "effect"
import { ConfigProvider } from "@/config/provider"

export interface ModelEntryError {
  provider: string
  model: string
  /** Why the entry was rejected (the schema decode failure, in words). */
  message: string
}

function describeCause(cause: Cause.Cause<unknown>): string {
  const squashed = Cause.squash(cause)
  return squashed instanceof Error ? squashed.message : String(squashed)
}

/**
 * Drop malformed entries from one provider's `models` map.
 *
 * - `null` is a valid marker (model disabled) and is kept;
 * - a value that decodes against `ConfigProvider.Model` is kept;
 * - anything else is dropped and reported.
 */
export function sanitizeProviderModels(input: unknown): { models: Record<string, unknown>; errors: Omit<ModelEntryError, "provider">[] } {
  const models: Record<string, unknown> = {}
  const errors: Omit<ModelEntryError, "provider">[] = []
  if (!input || typeof input !== "object" || Array.isArray(input)) return { models, errors }

  for (const [model, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === null) {
      models[model] = null
      continue
    }
    const decoded = Schema.decodeUnknownExit(ConfigProvider.Model)(value)
    if (Exit.isSuccess(decoded)) {
      models[model] = value
      continue
    }
    errors.push({ model, message: describeCause(decoded.cause) })
  }
  return { models, errors }
}

/**
 * Walk a config object's `provider[*].models` and drop every malformed entry,
 * mutating the (already shallow-copied) config in place. Returns one error per
 * dropped entry so the caller can surface it.
 */
export function sanitizeProviderConfig(config: Record<string, unknown>): ModelEntryError[] {
  const errors: ModelEntryError[] = []
  const provider = config.provider
  if (!provider || typeof provider !== "object" || Array.isArray(provider)) return errors

  for (const [providerID, entry] of Object.entries(provider as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue
    const info = entry as Record<string, unknown>
    if (!("models" in info)) continue
    const { models, errors: local } = sanitizeProviderModels(info.models)
    info.models = models
    for (const error of local) errors.push({ provider: providerID, ...error })
  }
  return errors
}
