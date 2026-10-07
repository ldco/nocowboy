/**
 * Architectural layer detection — path rules → layer, with a colour legend.
 *
 * `GraphProvider.layer(file)` already classifies a path by configurable
 * `LayerRule`s (first match wins) and returns `null` for an unknown path — a
 * layer is never invented. This module supplies the default rule set
 * (API / Service / Data / UI) and the grouping + legend the dashboard renders,
 * so a consumer can go from a file list to per-layer groups without guessing.
 *
 * Pure: depends only on the graph provider contract.
 */

import { InMemoryGraphProvider, type GraphProvider } from "./index"
import type { LayerRule } from "./provider"

/**
 * Default rules, ordered specific → general; first match wins. The patterns are
 * anchored to path segments so `src/api/x.ts` is API but `src/rapid.ts` is not.
 */
export const DEFAULT_LAYER_RULES: readonly LayerRule[] = [
  { pattern: /(^|\/)(api|routes?|controllers?|handlers?|endpoints?)(\/|$|[._-])/i, layer: "API" },
  { pattern: /(^|\/)(services?|domain|usecases?|use-cases?|core|lib)(\/|$|[._-])/i, layer: "Service" },
  { pattern: /(^|\/)(db|database|repositories?|repos?|models?|entities|persistence|storage|schema)(\/|$|[._-])/i, layer: "Data" },
  { pattern: /(^|\/)(components?|ui|views?|pages?|screens?|tui|widgets?)(\/|$|[._-])/i, layer: "UI" },
]

/** The layer the dashboard shows for a file no rule matched. */
export const UNKNOWN_LAYER = "Unknown"

export interface LayerStyle {
  layer: string
  /** Hex colour for the dashboard legend. */
  color: string
}

/** Colour legend for the known layers plus the unknown bucket. */
export const LAYER_LEGEND: readonly LayerStyle[] = [
  { layer: "API", color: "#2563eb" },
  { layer: "Service", color: "#16a34a" },
  { layer: "Data", color: "#d97706" },
  { layer: "UI", color: "#db2777" },
  { layer: UNKNOWN_LAYER, color: "#6b7280" },
]

function colorFor(layer: string): string {
  return LAYER_LEGEND.find((entry) => entry.layer === layer)?.color ?? LAYER_LEGEND.at(-1)!.color
}

/** A graph provider whose `layer()` uses the default rules (or a caller's). */
export function defaultLayerProvider(rules: readonly LayerRule[] = DEFAULT_LAYER_RULES): GraphProvider {
  return new InMemoryGraphProvider({ layerRules: rules })
}

export interface LayerGroup {
  layer: string
  color: string
  files: string[]
}

/**
 * Group files by layer, in legend order, unknown last. Unknown paths are put in
 * the `Unknown` bucket — never invented into a real layer.
 */
export function groupByLayer(provider: GraphProvider, files: readonly string[]): LayerGroup[] {
  const buckets = new Map<string, string[]>()
  for (const file of files) {
    const layer = provider.layer(file) ?? UNKNOWN_LAYER
    const list = buckets.get(layer)
    if (list) list.push(file)
    else buckets.set(layer, [file])
  }
  const order = LAYER_LEGEND.map((entry) => entry.layer)
  return [...buckets.keys()]
    .sort((a, b) => {
      const ia = order.indexOf(a)
      const ib = order.indexOf(b)
      return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib) || a.localeCompare(b)
    })
    .map((layer) => ({ layer, color: colorFor(layer), files: buckets.get(layer)!.sort() }))
}
