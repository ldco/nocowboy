/**
 * Architecture summary — a textual overview of an AST graph.
 *
 * `knowledge-graph-ast-engine` fills the graph; this turns it into something a
 * human (or an LLM prompt) can read: how many files/symbols/edges, how the files
 * spread across architectural layers, and which symbols are the busiest hubs
 * (most inbound edges). The deterministic part — {@link graphOutline} and
 * {@link renderOutline} — is pure and testable. The narrative is produced by an
 * INJECTED `llm`, so the module never reaches into a provider/model itself and
 * is unit-testable with a stub. Results are cached by a deterministic graph hash
 * so re-summarizing an unchanged graph is free.
 *
 * Pure + injectable: no engine, no I/O, no provider import.
 */

import { DEFAULT_LAYER_RULES, UNKNOWN_LAYER } from "./layers"
import type { GraphSnapshot, LayerRule } from "./provider"

/** A deterministic, structural view of a graph — the basis of a summary. */
export interface ArchitectureOutline {
  files: number
  symbols: number
  edges: { import: number; call: number; contains: number }
  /** File count per architectural layer (unknown bucket included). */
  layers: Record<string, number>
  /** Symbols/files with the most inbound edges, busiest first. */
  hubs: Array<{ id: string; inbound: number }>
}

export interface OutlineOptions {
  /** How many hubs to report (default 5). */
  topHubs?: number
  /** Layer rules; defaults to {@link DEFAULT_LAYER_RULES}. */
  layerRules?: readonly LayerRule[]
}

function layerOf(path: string, rules: readonly LayerRule[]): string {
  for (const rule of rules) if (rule.pattern.test(path)) return rule.layer
  return UNKNOWN_LAYER
}

/** Compute the structural outline of a snapshot. Pure and deterministic. */
export function graphOutline(snapshot: GraphSnapshot, options: OutlineOptions = {}): ArchitectureOutline {
  const rules = options.layerRules ?? DEFAULT_LAYER_RULES
  const topHubs = options.topHubs ?? 5

  let files = 0
  let symbols = 0
  const layers: Record<string, number> = {}
  for (const node of snapshot.nodes) {
    if (node.kind === "file") {
      files++
      const layer = layerOf(node.path, rules)
      layers[layer] = (layers[layer] ?? 0) + 1
    } else if (node.kind === "symbol") {
      symbols++
    }
  }

  const edges = { import: 0, call: 0, contains: 0 }
  const inbound = new Map<string, number>()
  for (const edge of snapshot.edges) {
    if (edge.kind in edges) edges[edge.kind as keyof typeof edges]++
    inbound.set(edge.to, (inbound.get(edge.to) ?? 0) + 1)
  }

  const known = new Set(snapshot.nodes.map((node) => node.id))
  const hubs = [...inbound.entries()]
    .filter(([id]) => known.has(id))
    .map(([id, count]) => ({ id, inbound: count }))
    .sort((a, b) => b.inbound - a.inbound || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, Math.max(0, topHubs))

  return { files, symbols, edges, layers, hubs }
}

/** Render an outline as a stable, LLM-friendly text block. Pure. */
export function renderOutline(outline: ArchitectureOutline): string {
  const layers = Object.entries(outline.layers)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([layer, count]) => `  - ${layer}: ${count}`)
    .join("\n")
  const hubs = outline.hubs.map((hub) => `  - ${hub.id} (${hub.inbound} inbound)`).join("\n")
  return [
    "Project architecture (from the static dependency graph):",
    `Files: ${outline.files}; symbols: ${outline.symbols}`,
    `Edges — import: ${outline.edges.import}, call: ${outline.edges.call}, contains: ${outline.edges.contains}`,
    "Files per layer:",
    layers || "  (none)",
    "Busiest symbols (most inbound edges):",
    hubs || "  (none)",
  ].join("\n")
}

function fnv1a(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}

/**
 * A deterministic identity of a graph's structure: node ids and edge triples,
 * order-independent. Two snapshots with the same structure hash the same, so the
 * summary cache is keyed by structure, not by object identity or build time.
 */
export function graphHash(snapshot: GraphSnapshot): string {
  const nodes = snapshot.nodes.map((node) => `${node.kind}:${node.id}`).sort()
  const edges = snapshot.edges.map((edge) => `${edge.kind}:${edge.from}>${edge.to}:${edge.confidence}`).sort()
  return `kg1-${fnv1a(nodes.join("|"))}-${fnv1a(edges.join("|"))}-${nodes.length}-${edges.length}`
}

export interface ArchitectureSummary {
  /** The narrative, from the injected summarizer (or the cache). */
  summary: string
  /** The structural facts the summary is based on. */
  outline: ArchitectureOutline
  /** True when the summary was served from the cache (the llm was not called). */
  cached: boolean
}

export interface SummarizeDeps {
  /** The LLM seam. Given the rendered outline, return the narrative. Injected. */
  llm: (prompt: string, outline: ArchitectureOutline) => Promise<string>
  /** Cache keyed by {@link graphHash}; callers may share one across graphs. */
  cache?: Map<string, string>
  /** Forwarded to {@link graphOutline}. */
  outline?: OutlineOptions
}

/**
 * Produce an architecture summary for a snapshot: build the outline, render the
 * prompt, and either return the cached narrative or ask the injected `llm`. Never
 * touches a provider itself — the caller owns the model call.
 */
export async function summarizeArchitecture(
  snapshot: GraphSnapshot,
  deps: SummarizeDeps,
): Promise<ArchitectureSummary> {
  const outline = graphOutline(snapshot, deps.outline)
  const key = graphHash(snapshot)
  const cachedSummary = deps.cache?.get(key)
  if (cachedSummary !== undefined) return { summary: cachedSummary, outline, cached: true }

  const summary = await deps.llm(renderOutline(outline), outline)
  deps.cache?.set(key, summary)
  return { summary, outline, cached: false }
}
