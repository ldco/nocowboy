# Architectural Layer Detection

> Roadmap id: `arch-layer-detection` — status is tracked in `docs/roadmap.json`.

## Description
Group a tree by architectural layer — API / Service / Data / UI — for the
knowledge-graph dashboard, with a colour legend. It rides the `GraphProvider`
seam (`knowledge-graph-stub`): `layer(file)` classifies a path by configurable
`LayerRule`s (first match wins) and returns `null` for an unknown path, so a
layer is never invented.

`packages/opencode/src/nocowboy/knowledge-graph/layers.ts`:

- `DEFAULT_LAYER_RULES` — ordered specific → general, segment-anchored
  (`src/api/x.ts` is API, `src/rapid.ts` is not).
- `LAYER_LEGEND` + `UNKNOWN_LAYER` — layer → dashboard colour.
- `defaultLayerProvider(rules?)` — an `InMemoryGraphProvider` bound to the rules.
- `groupByLayer(provider, files)` — files grouped in legend order, unknown last,
  each group carrying its colour.

## Key files
- `packages/opencode/src/nocowboy/knowledge-graph/layers.ts`
- `packages/opencode/src/nocowboy/knowledge-graph/{provider,memory}.ts`

## Verification
- `bun test test/nocowboy/arch-layer-detection.test.ts` — 9 pass (API/Service/
  Data/UI classification, unknown → null, configurable/first-match rules,
  grouping + legend colours).
- `bun run typecheck` — clean.
