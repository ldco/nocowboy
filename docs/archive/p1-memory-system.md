# P1 — MiMo Memory & Reasoning

Plan based on actual MiMo source code (https://github.com/XiaomiMiMo/MiMo-Code).

## Architecture

MiMo adds ~25 files on top of OpenCode across 5 subsystems:

```
memory/          — FTS5-backed persistent memory service
session/         — checkpoint, context management, goal judge, auto-dream
task/            — tree-shaped task tracking (T1, T1.1, T1.2)
workflow/        — compose-mode workflow orchestration (P1.3+)
```

## Implementation Order

### Step 1 — Foundations: Paths, Overflow, Budgeted Read

Files that the checkpoint system depends on. No LLM calls, just pure functions + SQL.

| File | Source | LOC | Depends On |
|---|---|---|---|
| `checkpoint-paths.ts` | MiMo `session/checkpoint-paths.ts` | ~60 | — |
| `checkpoint-templates.ts` | MiMo `session/checkpoint-templates.ts` | ~40 | — |
| `overflow.ts` | MiMo `session/overflow.ts` | ~40 | — |
| `budgeted-read.ts` | MiMo `session/budgeted-read.ts` | ~120 | — |
| `boundary.ts` | MiMo `session/boundary.ts` | ~70 | — |

**checkpoint-paths.ts**: Pure path utilities. Resolves:
- `metaDir(sessionID)` — `~/.nocowboy/memory/sessions/<sid>/`
- `checkpointPath(sessionID)` — `<metaDir>/checkpoint.md`
- `memoryPath(projectID)` — `~/.nocowboy/projects/<pid>/MEMORY.md`
- `notesPath(sessionID)` — `<metaDir>/notes.md`
- `globalMemoryPath()` — `~/.nocowboy/memory/projects/global/MEMORY.md`
- `migrateProjectMemory()` — rename lowercase `memory.md` → `MEMORY.md`

**checkpoint-templates.ts**: Default template strings for checkpoint.md, MEMORY.md, notes.md with section budgets.

**overflow.ts**: Context pressure detection. Pure functions:
- `usable(cfg, model)` — compute usable context window (context - output reserve - compaction buffer)
- `isOverflow(cfg, tokens, model)` — is current token count past usable window?
- `pressureLevel(cfg, tokens, model)` — return 0-3 pressure level based on ratio

**budgeted-read.ts**: Token-budgeted file reading:
- `readBudgeted(filePath, budgetTokens)` — read file, truncate at budget, append hint
- `readBudgetedSectionAware(filePath, budgetTokens)` — section-aware truncation (preserves headers, drops body)

**boundary.ts**: Message boundary alignment for compaction:
- `adjustBoundaryForApiInvariants(messages, candidateBoundary)` — walk boundary backward to ensure tool_use/tool_result pairs aren't split

### Step 2 — Memory Effect Service

Wrap our existing FTS5 memory into an Effect service matching MiMo's `memory/service.ts`.

| File | Source | LOC | Depends On |
|---|---|---|---|
| `memory/service.ts` | MiMo `memory/service.ts` | ~120 | Step 1 paths |
| `memory/paths.ts` | MiMo `memory/paths.ts` | ~100 | Step 1 paths |

**memory/service.ts**: Effect `Service` with:
- `root()` — return memory root dir
- `reconcile()` — walk dir, index new files, prune stale
- `search(input)` — FTS5 search with scope/type/scope_id filtering, BM25 scoring, relative score floor

**memory/paths.ts**: Path classification:
- Scope: `global | projects | sessions | cc`
- Type: `free | memory | checkpoint | progress | notes | feedback | project | reference | user`
- `parsePath(absPath)` — extract scope/scope_id/type/key from absolute path
- `parseCcPath(absPath)` — CC `.claude/projects/` path parsing
- `parseCcFrontmatterType(body)` — extract type from CC YAML frontmatter
- `buildPath(input)` — construct path from root + scope + key

### Step 3 — Checkpoint Writer Subagent

The core: spawns a subagent to write checkpoint.md and MEMORY.md.

| File | Source | LOC | Depends On |
|---|---|---|---|
| `session/checkpoint-align.ts` | MiMo `session/checkpoint-align.ts` | ~30 | — |
| `session/checkpoint-context.ts` | MiMo `session/checkpoint-context.ts` | ~30 | — |
| `session/checkpoint-validator.ts` | MiMo `session/checkpoint-validator.ts` | ~30 | — |
| `session/checkpoint-progress-reconcile.ts` | MiMo `session/checkpoint-progress-reconcile.ts` | ~60 | Step 2 |
| `session/checkpoint-retry.ts` | MiMo `session/checkpoint-retry.ts` | ~40 | — |
| `session/checkpoint.ts` | MiMo `session/checkpoint.ts` | ~500 | Steps 1-2 |

**checkpoint.ts** is the big one (~500 LOC). It:
1. Computes the token-budgeted boundary between "to summarize" and "to keep"
2. Spawns a checkpoint-writer subagent with a composed prompt
3. The writer reads checkpoint.md, memory.md, notes.md and writes updated versions
4. On settle, advances `last_checkpoint_message_id` and fires any queued writer

Key types:
- `TryStartCheckpointWriterResult`: `"started" | "queued" | "skipped"`
- `computeBoundary(msgs)` — token-budgeted boundary selection using `estimateMessageTokens`

### Step 4 — Integration into Session Loop

Wire checkpoint into the compaction path.

| Change | Source | LOC | Depends On |
|---|---|---|---|
| Hook into compaction | MiMo pattern | ~20 | Step 3 |
| Insert rebuild boundary | MiMo `insertRebuildBoundary` | ~40 | Step 3 |
| Render rebuild context | MiMo `renderRebuildContext` | ~80 | Steps 1-3 |

When pressure level hits 2-3 before compaction:
1. Save checkpoint (via checkpoint writer)
2. After compaction, insert rebuild boundary message with checkpoint index + context
3. Inject accumulated learnings and current snapshot

### Step 5 — Goal Judge (P1.4)

| File | Source | LOC | Depends On |
|---|---|---|---|
| `session/goal.ts` | MiMo `session/goal.ts` | ~200 | — |

Standalone Effect service with:
- `set(sessionID, condition)` — set stop condition
- `get(sessionID)` — get current goal
- `clear(sessionID)` — clear goal
- `bumpReact(sessionID)` — increment re-entry counter
- `evaluate(input)` — judge model evaluates transcript against condition

Judge uses `generateObject` from `ai` SDK with a separate model call, temperature 0.

### Step 6 — Auto-Dream (P1.2)

| File | Source | LOC | Depends On |
|---|---|---|---|
| `session/auto-dream.ts` | MiMo `session/auto-dream.ts` | ~100 | Step 3 |

Scheduled memory consolidation. Checks if `DEFAULT_DREAM_INTERVAL_DAYS` (7) has passed since last dream session, then spawns a subagent to scan traces → extract knowledge → MEMORY.md.

### Step 7 — Task Tree (P1.5)

| File | Source | LOC | Depends On |
|---|---|---|---|
| `task/schema.ts` | MiMo `task/schema.ts` | ~40 | — |
| `task/task.sql.ts` | MiMo `task/task.sql.ts` | ~40 | — |
| `task/index.ts` | MiMo `task/index.ts` | ~120 | SQL |
| `task/registry.ts` | MiMo `task/registry.ts` | ~80 | index |
| `task/events.ts` | MiMo `task/events.ts` | ~20 | — |
| `task/gate.ts` | MiMo `task/gate.ts` | ~60 | — |
| `task/gate-state.ts` | MiMo `task/gate-state.ts` | ~30 | — |

Task tree with IDs like `T1`, `T1.1`, `T1.2`. SQLite-backed. Events for state transitions. Gate for blocking/unblocking.

### Out of scope for P1

- **Workflow system** (`src/workflow/`) — compose-mode orchestration, ~12 files. Part of P2/P3.
- **Max mode** (`session/max-mode.ts`) — parallel best-of-N reasoning. Later.
- **Trajectory tracking** (`session/trajectory.ts`) — inference-time compute. Later.
