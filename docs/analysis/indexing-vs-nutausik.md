# Indexing: the harness index vs NUTAUSIK — no double work

Owner question: *we have indexing in the harness and NUTAUSIK also indexes —
aren't we doing the same work twice? How should they work together?*

Short answer: **they index different corpora with different techniques, so there
is no double work — but there was a real duplicate, and it is now removed.**

## What each side actually indexes

| | Harness index | NUTAUSIK index |
|---|---|---|
| Corpus | **Source code** in the repo (files, symbols) | **Project knowledge**: tasks, memory, decisions |
| Technique | Vector embeddings (semantic), lance/vector store | SQLite **FTS5** (keyword / BM25), no embeddings |
| Answers | "where is X implemented", "find code like Y" | "what did we decide", "what gotchas do we have", "is this task done" |
| Cost | embedding tokens on index build | zero embedding cost (FTS only) |
| Tool | `semantic_search` / `codebase_search` | `nutausik_fts_search`, `nutausik_memory_search` |

Because the corpora are disjoint and NUTAUSIK uses full-text (not embeddings),
there is **no duplicated embedding spend** and **no duplicated storage**.

## The duplicate that did exist

`packages/opencode/src/nocowboy/memory/` (`index.ts`, `fts-query.ts`,
`paths.ts`, `reconcile.ts`, `schema.ts`) implemented a **second memory index**
inside the harness (BM25 over `~/.local/share/nocowboy/storage/memory`).
It had **zero importers** in `src`, `test` or `package.json` — a leftover from
before NUTAUSIK became the source of truth for memory.

That is the genuine "double work": two memory stores, two schemas, one of them
dead. It has been **removed**. NUTAUSIK is the single memory store.

## How they should cooperate

1. **Route by question type.** The router/system prompt should send:
   - code-location questions → the harness semantic index;
   - decisions, conventions, gotchas, "have we done this before" → NUTAUSIK FTS.
   This avoids the agent issuing both kinds of search for the same question
   (the behavioural form of double work).
2. **Never duplicate a corpus.** Code goes in the code index; knowledge goes in
   NUTAUSIK. If a document is knowledge (an ADR, a postmortem), reference it from
   NUTAUSIK memory rather than re-embedding it into the code index.
3. **Keep embeddings out of NUTAUSIK.** FTS5 is fast and free; adding vectors
   there would create the very duplication we are removing.
4. **One owner per store.** The harness owns `vectors.db` (code). NUTAUSIK owns
   its SQLite project DB (knowledge). No module in the harness should recreate a
   knowledge store.

## Follow-ups

- Add the routing rule above to the router prompt so the behaviour is automatic.
- The harness code index and NUTAUSIK are already both reachable as tools; a
  short "when to use which" note in the user docs would help.
