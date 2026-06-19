// nocowboy_change - new file
/**
 * Kilo-specific overrides for the provider dialog.
 *
 * Exports constants and renderers consumed by the shared upstream
 * `dialog-provider.tsx` so the upstream diff stays minimal.
 */

import type { JSX } from "solid-js"
import type { RGBA } from "@opentui/core"
import type { ProviderAuthAuthorization } from "@nocowboy/sdk/v2"
// KiloAutoMethod removed — Kilo Gateway no longer supported

// ---------------------------------------------------------------------------
// Failed-state gutter/description helpers
// ---------------------------------------------------------------------------

/**
 * Returns a red `!` gutter element when the provider is in a failed auth state,
 * or `undefined` if not failed and not connected (falls through to default check).
 */
export function renderGutter(
  providerID: string,
  failed: string[],
  theme: { error: RGBA },
): (() => JSX.Element) | undefined {
  if (!failed.includes(providerID)) return undefined
  return () => <text fg={theme.error}>!</text>
}

/**
 * Returns a description suffix when the provider has encountered an error,
 * or `undefined` to leave the default description unchanged.
 *
 * NOTE: The sync state only carries failed provider IDs, not the error kind.
 * A generic message is used so it remains accurate for auth, network, and
 * schema failure types alike.
 */
export function failedDescription(providerID: string, failed: string[]): string | undefined {
  if (!failed.includes(providerID)) return undefined
  return "(connection error — click to reconnect)"
}

// ---------------------------------------------------------------------------
// Provider priority (replaces upstream map entirely)
// ---------------------------------------------------------------------------

export const PROVIDER_PRIORITY: Record<string, number> = {
  kilo: -1,
  anthropic: 0,
  "github-copilot": 1,
  openai: 2,
  google: 3,
}

// ---------------------------------------------------------------------------
// Provider descriptions shown next to the name in the selection list
// ---------------------------------------------------------------------------

export const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  kilo: "(Recommended)",
  anthropic: "(Claude Max or API key)",
  openai: "(ChatGPT login or API key)",
}

export const PROVIDER_TITLES: Record<string, string> = {
  openai: "OpenAI / Codex",
}

/** Local OpenAI-compatible providers where API key is optional (localhost). */
export const LOCAL_OPTIONAL_API_KEY = new Set(["atomic-chat", "lmstudio"])

export function isLocalOptionalApiKey(providerID: string) {
  return LOCAL_OPTIONAL_API_KEY.has(providerID)
}

export const LOCAL_API_KEY_PLACEHOLDER = "local"

// ---------------------------------------------------------------------------
// Auto-method renderer
// ---------------------------------------------------------------------------

/**
 * If the provider is Kilo Gateway, renders the custom `KiloAutoMethod`
 * component that handles device-auth + org selection.
 *
 * Returns `undefined` for every other provider so the caller can fall
 * through to the default `AutoMethod`.
 */
export function renderAutoMethod(): undefined {
  return undefined
}

// ---------------------------------------------------------------------------
// API-key dialog description
// ---------------------------------------------------------------------------

/**
 * Returns a custom description element for the API-key dialog when the
 * provider is Kilo Gateway. Returns `undefined` otherwise.
 */
export function renderApiDescription(
  providerID: string,
  theme: { textMuted: RGBA; text: RGBA; primary: RGBA },
): (() => JSX.Element) | undefined {
  if (providerID === "atomic-chat") {
    return () => (
      <text fg={theme.textMuted}>
        Connect to Atomic Chat on this machine (default http://127.0.0.1:1337). Leave API key empty for local server.
      </text>
    )
  }
  return undefined
}

export function apiKeyPlaceholder(providerID: string) {
  return isLocalOptionalApiKey(providerID) ? "Optional for localhost" : "API key"
}
