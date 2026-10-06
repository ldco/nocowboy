/**
 * Knowledge-graph provider contract — the small, stable seam consumers depend on.
 *
 * `diff-impact-analysis` and `arch-layer-detection` need a graph, but they must
 * never hard-depend on a heavyweight AST engine. They depend on THIS contract,
 * which the in-memory fallback (`memory.ts`) already satisfies. A future
 * tree-sitter provider (`knowledge-graph-ast-engine`) replaces the *filling* of
 * the graph — `snapshot()` — without touching a single consumer.
 *
 * Every edge carries `confidence`: `exact` when the relation came from a
 * resolvable identifier, `heuristic` when it was inferred. Consumers must not
 * silently treat a heuristic edge as exact, and an ambiguous basename must not
 * be resolved to a single file (see `InMemoryGraphProvider.resolve`).
 */

export type EdgeConfidence = "exact" | "heuristic"

export type NodeKind = "file" | "symbol" | "module"

export type EdgeKind = "import" | "call" | "contains"

export interface GraphNode {
  /** Stable identity: normally the repo-relative path, or `path#symbol`. */
  id: string
  kind: NodeKind
  /** Repo-relative path of the file this node belongs to. */
  path: string
  /** Symbol name when `kind` is `"symbol"`. */
  name?: string
}

export interface GraphEdge {
  /** Source node id (the importer / caller). */
  from: string
  /** Target node id (the imported / called). */
  to: string
  kind: EdgeKind
  confidence: EdgeConfidence
}

export interface GraphSnapshot {
  nodes: GraphNode[]
  edges: GraphEdge[]
  /** Where the graph came from. `memory` until the AST engine lands. */
  source: "memory" | "ast"
  /** Epoch ms when the snapshot was produced; 0 for a never-built graph. */
  generatedAt: number
}

/** A file reachable from a change, with hop distance and worst-case confidence. */
export interface ImpactedFile {
  file: string
  distance: number
  confidence: EdgeConfidence
}

/** A path rule for architectural layer classification. First match wins. */
export interface LayerRule {
  pattern: RegExp
  layer: string
}

/**
 * The one interface consumers bind to. Implementations are total: a graph that
 * has not been built yet returns empty structures, never throws.
 */
export interface GraphProvider {
  /** Current graph. Always a valid snapshot, possibly empty. */
  snapshot(): GraphSnapshot
  /** Files impacted by a change set, nearest first. Unknown input → `[]`. */
  impacted(changedFiles: readonly string[], depth?: number): ImpactedFile[]
  /** Architectural layer for a path, or `null` when no rule matches. */
  layer(file: string): string | null
}

/** The safe zero value: a valid, empty, never-built graph. */
export const EMPTY_GRAPH_SNAPSHOT: GraphSnapshot = {
  nodes: [],
  edges: [],
  source: "memory",
  generatedAt: 0,
}
