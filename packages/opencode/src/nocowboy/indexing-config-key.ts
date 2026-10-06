/**
 * Indexing-config change detector.
 *
 * The indexing entry is cached by directory and built from the config read at
 * boot. Before this, a config write was invisible: `KiloIndexing` never re-read
 * the config, so changing `indexing.vectorStore` (or provider/model) saved the
 * field but kept indexing on the old backend until a full restart.
 *
 * This pure module projects an `IndexingConfig` down to the fields whose change
 * invalidates the persisted vectors, so a config event can decide — cheaply and
 * deterministically — whether a rebuild is actually needed. Tuning-only fields
 * (searchMinScore, batch sizes, …) must NOT trigger a reindex.
 */

import type { IndexingConfig } from "@nocowboy/indexing/config"

/** The indexing fields that require a rebuild when they change. */
export function indexingConfigKey(cfg: IndexingConfig | undefined): string {
  const c = cfg ?? {}
  return JSON.stringify({
    enabled: c.enabled ?? false,
    provider: c.provider ?? null,
    model: c.model ?? null,
    dimension: c.dimension ?? null,
    vectorStore: c.vectorStore ?? null,
    lancedb: c.lancedb ?? null,
    qdrant: c.qdrant ?? null,
  })
}

/** True when the effective indexing config changed in a way that needs a rebuild. */
export function indexingConfigChanged(a: IndexingConfig | undefined, b: IndexingConfig | undefined): boolean {
  return indexingConfigKey(a) !== indexingConfigKey(b)
}

