/**
 * In-memory GraphProvider — the safe fallback that unblocks graph consumers.
 *
 * It holds a snapshot that whoever owns graph construction fills in (today an
 * importer or an ad-hoc seed; later the AST engine). Every method is total:
 * missing, malformed, or ambiguous input yields an empty/`null` result rather
 * than throwing, so a caller with no built graph still gets valid answers.
 */

import {
  type EdgeConfidence,
  type GraphEdge,
  type GraphNode,
  type GraphProvider,
  type GraphSnapshot,
  type ImpactedFile,
  type LayerRule,
} from "./provider"

/** Traversal depth when a caller does not pass one. Bounded on purpose. */
export const DEFAULT_IMPACT_DEPTH = 2

const NODE_KINDS = new Set(["file", "symbol", "module"])
const EDGE_KINDS = new Set(["import", "call", "contains"])
const CONFIDENCES = new Set(["exact", "heuristic"])

export interface InMemoryGraphOptions {
  /** Seed graph; malformed nodes/edges are dropped, not trusted. */
  snapshot?: Partial<GraphSnapshot>
  /** Path rules for `layer()`. First match wins; empty → always `null`. */
  layerRules?: readonly LayerRule[]
  /** Hard ceiling on traversal depth so a deep request cannot walk forever. */
  maxDepth?: number
}

export class InMemoryGraphProvider implements GraphProvider {
  private readonly nodes: GraphNode[]
  private readonly edges: GraphEdge[]
  private readonly source: "memory" | "ast"
  private readonly generatedAt: number
  private readonly layerRules: readonly LayerRule[]
  private readonly maxDepth: number

  /** `to` → edges pointing at it, for reverse (importer) traversal. */
  private readonly reverse: Map<string, GraphEdge[]>
  private readonly byId: Map<string, GraphNode>
  /** basename → nodes, used to detect ambiguity instead of guessing. */
  private readonly byBasename: Map<string, GraphNode[]>

  constructor(options: InMemoryGraphOptions = {}) {
    const seed = options.snapshot
    this.nodes = Array.isArray(seed?.nodes) ? seed!.nodes.filter(isNode) : []
    this.edges = Array.isArray(seed?.edges) ? seed!.edges.filter(isEdge) : []
    this.source = seed?.source === "ast" ? "ast" : "memory"
    this.generatedAt = typeof seed?.generatedAt === "number" ? seed.generatedAt : 0
    this.layerRules = Array.isArray(options.layerRules) ? options.layerRules : []
    this.maxDepth = clampDepth(options.maxDepth)

    this.reverse = new Map()
    for (const edge of this.edges) {
      const list = this.reverse.get(edge.to)
      if (list) list.push(edge)
      else this.reverse.set(edge.to, [edge])
    }

    this.byId = new Map()
    for (const node of this.nodes) this.byId.set(node.id, node)

    this.byBasename = new Map()
    for (const node of this.nodes) {
      const base = basename(node.path)
      const list = this.byBasename.get(base)
      if (list) list.push(node)
      else this.byBasename.set(base, [node])
    }
  }

  /** Always a fresh copy — callers cannot mutate the provider's state. */
  snapshot(): GraphSnapshot {
    return {
      nodes: this.nodes.map((node) => ({ ...node })),
      edges: this.edges.map((edge) => ({ ...edge })),
      source: this.source,
      generatedAt: this.generatedAt,
    }
  }

  /**
   * Walk reverse (import) edges out to `depth`. A result reachable only through
   * heuristic edges is itself `heuristic`. The changed files themselves are not
   * reported as impacted.
   */
  impacted(changedFiles: readonly string[], depth: number = DEFAULT_IMPACT_DEPTH): ImpactedFile[] {
    if (!Array.isArray(changedFiles) || changedFiles.length === 0) return []
    const limit = Math.min(clampDepth(depth), this.maxDepth)
    if (limit <= 0) return []

    const starts = new Set<string>()
    for (const changed of changedFiles) {
      const node = this.resolve(changed)
      if (node) starts.add(node.id)
    }
    if (starts.size === 0) return []

    const best = new Map<string, ImpactedFile>()
    const queue: { id: string; distance: number; confidence: EdgeConfidence }[] = []
    for (const id of starts) queue.push({ id, distance: 0, confidence: "exact" })

    while (queue.length > 0) {
      const current = queue.shift()!
      for (const edge of this.reverse.get(current.id) ?? []) {
        const confidence: EdgeConfidence =
          current.confidence === "heuristic" || edge.confidence === "heuristic" ? "heuristic" : "exact"
        const distance = current.distance + 1
        const node = this.byId.get(edge.from)
        if (!node || starts.has(node.id)) continue
        const existing = best.get(node.id)
        if (existing && existing.distance <= distance) continue
        best.set(node.id, { file: node.path, distance, confidence })
        if (distance < limit) queue.push({ id: node.id, distance, confidence })
      }
    }

    return [...best.values()].sort((a, b) => a.distance - b.distance || a.file.localeCompare(b.file))
  }

  layer(file: string): string | null {
    if (typeof file !== "string" || file.length === 0) return null
    const normalized = file.replace(/\\/g, "/")
    for (const rule of this.layerRules) {
      if (rule.pattern.test(normalized)) return rule.layer
    }
    return null
  }

  /**
   * Resolve a changed-file reference to exactly one node. Never guesses: a
   * basename that matches more than one node is treated as unresolved.
   */
  private resolve(ref: string): GraphNode | undefined {
    if (typeof ref !== "string" || ref.length === 0) return undefined
    const normalized = ref.replace(/\\/g, "/")
    const byId = this.byId.get(normalized)
    if (byId) return byId
    for (const node of this.nodes) {
      if (node.path === normalized) return node
    }
    const candidates = this.byBasename.get(basename(normalized))
    return candidates && candidates.length === 1 ? candidates[0] : undefined
  }
}

function basename(path: string): string {
  const clean = path.replace(/\\/g, "/")
  const index = clean.lastIndexOf("/")
  return index === -1 ? clean : clean.slice(index + 1)
}

function clampDepth(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_IMPACT_DEPTH
  const depth = Math.floor(value)
  return depth < 0 ? 0 : depth
}

function isNode(value: unknown): value is GraphNode {
  if (!value || typeof value !== "object") return false
  const node = value as Record<string, unknown>
  return (
    typeof node.id === "string" &&
    node.id.length > 0 &&
    typeof node.path === "string" &&
    NODE_KINDS.has(node.kind as string)
  )
}

function isEdge(value: unknown): value is GraphEdge {
  if (!value || typeof value !== "object") return false
  const edge = value as Record<string, unknown>
  return (
    typeof edge.from === "string" &&
    typeof edge.to === "string" &&
    EDGE_KINDS.has(edge.kind as string) &&
    CONFIDENCES.has(edge.confidence as string)
  )
}
