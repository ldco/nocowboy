# EditPort — семантика match/batch/stale-read/partial-failure

> Status: done (v1.1.0). Roadmap id: `edit-port-batch-safety`.

## Description
The SEARCH/REPLACE edit path now has an explicit, tested contract
(`EditPort`):

- **match** — the SEARCH text must match exactly **one** location. A string that
  occurs more than once is ambiguous and is an error (`duplicate-match`), not a
  silent edit of the first occurrence.
- **batch** — several blocks for the same file apply sequentially, each against
  the content produced by the previous one, in call order. The file is read once.
- **stale-read / partial-failure** — before the first write every file is
  re-read and compared to the bytes the edit was computed from; a mismatch aborts
  the whole batch with nothing written. If a write fails mid-batch, files already
  written are restored to their pre-edit content, so a failure never leaves a
  half-applied batch.

Exact string matching, CRLF/BOM/legacy-encoding round-trip, the permission diff,
LSP/format and ConfigValidation are all preserved.

## Key files
- `packages/opencode/src/nocowboy/tool/edit-port.ts`
- `packages/opencode/src/tool/search_replace.ts`
- `packages/opencode/src/tool/search_replace.txt`
- `packages/opencode/test/tool/search_replace.test.ts`
- `packages/opencode/test/nocowboy/edit-port.test.ts`

## Verification
- `bun test test/tool/search_replace.test.ts` — 18 pass (duplicate match, ordered
  same-file batch, UTF-8 BOM + CRLF round-trip, windows-1251 round-trip, stale
  read leaves no half batch).
- `bun test test/nocowboy/edit-port.test.ts` — 9 pass (findMatch, applyBlocks,
  commitBatch write / stale abort / rollback).
- `bun run typecheck` — clean.
