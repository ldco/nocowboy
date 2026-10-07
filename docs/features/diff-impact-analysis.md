# Diff Impact Analysis

> Roadmap id: `diff-impact-analysis` — status is tracked in `docs/roadmap.json`.

## Description
Before a commit, show which parts of the system a change set ripples into.
It runs over the light `GraphProvider` (`knowledge-graph-stub`) — no heavy AST.

- `packages/opencode/src/nocowboy/knowledge-graph/importer.ts` — `buildImportGraph`
  scans source files, extracts `import` / `export … from` / dynamic-import
  specifiers, resolves the **relative** ones to files, and records one `import`
  edge (importer → imported) per resolved target. A specifier that resolves to a
  single file is `exact`; one that maps to several is `heuristic` (never guessed
  as exact). Bare/package specifiers are external and dropped. It never throws.
- `InMemoryGraphProvider.impacted(changedFiles, depth)` (existing) walks the
  reverse edges and returns importers nearest-first, each with `distance` and
  `confidence`; unknown input → `[]`.
- `packages/opencode/src/cli/cmd/knowledge-graph.ts` — `impact` subcommand:

```
bun run src/cli/cmd/knowledge-graph.ts impact --changed <file...> [--root <dir>] [--depth <n>]
```

It prints each impacted file with distance and confidence, or `no impact`, and
never crashes on a graph that has not been built.

## Key files
- `packages/opencode/src/nocowboy/knowledge-graph/importer.ts`
- `packages/opencode/src/nocowboy/knowledge-graph/{provider,memory}.ts`
- `packages/opencode/src/cli/cmd/knowledge-graph.ts`

## Verification
- `bun test test/nocowboy/diff-impact-analysis.test.ts` — 10 pass (builder edges,
  external drop, ambiguity → heuristic; impacted distance/confidence/unknown/depth;
  CLI parse, no-impact, real impact).
- `bun run src/cli/cmd/knowledge-graph.ts impact --changed` — prints `no impact`, exit 0.
- `bun run typecheck` — clean.
