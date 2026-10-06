/**
 * Knowledge graph — a structural map of the codebase: the files, the symbols
 * they define, and the import relationships between files.
 *
 * Built on top of the repomap scanner (`scanDir`), which already extracts each
 * file's imports/exports, so no second parser is needed. The graph is a plain
 * value; the CLI command and the dashboard renderer are its consumers.
 */

import * as path from "node:path"
import { scanDir, type FileEntry } from "./repomap"

export type GraphNodeKind = "file" | "symbol"

export interface GraphNode {
  id: string
  kind: GraphNodeKind
  label: string
  path?: string
  symbol?: string
}

export type GraphEdgeKind = "imports" | "contains"

export interface GraphEdge {
  from: string
  to: string
  kind: GraphEdgeKind
}

export interface KnowledgeGraph {
  root: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  stats: { files: number; symbols: number; edges: number }
}

export const fileId = (rel: string) => `file:${rel}`
export const symbolId = (rel: string, name: string) => `symbol:${rel}#${name}`

/** A file's module name: basename without extension, lowercased (for matching). */
export function moduleName(file: string): string {
  return path.basename(file).replace(/\.[^.]+$/, "").toLowerCase()
}

/**
 * Build the graph from a project root, or from a pre-scanned file list.
 *
 * Import edges are matched by module name (the scanner emits import basenames):
 * a file links to every repo file whose basename equals the imported name. This
 * is deliberately best-effort — resolving aliases/relative paths precisely needs
 * the full specifier, which the lightweight scanner does not keep — and it never
 * invents an edge to something outside the scanned set.
 */
export function buildKnowledgeGraph(root: string, entries?: FileEntry[]): KnowledgeGraph {
  const files = entries ?? scanDir(root)
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const seen = new Set<string>()

  const byModule = new Map<string, string[]>()
  for (const f of files) {
    const key = moduleName(f.file)
    const list = byModule.get(key) ?? []
    list.push(fileId(f.file))
    byModule.set(key, list)
  }

  const add = (edge: GraphEdge) => {
    const key = `${edge.kind}\u0000${edge.from}\u0000${edge.to}`
    if (seen.has(key)) return
    seen.add(key)
    edges.push(edge)
  }

  for (const f of files) {
    const from = fileId(f.file)
    nodes.push({ id: from, kind: "file", label: f.file, path: f.file })
    for (const name of f.exports) {
      const id = symbolId(f.file, name)
      nodes.push({ id, kind: "symbol", label: name, path: f.file, symbol: name })
      add({ from, to: id, kind: "contains" })
    }
    for (const imp of f.imports) {
      for (const to of byModule.get(imp.toLowerCase()) ?? []) {
        if (to === from) continue
        add({ from, to, kind: "imports" })
      }
    }
  }

  return {
    root,
    nodes,
    edges,
    stats: {
      files: files.length,
      symbols: nodes.filter((n) => n.kind === "symbol").length,
      edges: edges.length,
    },
  }
}

/** Neighbours of a node (outgoing + incoming), for interactive exploration. */
export function neighbours(graph: KnowledgeGraph, id: string): string[] {
  const out = new Set<string>()
  for (const e of graph.edges) {
    if (e.from === id) out.add(e.to)
    if (e.to === id) out.add(e.from)
  }
  return [...out]
}

/** Mermaid flowchart of the graph — a text consumer for terminals/PR comments. */
export function toMermaid(graph: KnowledgeGraph): string {
  const mid = (raw: string) => "n" + raw.replace(/[^a-zA-Z0-9]/g, "_")
  const lines = ["graph LR"]
  for (const n of graph.nodes) {
    lines.push(`  ${mid(n.id)}["${n.label}"]${n.kind === "symbol" ? ":::sym" : ""}`)
  }
  for (const e of graph.edges) {
    lines.push(`  ${mid(e.from)} ${e.kind === "imports" ? "-->" : "-.->"} ${mid(e.to)}`)
  }
  lines.push("  classDef sym fill:#ffb86c,stroke:#333;")
  return lines.join("\n")
}
