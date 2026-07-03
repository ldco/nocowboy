# P2-C2: Instruction Files Analysis (Deferred)

**Analyzed:** 2026-07-03  
**Status:** 📋 DEFERRED — jurist agent and P2-A5 yolo mode prioritized

## Current Inventory

| # | File | Lines | Kilo/old brand | Ref removed agents | Clean? | Action |
|---|------|-------|----------------|-------------------|--------|--------|
| 1 | engineering-rules.md | 64 | `kilo.json` (line 39) | `plan_exit` tool (keep) | 🟡 | Fix Kilo ref, merge no-shortcuts |
| 2 | no-shortcuts.md | 169 | — | — | ✅ | MERGE into engineering-rules, delete |
| 3 | cybersecurity.md | 291 | — | — | ✅ MOVED to puppetmaster MCP (pm_knowledge topic: security) |
| 4 | russian-law.md | 412 | — | — | 🟡 PM templates | Prune PM sections, keep 152-ФЗ |
| 5 | structured-output.md | 118 | — | — | ✅ | Keep |
| 6 | auto-memory.md | 77 | `~/.kilo/memory/` x4 | `subagent_type: "general"` | 🔴 | Fix paths + agent ref |
| 7 | hooks-system.md | 50 | — | — | ✅ | Keep |
| 8 | channels.md | 66 | `~/.kilo/channels/` | — | 🟡 | Fix path |
| 9 | multi-provider.md | 94 | — | `explore`, `code-reviewer` | 🔴 | Fix agent refs |
| 10 | repo-map.md | 123 | "Kilo's" | — | 🟡 | Fix branding |
| 11 | aider-features.md | 132 | "Kilo's Git MCP" | — | 🟡 | Fix branding |
| 12 | sandbox.md | 41 | `kilo.json` | — | 🟡 | Fix ref |
| 13 | path-rules-loader.md | 54 | — | — | ✅ | Keep |
| 14 | rules/frontend.md | 24 | — | — | ✅ | Keep |
| 15 | rules/api-patterns.md | 18 | — | — | ✅ | Keep |
| 16 | rules/database.md | 24 | — | — | ✅ | Keep |

## Recommendations

### Fix branding (5 files)
Replace `~/.kilo/` → `~/.nocowboy/`, `kilo.json` → `nocowboy.json`, "Kilo's" → "NoCowboy's"

### Fix agent references (2 files)
- `multi-provider.md`: replace example agents (`explore`, `code-reviewer`) with current ones
- `auto-memory.md`: remove `subagent_type: "general"`, use correct invocation

### Merge (2 files)
- `no-shortcuts.md` → merge into `engineering-rules.md` (same topic)
- `sandbox.md` → merge into `engineering-rules.md` (small file)

### Remove (1 file)
- `cybersecurity.md` — PM Framework (Nuxt/Vue) specific, not relevant for NoCowboy agents

### Prune (1 file)
- `russian-law.md` — keep 152-ФЗ reference, remove PM framework specific templates

## Loading Mechanism
Instructions loaded via `session/instruction.ts` scanning:
1. `AGENTS.md` (project root + global config)
2. `packaging/config/instructions/*.md` glob
3. `rules/` subdirectory via path-based matching
