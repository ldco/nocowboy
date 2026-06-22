---
name: memory-manager
description: Save and manage cross-session project memory. Invoke this when asked to save a learning, pattern, or preference to memory.
allowed-tools: Bash(mkdir *) Bash(echo *) Bash(cat *) Bash(git *) Read Write Glob Grep
---

# Memory Manager

Save and manage project memory. Memory persists across sessions so learnings accumulate.

## Determine Project Slug

Get the project slug from the git remote, or fall back to the working directory name:
```
git remote get-url origin 2>/dev/null | sed 's/.*[\/:]\([^\/]*\)\/\([^\/]*\)\.git$/\1\/\2/' || echo "$(basename $(pwd))"
```

## Memory Directory

Memory lives at `~/.kilo/memory/<project-slug>/`.

## MEMORY.md Format

```
# Memory: <project-name>

## Build & Run
- `npm run dev` — dev server
- `npm test` — run tests

## Architecture
- API routes: server/routes/
- DB schema: server/db/schema/

## Preferences
- Use pnpm, not npm
- 2-space indent
- UI components in src/components/

## Debugging
- Auth: check .env for AUTH_SECRET
- Slow queries: look for missing indexes
```

## Actions

### save
Save a learning to memory. 1-2 sentences under the appropriate section.

### consolidate
Remove outdated entries, merge duplicates, keep under 200 lines.

### archive
Move >5 entries on one topic to a topic file, reference from MEMORY.md.

### read
Display the full MEMORY.md or a specific topic file.
