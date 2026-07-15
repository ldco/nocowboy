import type { NamedError } from "@nocowboy/core/util/error"
import { isRecord } from "@/util/record"

export const KILO_ERROR_CODES = {
  PAID_MODEL_AUTH_REQUIRED: "PAID_MODEL_AUTH_REQUIRED",
  PROMOTION_MODEL_LIMIT_REACHED: "PROMOTION_MODEL_LIMIT_REACHED",
} as const

export type KiloErrorCode = (typeof KILO_ERROR_CODES)[keyof typeof KILO_ERROR_CODES]

const KILO_ERROR_CODE_VALUES = Object.values(KILO_ERROR_CODES) as string[]

/**
 * Check if an error is a Kilo-specific error (has a known Kilo error code in responseBody).
 * Currently all Kilo errors are non-retryable, but this may change in the future.
 */
export function isNocowboyError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  return parseKiloErrorCode(error as ReturnType<NamedError["toObject"]>) !== undefined
}

/**
 * Get a user-friendly title for a Kilo error code.
 */
export function kiloErrorTitle(code: KiloErrorCode): string {
  switch (code) {
    case KILO_ERROR_CODES.PAID_MODEL_AUTH_REQUIRED:
      return "No API provider configured"
    case KILO_ERROR_CODES.PROMOTION_MODEL_LIMIT_REACHED:
      return "No API provider configured"
  }
}

/**
 * Get a user-friendly description for a Kilo error code.
 */
export function kiloErrorDescription(code: KiloErrorCode): string {
  switch (code) {
    case KILO_ERROR_CODES.PAID_MODEL_AUTH_REQUIRED:
      return "Add a provider (OpenAI, Anthropic, DeepSeek, etc.) in your configuration file to use this model."
    case KILO_ERROR_CODES.PROMOTION_MODEL_LIMIT_REACHED:
      return "Configure a provider to continue using this model. NoCowboy does not have a built-in account system."
  }
}

/**
 * Show a warning toast with the appropriate Kilo error title/description.
 * Caller should check isNocowboyError() first.
 */
export function showNocowboyErrorToast(
  error: ReturnType<NamedError["toObject"]>,
  toast: { show: (opts: { variant: "info" | "success" | "warning" | "error"; title: string; message: string; duration: number }) => void },
): void {
  const code = parseKiloErrorCode(error)
  if (!code) return
  toast.show({
    variant: "error",
    title: kiloErrorTitle(code),
    message: kiloErrorDescription(code),
    duration: 5000,
  })
}

/**
 * Extract the specific Kilo error code from an APIError's responseBody.
 * Returns the code string if found, undefined otherwise.
 *
 * Note: We check error.name === "APIError" directly instead of using
 * MessageV2.APIError.isInstance() to avoid a circular dependency
 * (message-v2.ts re-exports from this file).
 */
export function parseKiloErrorCode(error: ReturnType<NamedError["toObject"]>): KiloErrorCode | undefined {
  if (error.name !== "APIError") return undefined
  const responseBody = isRecord(error.data) ? error.data.responseBody : undefined
  if (typeof responseBody !== "string") return undefined
  try {
    const body = JSON.parse(responseBody)
    // Backend sends: { error: { code: "PAID_MODEL_AUTH_REQUIRED" } }
    // or: { code: "PROMOTION_MODEL_LIMIT_REACHED" }
    const code = body?.error?.code ?? body?.code
    if (typeof code === "string" && KILO_ERROR_CODE_VALUES.includes(code)) {
      return code as KiloErrorCode
    }
  } catch {}
  return undefined
}
