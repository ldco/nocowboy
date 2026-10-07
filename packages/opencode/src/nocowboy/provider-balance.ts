// nocowboy_change — shared balance-fetching module with in-memory cache
// Extracted from sidebar/context.tsx and subagent-footer.tsx to eliminate duplication.

import { appendFileSync } from "node:fs"
import { joinURL, requestInit, resolveProviderPort } from "./provider/port"

const BLOG = "/tmp/nocowboy-balance.log"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BalanceColor = "success" | "warning" | "error"

export interface BalanceThresholds {
  /** Below this amount → warning (yellow). Default: 10 */
  warning: number
  /** Below this amount → error (red). Default: 3 */
  error: number
}

/** A registered provider that supports balance API. */
export interface BalanceProviderDescriptor {
  /** Canonical provider id (e.g. "deepseek") */
  id: string
  /** Return true if this descriptor handles the given provider/model. */
  match: (providerID: string, modelID: string) => boolean
  /** Fetch the current USD balance. Returns 0 on failure. */
  fetch: (apiKey: string, baseURL?: string) => Promise<number>
  /** Human-readable label shown in the UI. */
  label: string
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const registry: BalanceProviderDescriptor[] = []

/** Register a provider that supports balance API. */
export function registerBalanceProvider(p: BalanceProviderDescriptor): void {
  const existing = registry.findIndex((x) => x.id === p.id)
  if (existing >= 0) registry[existing] = p
  else registry.push(p)
}

/** Get a readonly snapshot of the registry (for testing). */
export function getBalanceProviders(): readonly BalanceProviderDescriptor[] {
  return registry
}

// ---------------------------------------------------------------------------
// Built-in providers
// ---------------------------------------------------------------------------

registerBalanceProvider({
  id: "deepseek",
  match: (pid, mid) => pid === "deepseek" || mid.toLowerCase().includes("deepseek"),
  label: "DeepSeek",
  fetch: async (apiKey: string, baseURL?: string): Promise<number> => {
    try {
      const port = resolveProviderPort({ id: "deepseek", baseURL })
      const url = joinURL(port.transport.baseURL, "https://api.deepseek.com", "/user/balance")
      const res = await fetch(url, requestInit(port, { Authorization: `Bearer ${apiKey}` }))
      if (!res.ok) {
        appendFileSync(BLOG, `${new Date().toISOString()} DEEPSEEK status=${res.status}\n`)
        return 0
      }
      const raw = await res.text()
      appendFileSync(BLOG, `${new Date().toISOString()} DEEPSEEK raw=${raw.substring(0, 500)}\n`)
      const data = JSON.parse(raw) as { balance_infos?: Array<{ currency: string; total_balance: string }> }
      const usd = (data.balance_infos ?? []).find((b) => b.currency === "USD")
      return usd ? parseFloat(usd.total_balance) : 0
    } catch (e: any) {
      appendFileSync(BLOG, `${new Date().toISOString()} DEEPSEEK err=${e?.message}\n`)
      return 0
    }
  },
})

registerBalanceProvider({
  id: "kimi",
  match: (pid, mid) => {
    const lower = pid.toLowerCase()
    return (
      lower === "kimi" ||
      lower === "moonshotai" ||
      lower === "moonshotai-cn" ||
      mid.toLowerCase().includes("kimi") ||
      mid.toLowerCase().includes("moonshot") ||
      mid.toLowerCase().includes("k2p")
    )
  },
  label: "Kimi",
  fetch: async (apiKey: string, baseURL?: string): Promise<number> => {
    try {
      const port = resolveProviderPort({ id: "kimi", baseURL })
      const url = joinURL(port.transport.baseURL, "https://api.moonshot.ai", "/v1/users/me/balance")
      const res = await fetch(url, requestInit(port, { Authorization: `Bearer ${apiKey}` }))
      if (!res.ok) {
        appendFileSync(BLOG, `${new Date().toISOString()} KIMI status=${res.status}\n`)
        return 0
      }
      const raw = await res.text()
      appendFileSync(BLOG, `${new Date().toISOString()} KIMI raw=${raw.substring(0, 500)}\n`)
      const data = JSON.parse(raw) as { data?: { available_balance?: number } }
      return data.data?.available_balance ?? 0
    } catch (e: any) {
      appendFileSync(BLOG, `${new Date().toISOString()} KIMI err=${e?.message}\n`)
      return 0
    }
  },
})

registerBalanceProvider({
  id: "openrouter",
  // OpenRouter is a router: the active provider must be openrouter regardless of
  // which upstream model (e.g. deepseek/*) is selected, so match on the provider
  // id only.
  match: (pid) => pid.toLowerCase() === "openrouter",
  label: "OpenRouter",
  fetch: async (apiKey: string, baseURL?: string): Promise<number> => {
    try {
      const port = resolveProviderPort({ id: "openrouter", baseURL })
      const base = port.transport.baseURL
      // The OpenAI-compatible base is https://openrouter.ai/api/v1; tolerate a
      // custom base that already points at the API root.
      const url = base
        ? base.endsWith("/api/v1") || base.endsWith("/v1")
          ? `${base}/credits`
          : `${base}/api/v1/credits`
        : "https://openrouter.ai/api/v1/credits"
      const res = await fetch(url, requestInit(port, { Authorization: `Bearer ${apiKey}` }))
      if (!res.ok) {
        appendFileSync(BLOG, `${new Date().toISOString()} OPENROUTER status=${res.status}\n`)
        return 0
      }
      const raw = await res.text()
      appendFileSync(BLOG, `${new Date().toISOString()} OPENROUTER raw=${raw.substring(0, 500)}\n`)
      const data = JSON.parse(raw) as { data?: { total_credits?: number; total_usage?: number } }
      const credits = data.data?.total_credits ?? 0
      const usage = data.data?.total_usage ?? 0
      return Math.max(0, credits - usage)
    } catch (e: any) {
      appendFileSync(BLOG, `${new Date().toISOString()} OPENROUTER err=${e?.message}\n`)
      return 0
    }
  },
})

// ---------------------------------------------------------------------------
// Cache (in-memory, 5-minute TTL)
// ---------------------------------------------------------------------------
const cacheTTL = 5 * 60 * 1000 // 5 minutes

const balanceCache = new Map<string, { value: number; ts: number }>()

function cacheKey(providerID: string, apiKey: string): string {
  // Use providerID + first 8 chars of apiKey for caching
  return `${providerID}:${apiKey.slice(0, 8)}`
}

/** Read cached balance. Returns undefined if missing or expired. */
function cachedBalance(key: string): number | undefined {
  const entry = balanceCache.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.ts > cacheTTL) {
    balanceCache.delete(key)
    return undefined
  }
  return entry.value
}

