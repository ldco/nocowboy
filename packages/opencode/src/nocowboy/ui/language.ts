/**
 * Language resolution for the TUI.
 *
 * The active language comes from two places: the TUI's own config (`tui.json`,
 * per-TUI) and the synced project config (`nocowboy.json`, persisted by the
 * language switcher). The TUI config wins so a machine/terminal can pin a
 * language, and the synced value is the fallback. Pure and reactive-free, so the
 * precedence is unit-testable without SolidJS.
 */

export const LANGUAGES = ["ru", "en"] as const
export type Language = (typeof LANGUAGES)[number]

export const DEFAULT_LANGUAGE: Language = "en"

/** True when `value` is one of the supported languages. */
export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value)
}

/**
 * Resolve the active language:
 *   1. the TUI config (`lang` in tui.json);
 *   2. the synced project config (`lang` in nocowboy.json);
 *   3. the default (`en`).
 * Unsupported values at either level are ignored.
 */
export function resolveLanguage(input: { tui?: unknown; config?: unknown; fallback?: Language }): Language {
  if (isLanguage(input.tui)) return input.tui
  if (isLanguage(input.config)) return input.config
  return input.fallback ?? DEFAULT_LANGUAGE
}
