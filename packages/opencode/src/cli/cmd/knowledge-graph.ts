#!/usr/bin/env bun
/**
 * knowledge-graph CLI — `impact` subcommand (diff impact analysis).
 *
 *   bun run src/cli/cmd/knowledge-graph.ts impact --changed <file...> [--root <dir>] [--depth <n>]
 *
 * Builds a lightweight import graph for the project and reports the files
 * impacted by a change set (importers out to `depth`), each with distance and
 * confidence. An empty or unrelated change set prints `no impact` and exits 0 —
 * the command never crashes on a graph that has not been built.
 */

import { InMemoryGraphProvider } from "@/nocowboy/knowledge-graph"
import { buildImportGraph } from "@/nocowboy/knowledge-graph/importer"
import type { ImpactedFile } from "@/nocowboy/knowledge-graph/provider"

export interface KnowledgeGraphArgs {
  command: string
  changed: string[]
  root: string
  depth?: number
}

/** Parse argv into `{ command, changed, root, depth }`. `--changed` consumes until the next flag. */
export function parseKnowledgeGraphArgs(argv: readonly string[]): KnowledgeGraphArgs {
  const [command = "", ...rest] = argv
  const changed: string[] = []
  let root = process.cwd()
  let depth: number | undefined
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!
    if (arg === "--changed" || arg === "-c") {
      while (i + 1 < rest.length && !rest[i + 1]!.startsWith("--")) {
        changed.push(...rest[++i]!.split(",").filter(Boolean))
      }
    } else if (arg === "--root" || arg === "-r") {
      root = rest[++i] ?? root
    } else if (arg === "--depth" || arg === "-d") {
      const value = Number(rest[++i])
      if (Number.isFinite(value)) depth = value
    }
  }
  return { command, changed, root, depth }
}

/** Render the impacted files. */
export function formatImpact(changed: string[], impacted: readonly ImpactedFile[]): string {
  if (changed.length === 0) return "no impact (no changed files given)"
  if (impacted.length === 0) return "no impact"
  const lines = impacted.map((item) => `  ${item.file}  distance=${item.distance} confidence=${item.confidence}`)
  return [`impacted by ${changed.join(", ")}:`, ...lines].join("\n")
}

/** Build the graph and report the impact of `changed`. Never throws. */
export function runImpact(args: KnowledgeGraphArgs): { text: string; impacted: ImpactedFile[] } {
  const snapshot = buildImportGraph(args.root)
  const provider = new InMemoryGraphProvider({ snapshot })
  const impacted = provider.impacted(args.changed, args.depth)
  return { text: formatImpact(args.changed, impacted), impacted }
}

function main(): void {
  const args = parseKnowledgeGraphArgs(process.argv.slice(2))
  if (args.command !== "impact") {
    console.log("usage: knowledge-graph impact --changed <file...> [--root <dir>] [--depth <n>]")
    return
  }
  console.log(runImpact(args).text)
}

if (import.meta.main) main()
