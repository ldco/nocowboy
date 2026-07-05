# Auto Memory — Cross-Session Knowledge

## Concept

Auto memory accumulates knowledge across sessions via NUTAUSIK. Every significant discovery, pattern, or preference is saved to the NUTAUSIK brain and loaded at the start of every session.

This is NOT a replacement for AGENTS.md instructions. AGENTS.md = instructions you write. Auto memory = learnings discovered during work.

## Storage

All memory lives in NUTAUSIK. Use `nutausik_memory_add` for each save. Types:

| Type | When | Example |
|------|------|---------|
| `pattern` | Repeated observations | "Every deploy needs a DB migration step" |
| `gotcha` | Pitfalls discovered | "Omitting `.env` file causes silent 500" |
| `convention` | Team/project decisions | "Prefer pnpm over npm" |
| `context` | Project-specific knowledge | "API base URL is https://api.example.com/v2" |
| `dead_end` | Approaches that failed | "Tried X, didn't work because Y" |

## Session Start

Run `nutausik_memory_block` or `nutausik_memory_surface` at boot. Note relevant entries to the conversation.

## During Work

Save learnings when you discover:
- Build/test commands — `npm run dev`, `cargo build`, `pytest tests/`
- Debugging insights — "The auth module fails because X"
- Architecture patterns — "Components live in src/components/, pages in src/pages/"
- Preferences — "Always use pnpm", "2-space indent"
- Gotchas — "Don't use raw SQL, always use Drizzle ORM"
- Common mistakes — "Forgetting to run migrations causes mysterious 500s"

Use: `nutausik_memory_add(type: "...", title: "...", content: "...")`

## Session End

Before completing: run `/dream` or manually call `nutausik_memory_add` for key learnings.

## Search

- `nutausik_memory_search(query)` — full-text search across all memory
- `nutausik_fts_search(query)` — FTS5 search for precise queries
- `nutausik_memory_list(type: "gotcha")` — filter by type