function setCachedBalance(key: string, value: number): void {
  balanceCache.set(key, { value, ts: Date.now() })
}

/**
 * Clear the entire balance cache (e.g. on provider change).
 */
export function clearBalanceCache(): void {
  balanceCache.clear()
}

// ---------------------------------------------------------------------------
// Peak pricing (DeepSeek peak-valley pricing since mid-July 2026)
// ---------------------------------------------------------------------------

/**
 * Peak hours in UTC:
 *   Window 1: 01:00 – 04:00
 *   Window 2: 06:00 – 10:00
 *
 * During peak hours, DeepSeek prices are 2× regular.
 * There is no API endpoint to query current pricing tier —
 * it's determined purely by the clock.
 */
const PEAK_WINDOWS: Array<{ start: number; end: number }> = [
  { start: 1, end: 4 },  // 01:00-04:00 UTC
  { start: 6, end: 10 }, // 06:00-10:00 UTC
]

export interface PeakPricingInfo {
  /** true if current UTC time falls within a peak window */
  isPeak: boolean
  /** Price multiplier (1 = normal, 2 = peak) */
  multiplier: number
  /** Human-readable label */
  label: string
  /** Seconds until next non-peak (if currently peak) or next peak (if currently off-peak) */
  secondsUntilChange: number
}

/**
 * Check if the given UTC hour is within peak pricing.
 */
function isPeakHour(utcHour: number): boolean {
  return PEAK_WINDOWS.some((w) => utcHour >= w.start && utcHour < w.end)
}

/**
 * Get seconds from `utcNow` until the next peak window starts (if currently
 * off-peak) or the current peak window ends (if currently peak).
 */
function secondsUntilNextChange(utcNow: Date): number {
  const hour = utcNow.getUTCHours()
  const minute = utcNow.getUTCMinutes()
  const second = utcNow.getUTCSeconds()
  const currentTotal = hour * 3600 + minute * 60 + second

  // All interesting timestamps in seconds-from-midnight-UTC
  const boundaries = PEAK_WINDOWS.flatMap((w) => [w.start * 3600, w.end * 3600])

  // If currently peak, find the end of this window
  const currentPeak = PEAK_WINDOWS.find((w) => hour >= w.start && hour < w.end)
  if (currentPeak) {
    const endSec = currentPeak.end * 3600
    return endSec - currentTotal
  }

  // Off-peak — find next peak start
  for (const b of boundaries) {
    if (b > currentTotal) return b - currentTotal
  }
  // No peak tomorrow? Wrap to first peak of next day
  return 86400 - currentTotal + PEAK_WINDOWS[0].start * 3600
}

