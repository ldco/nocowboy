---
description: Scan recent session traces and extract persistent knowledge into MEMORY.md
---

# /dream — Session Knowledge Extraction

## Steps

1. List the 5 most recent session directories in `~/.nocowboy/sessions/`
2. For each session, read the conversation transcript (`messages.jsonl` or equivalent)
3. Extract:
   - **Build commands** — `npm run dev`, `bun test`, `cargo build`, etc.
   - **Architecture patterns** — "Components live in src/components/", "API routes in server/routes/"
   - **Debugging insights** — "Auth module fails because X", "Check .env for AUTH_SECRET"
   - **Preferences** — "Always use pnpm", "2-space indent", "Prefer Bun APIs"
   - **Gotchas** — "Don't use raw SQL, always use Drizzle ORM"
   - **Dead ends** — "Tried X approach, didn't work because Y"
4. Read the current `~/.nocowboy/memory/MEMORY.md` if it exists
5. Merge new learnings into MEMORY.md:
   - Keep existing entries that are still valid
   - Add new entries that don't already exist
   - Remove entries contradicted by newer learnings
   - Deduplicate (same insight from multiple sessions → keep best version)
6. Write back to `~/.nocowboy/memory/MEMORY.md`
7. Run `reconcile()` to re-index into FTS5 memory search
8. Report: what was added, what was removed, what was kept

## Output Format

```markdown
## Dream Results

### Added (3 new learnings)
- `bun test --timeout 30000` — use extended timeout for slow tests
- Auth fails silently when ZOD_VALIDATION=strict — set to "warn" for local dev
- CSS system: use theme.textMuted, not hardcoded grays

### Removed (1 outdated)
- `npm run dev` (replaced by `bun run dev`)

### Kept (4 existing)
- Component convention: PascalCase, one component per file
- Database: Drizzle ORM only, no raw SQL
- Git: never push, commit only
- Lint before every commit
```
