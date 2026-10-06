# Knowledge Graph — стаб-контракт GraphProvider (in-memory fallback)

> Generated from docs/roadmap.json — part of NoCowboy verification system.

## Description
Заменил жёсткий блокер knowledge-graph. Зависимые модули (diff-impact-analysis, arch-layer-detection) зависят только от этого контракта, а не от тяжёлого парсера.

## Key files
- `packages/opencode/src/nocowboy/knowledge-graph/provider.ts`
- `packages/opencode/src/nocowboy/knowledge-graph/memory.ts`

## Verification
- File existence: ✅ tracked
- Attestation for overseer: ✅ not required
