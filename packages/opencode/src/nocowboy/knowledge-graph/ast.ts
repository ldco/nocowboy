/**
 * AST graph engine — fills the GraphProvider from a real tree-sitter AST.
 *
 * `knowledge-graph-stub` proved consumers only need the `GraphProvider` seam;
 * this module supplies the heavyweight filling behind it. It walks the source
 * tree, asks `@nocowboy/indexing` for structured definitions and call edges per
 * file, and assembles a snapshot with:
 *   - `file` nodes (one per source file) and `symbol` nodes (`path#name`);
 *   - `import` edges, reused verbatim from `buildImportGraph` (exact/heuristic);
 *   - `contains` edges from a file to each symbol it declares;
 *   - `call` edges, resolved conservatively — see `resolveCall`.
 *
 * Confidence is honest, never optimistic: a call is `exact` only when the target
 * is declared in the caller's file or in a file the caller imports, and
 * `heuristic` only when exactly one definition with that name exists anywhere.
 * Ambiguous or unknown targets are dropped rather than guessed. `AstGraphProvider`
 * then serves that snapshot through the unchanged `GraphProvider` interface.
 */

import { join } from "node:path"
import { parseCallEdgesForFile, parseDefinitionsForFile, MODULE_SCOPE, type AstDefinition } from "@nocowboy/indexing"
import { buildImportGraph, listSourceFiles } from "./importer"
import { DEFAULT_LAYER_RULES } from "./layers"
import { InMemoryGraphProvider } from "./memory"
import {
  EMPTY_GRAPH_SNAPSHOT,
  type EdgeConfidence,
  type GraphEdge,
  type GraphNode,
  type GraphProvider,
  type GraphSnapshot,
  type ImpactedFile,
  type LayerRule,
} from "./provider"

interface ResolvedCall {
  id: string
  confidence: EdgeConfidence
}

/**
 * Resolve a callee name to a single symbol node, or `null` when it cannot be
 * resolved without guessing. Exact only for a same-file or imported declaration;
 * a lone definition elsewhere is heuristic; anything ambiguous is dropped.
 */
function resolveCall(
  callee: string,
  file: string,
  importedFiles: ReadonlySet<string>,
  symbolIdsByName: ReadonlyMap<string, readonly string[]>,
): ResolvedCall | null {
  const candidates = symbolIdsByName.get(callee) ?? []
  if (candidates.length === 0) return null

  const localPrefix = `${file}#`
  const local = candidates.find((id) => id.startsWith(localPrefix))
  if (local) return { id: local, confidence: "exact" }

  const imported = candidates.filter((id) => importedFiles.has(fileOfSymbol(id)))
  if (imported.length === 1) return { id: imported[0]!, confidence: "exact" }
  if (imported.length > 1) return null // ambiguous across imports — do not guess

  if (candidates.length === 1) return { id: candidates[0]!, confidence: "heuristic" }
  return null
}

function fileOfSymbol(id: string): string {
  const hash = id.indexOf("#")
  return hash === -1 ? id : id.slice(0, hash)
}

/**
 * Build a full AST graph for a project root. Pure with respect to the provider:
 * it reads source files and returns a fresh snapshot. Never throws — a file that
 * cannot be parsed simply contributes no definitions or call edges.
 */
export async function buildAstGraph(root: string): Promise<GraphSnapshot> {
  const files = listSourceFiles(root)
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const edgeKeys = new Set<string>()
  const addEdge = (edge: GraphEdge): void => {
    const key = `${edge.from}|${edge.to}|${edge.kind}`
    if (edgeKeys.has(key)) return
    edgeKeys.add(key)
    edges.push(edge)
  }

  for (const file of files) nodes.push({ id: file, kind: "file", path: file })

  const definitions = new Map<string, AstDefinition[]>()
  const symbolIdsByName = new Map<string, string[]>()
  // A name can appear under several captures (e.g. `function` and
  // `async_function`), but a symbol node is keyed by `path#name` — emit it once,
  // otherwise the same name would look like an ambiguous declaration.
  const seenSymbols = new Set<string>()
  for (const file of files) {
    const found = await parseDefinitionsForFile(join(root, file))
    definitions.set(file, found)
    for (const def of found) {
      const id = `${file}#${def.name}`
      if (seenSymbols.has(id)) continue
      seenSymbols.add(id)
      nodes.push({ id, kind: "symbol", path: file, name: def.name })
      const list = symbolIdsByName.get(def.name)
      if (list) list.push(id)
      else symbolIdsByName.set(def.name, [id])
      addEdge({ from: file, to: id, kind: "contains", confidence: "exact" })
    }
  }

  // Reuse the proven import resolver; its edges already carry exact/heuristic.
  const imports = buildImportGraph(root, files)
  for (const edge of imports.edges) addEdge(edge)

  for (const file of files) {
    const declared = new Set((definitions.get(file) ?? []).map((def) => def.name))
    const importedFiles = new Set(imports.edges.filter((edge) => edge.from === file).map((edge) => edge.to))
    for (const call of await parseCallEdgesForFile(join(root, file))) {
      const target = resolveCall(call.to, file, importedFiles, symbolIdsByName)
      if (!target) continue
      const from = call.from === MODULE_SCOPE || !declared.has(call.from) ? file : `${file}#${call.from}`
      addEdge({ from, to: target.id, kind: "call", confidence: target.confidence })
    }
  }

  return { nodes, edges, source: "ast", generatedAt: Date.now() }
}

/**
 * A `GraphProvider` over an AST snapshot.
 *
 * The traversal the contract requires — reverse-edge walk, nearest-first with
 * worst-case confidence along the path, total (never throwing) — is exactly what
 * `InMemoryGraphProvider` already implements and what the stub tests pin down.
 * Rather than duplicate that logic (and risk it diverging), this class delegates
 * to it and layers the AST source on top; `layer()` therefore reuses the same
 * `layers.ts` rules. That is the whole point of the seam: only the *filling*
 * changes, and no consumer does.
 */
export class AstGraphProvider implements GraphProvider {
  private readonly inner: InMemoryGraphProvider

  constructor(snapshot: GraphSnapshot = EMPTY_GRAPH_SNAPSHOT, layerRules: readonly LayerRule[] = DEFAULT_LAYER_RULES) {
    this.inner = new InMemoryGraphProvider({ snapshot, layerRules })
  }

  snapshot(): GraphSnapshot {
    return this.inner.snapshot()
  }

  impacted(changedFiles: readonly string[], depth?: number): ImpactedFile[] {
    return this.inner.impacted(changedFiles, depth)
  }

  layer(file: string): string | null {
    return this.inner.layer(file)
  }
}
