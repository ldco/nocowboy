/**
 * Lightweight import-graph builder — fills the GraphProvider without an AST.
 *
 * `diff-impact-analysis` needs reverse import edges, not semantic analysis.
 * This scanner reads source files, extracts their `import`/`export … from`
 * specifiers, resolves the *relative* ones to files in the tree, and records one
 * `import` edge per resolved target (importer -> imported). Bare/package
 * specifiers are external and dropped. The graph is deliberately conservative:
 * a specifier that resolves to more than one candidate is marked `heuristic`
 * rather than guessed as `exact`.
 *
 * Pure with respect to the provider: it only reads files.
 */

import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import type { GraphEdge, GraphNode, GraphSnapshot } from "./provider"

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build", ".turbo", "coverage"])
const SPECIFIER = /\b(?:import|export)\b[^"'`;]*?\bfrom\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/g

function toPosix(value: string): string {
  return value.replaceAll("\\", "/")
}

/** Recursively list source files under `root`, repo-relative and posix. */
export function listSourceFiles(root: string): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const name of entries) {
      const full = join(dir, name)
      let stat
      try {
        stat = statSync(full)
      } catch {
        continue
      }
      if (stat.isDirectory()) {
        if (!IGNORED_DIRS.has(name)) walk(full)
      } else if (stat.isFile() && SOURCE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
        out.push(toPosix(relative(root, full)))
      }
    }
  }
  walk(root)
  return out.sort()
}

function extractSpecifiers(source: string): string[] {
  const specs: string[] = []
  for (const match of source.matchAll(SPECIFIER)) {
    const spec = match[1] ?? match[2]
    if (spec) specs.push(spec)
  }
  return specs
}

function dirname(path: string): string {
  const index = path.lastIndexOf("/")
  return index === -1 ? "" : path.slice(0, index)
}

function joinPosix(base: string, spec: string): string {
  const segments = (base ? base.split("/") : []).concat(spec.split("/"))
  const stack: string[] = []
  for (const segment of segments) {
    if (segment === "" || segment === ".") continue
    if (segment === "..") stack.pop()
    else stack.push(segment)
  }
  return stack.join("/")
}

/**
 * Resolve a relative specifier against the file set. Returns every candidate:
 * `exact` only when there is exactly one, otherwise the caller marks `heuristic`.
 */
function resolveSpecifier(importer: string, spec: string, files: ReadonlySet<string>): string[] {
  if (!spec.startsWith(".")) return [] // bare/package import — external
  const base = joinPosix(dirname(importer), spec)
  const candidates = new Set<string>()
  if (files.has(base)) candidates.add(base)
  for (const ext of SOURCE_EXTENSIONS) if (files.has(base + ext)) candidates.add(base + ext)
  for (const ext of SOURCE_EXTENSIONS) if (files.has(`${base}/index${ext}`)) candidates.add(`${base}/index${ext}`)
  return [...candidates].sort()
}

/**
 * Build an import snapshot for a project root. `files` overrides discovery
 * (used by tests). Never throws: unreadable files are skipped.
 */
export function buildImportGraph(root: string, files?: readonly string[]): GraphSnapshot {
  const paths = (files ?? listSourceFiles(root)).map(toPosix)
  const fileSet = new Set(paths)
  const nodes: GraphNode[] = paths.map((path) => ({ id: path, kind: "file", path }))
  const edges: GraphEdge[] = []

  for (const path of paths) {
    let source: string
    try {
      source = readFileSync(join(root, path), "utf-8")
    } catch {
      continue
    }
    for (const spec of extractSpecifiers(source)) {
      const candidates = resolveSpecifier(path, spec, fileSet)
      if (candidates.length === 0) continue
      edges.push({
        from: path,
        to: candidates[0]!,
        kind: "import",
        // A specifier mapping to several files is not a proven relation.
        confidence: candidates.length === 1 ? "exact" : "heuristic",
      })
    }
  }

  return { nodes, edges, source: "memory", generatedAt: Date.now() }
}