/**
 * Get peak pricing info for the current time.
 */
export function getPeakPricing(now?: Date): PeakPricingInfo {
  const utcNow = now ?? new Date()
  const hour = utcNow.getUTCHours()
  const isPeak = isPeakHour(hour)

  return {
    isPeak,
    multiplier: isPeak ? 2 : 1,
    label: isPeak ? "×2 peak" : "×1 normal",
    secondsUntilChange: secondsUntilNextChange(utcNow),
  }
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

const defaultThresholds: BalanceThresholds = { warning: 10, error: 3 }

/**
 * Map a USD balance to a theme color name.
 *
 * Default thresholds (configurable):
 *  - balance >  warning  → success (green)
 *  - balance >= error    → warning (yellow)
 *  - balance <  error    → error   (red)
 */
export function getBalanceColor(balance: number, thresholds?: BalanceThresholds): BalanceColor {
  const t = thresholds ?? defaultThresholds
  if (balance > t.warning) return "success"
  if (balance >= t.error) return "warning"
  return "error"
}

/**
 * Find a registered provider descriptor that matches the given providerID or modelID.
 *
 * A direct provider-id match always wins over a model-name match, so a routed
 * provider such as OpenRouter reports its own balance even when it serves a
 * model (e.g. deepseek/*) that another descriptor would otherwise claim.
 * Returns null if no balance provider supports this combination.
 */
export function findBalanceDescriptor(providerID: string, modelID: string): BalanceProviderDescriptor | null {
  const direct = registry.find((bp) => sameProvider(bp.id, providerID))
  if (direct) return direct
  return registry.find((bp) => bp.match(providerID, modelID)) ?? null
}

/** Provider ids are compared case-insensitively everywhere (matches the lowercased `match()` predicates). */
function sameProvider(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

/**
 * Find the actual Provider (from the configured providers list) that corresponds
 * to a balance-aware provider, given the current providerID and modelID.
 *
 * This performs two-level matching:
 *  1. Direct match: current provider IS a known balance provider
 *  2. Model-based match: model name contains a known balance provider keyword
 */
export function findBalanceProvider(
  providers: ReadonlyArray<{ id: string; key?: string; name?: string; options?: { baseURL?: string; baseUrl?: string } }>,
  currentPID: string,
  currentModelID: string,
): { providerID: string; apiKey: string; name: string; baseURL?: string } | null {
  const descriptor = findBalanceDescriptor(currentPID, currentModelID)
  if (!descriptor) return null

  // Direct match: current provider IS a known balance provider
  if (descriptor.match(currentPID, currentModelID) && sameProvider(descriptor.id, currentPID)) {
    for (const p of providers) {
      if (sameProvider(p.id, currentPID) && p.key) {
        return {
          providerID: p.id,
          apiKey: p.key,
          name: p.name ?? p.id,
          baseURL: p.options?.baseURL ?? p.options?.baseUrl,
        }
      }
    }
  }

  // Model-based match: find the provider that owns this model
  const descriptorID = descriptor.id.toLowerCase()
  for (const p of providers) {
    const lower = (p.id + (p.name ?? "")).toLowerCase()
    if (lower.includes(descriptorID) && p.key) {
      return {
        providerID: p.id,
        apiKey: p.key,
        name: p.name ?? p.id,
        baseURL: p.options?.baseURL ?? p.options?.baseUrl,
      }
    }
  }

  return null
}

/**
 * Fetch the balance for a known balance provider.
 *
 * Uses the in-memory cache (5-minute TTL). On cache miss, calls the
 * provider's fetch function and caches the result.
 *
 * Returns 0 on any failure (network error, missing API key, etc.).
 */
export async function fetchBalance(providerID: string, apiKey: string, baseURL?: string): Promise<number> {
  if (!apiKey) return 0

  const ck = cacheKey(providerID.toLowerCase(), apiKey)
  const cached = cachedBalance(ck)
  if (cached !== undefined) return cached

  const desc = registry.find((bp) => sameProvider(bp.id, providerID))
  if (!desc) return 0

  const value = await desc.fetch(apiKey, baseURL)
  setCachedBalance(ck, value)
  return value
}
