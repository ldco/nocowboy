/**
 * Vector-store availability gate.
 *
 * Switching the indexing backend is not a free config write: the vectors live in
 * a specific backend with a specific dimension, so an unreachable backend would
 * leave the user with a saved setting that can never index. The dialog used to
 * persist `qdrant` even with an empty URL. This pure module decides — before the
 * write — whether a backend is usable, so the caller can refuse to save an
 * unavailable one and show why. Pure so it is unit-testable without a TUI.
 */

import type { IndexingConfig } from "@nocowboy/sdk/v2"

export const VECTOR_STORES = ["lancedb", "qdrant"] as const
export type VectorStore = (typeof VECTOR_STORES)[number]

export type VectorStoreCheck = { ok: true } | { ok: false; reason: string }

export function isVectorStore(value: string): value is VectorStore {
  return (VECTOR_STORES as readonly string[]).includes(value)
}

/**
 * Is `store` usable with this configuration? `lancedb` runs embedded (a
 * directory is optional — it falls back to the default), so it is always
 * available. `qdrant` is a remote server and needs a valid URL.
 */
export function checkVectorStore(store: string, indexing: IndexingConfig): VectorStoreCheck {
  if (store === "lancedb") return { ok: true }
  if (store === "qdrant") {
    const url = indexing.qdrant?.url?.trim()
    if (!url) return { ok: false, reason: "Qdrant requires a URL" }
    try {
      new URL(url)
    } catch {
      return { ok: false, reason: `Qdrant URL is not valid: ${url}` }
    }
    return { ok: true }
  }
  return { ok: false, reason: `Unknown vector store: ${store}` }
}

/** Switching to a different backend invalidates the existing index (rebuild required). */
export function needsRebuild(current: string, next: string): boolean {
  return current !== next
}

// ---------------------------------------------------------------------------
// Rollback — keep the previous backend when the rebuild fails
// ---------------------------------------------------------------------------

export type IndexingHealth = "ok" | "building" | "error"

export interface BackendSwitch {
  previous: string
  next: string
}

/**
 * The backend to revert to, or undefined to keep the new one. Only a terminal
 * `error` reverts; a slow-but-healthy build (`building`) never does, so a slow
 * index is not mistaken for a failed one.
 */
export function rollbackTarget(sw: BackendSwitch | undefined, health: IndexingHealth): string | undefined {
  if (!sw) return undefined
  return health === "error" ? sw.previous : undefined
}

export interface WatchRollbackDeps {
  /** Persist a backend (used only for the revert). */
  apply: (backend: string) => Promise<void>
  /** Read the indexing health after the switch. */
  health: () => Promise<IndexingHealth>
  sleep: (ms: number) => Promise<void>
  /** Maximum polls before giving up (keep the new backend, no revert). */
  attempts: number
  intervalMs: number
}

export type RollbackOutcome = { status: "applied" | "reverted"; backend: string }

/**
 * Watch a switch that has already been applied: poll the indexing health, and
 * if it reaches a terminal error, revert to the previous backend. On exhaustion
 * (still building) the new backend is kept — never revert a healthy slow build.
 */
export async function watchRollback(sw: BackendSwitch, deps: WatchRollbackDeps): Promise<RollbackOutcome> {
  for (let i = 0; i < deps.attempts; i++) {
    const health = await deps.health()
    const revert = rollbackTarget(sw, health)
    if (revert !== undefined) {
      await deps.apply(revert)
      return { status: "reverted", backend: revert }
    }
    if (health === "ok") return { status: "applied", backend: sw.next }
    if (i < deps.attempts - 1) await deps.sleep(deps.intervalMs)
  }
  return { status: "applied", backend: sw.next }
}

/** Apply the switch, then {@link watchRollback} it. */
export async function applyWithRollback(sw: BackendSwitch, deps: WatchRollbackDeps): Promise<RollbackOutcome> {
  await deps.apply(sw.next)
  return watchRollback(sw, deps)
}

