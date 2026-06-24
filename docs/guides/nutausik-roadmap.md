# NUTAUSIK Roadmap

**Date:** 2026-06-24 | JS port at `/fabriсa22/nutausik-js/packages/nutausik/`

Original Tausik: **124 MCP tools, 21 hooks, 4445 tests, 0 deps, ed25519 signed receipts, SENAR methodology**.
NUTAUSIK JS port: **62 TS files, 7 MCP tools, 15 tests, partial features**.

## What NUTAUSIK has (62 TS files, 19 modules)

| Module | Status |
|---|---|
| `backend/` — SQLite, FTS, CRUD, graph, migrations | ✅ Partial (schema 534L) |
| `mcp/` — MCP server, 7 tools, handlers | ✅ Working |
| `hooks/` — 12 hooks (bash-firewall, budgets, git-push-gate, etc.) | ✅ Partial |
| `service/` — hierarchy, knowledge, task, session, verification | ✅ Partial |
| `gates/` — command-runner, filesize, stack-dispatch, test-resolver | ✅ Partial |
| `verify/` — files-hash, git-diff, cache | ✅ Partial |
| `providers/` — DuckDuckGo, web-search | ✅ Done |
| `crypto/` — ed25519, keys, receipt, sign | ✅ Done |
| `risk/` — risk computation | ✅ Done |
| `stacks/` — decision stacks | ✅ Done |
| `skills/` — skills manager | ✅ Done |

## What the original TAUSIK has that NUTAUSIK MUST get

### 🔴 P0 — Core Trust & Enforcement (not optional)

| # | Feature | Original | What to build |
|---|---|---|---|
| 1 | **Signed receipts (ed25519)** | `crypto/*` + receipts | Wire `crypto/receipt.ts` into verify pipeline. Every verification produces a signed receipt bound to commit SHA. |
| 2 | **QG-0 gate** — no code without a task | `scripts/gates/qg0.py` | Block agent tool calls until a task is open with acceptance criteria. |
| 3 | **QG-2 gate** — no close without verify | `scripts/gates/qg2.py` | Block `task done` until valid signed receipt exists for HEAD commit. |

### 🟡 P1 — MCP Tools (project management)

| # | Feature | Original tools | What to build |
|---|---|---|---|
| 4 | **Epic/Story/Task CRUD** | `epic_*`, `story_*`, `task_*` (20+ tools) | Full CRUD in `service/hierarchy.ts` + `service/task.ts`. Wire to MCP tools. |
| 5 | **Decision tracking** | `decision_record`, `decision_review` | `service/knowledge.ts` — lightweight ADR-like decisions linked to tasks. |
| 6 | **Dead end tracking** | `deadend_record` | Record failed approaches programmatically. `/dream` reads them for MEMORY.md. |
| 7 | **Audit trail** | `audit_*` | All project management actions logged with timestamps. |
| 8 | **Role management** | `role_*` | Assign roles to epics/stories. |

### 🟢 P2 — Verify + Metrics

| # | Feature | Original | What to build |
|---|---|---|---|
| 9 | **Verify suites** (25 total) | pytest, ruff, mypy, tsc, eslint, cargo, go vet, etc. | Port the 25 verify suites. Use `verify/` module as base. |
| 10 | **Metrics & routing** | throughput, first-pass success, defect-escape, lead-time | `backend/metrics.ts` — track and expose via MCP tools. |
| 11 | **Complexity-aware model routing** | per-task cost/token budgets | `model/routing.ts` — route simple tasks to cheap models, complex to powerful ones. |

## NUTAUSIK vs MiMo Memory — No Overlap, Complementary

**Both use SQLite + FTS5. They do NOT overlap — they complement.**

| Layer | Engine | Data Model | Access | Example Query |
|---|---|---|---|---|
| **Agent memory** (per-session) | MiMo FTS5 (NoCowboy core) | File-based: `MEMORY.md`, `checkpoint.md` | Human-readable + FTS5 search | "What build commands do we use?" → FTS5 search across MEMORY.md |
| **Project knowledge** (cross-session) | MiMo `/dream` (NoCowboy core) | Free-text extraction from sessions → MEMORY.md | Agent writes, human reads | Agent extracts "Use pnpm, not npm" from 5 sessions → writes to MEMORY.md |
| **Task memory** (per-task, relational) | NUTAUSIK `graph.ts` + `knowledge.ts` | Structured: tasks↔decisions↔dead ends↔explorations | MCP tools query relationally | "Which tasks were affected by decision X?" → NT graph query |

**Decision:** Keep all three. `/dream` reads NUTAUSIK graph and writes human-readable summaries to MEMORY.md. MiMo FTS5 indexes everything — files AND NT records — for unified search.

### 🔵 P3 — DeepSeek Optimization

| # | Feature | From | What |
|---|---|---|---|
| 12 | **DeepSeek prefix-cache optimization** | Whale (MIT) | Structure system prompts for byte-stable prefix. Whale achieves 90% cache hit rate → ~30x cheaper. |
| 13 | **Per-task cost tracking** | Whale / Original | Show cost per task in MCP tools and UI. |
| 14 | **Multi-agent fan-out workflows** | Whale Dynamic Workflows | JavaScript-orchestrated parallel agent execution. |

## What the original has that we ALREADY ported

| Feature | Status |
|---|---|
| SQLite + FTS5 backend | ✅ |
| DuckDuckGo search | ✅ |
| ed25519 crypto primitives | ✅ |
| Bash firewall hook | ✅ |
| Task hierarchy foundations | ✅ |
| Knowledge graph foundations | ✅ |
| Stacks registry | ✅ |
| Skills manager | ✅ |
| File verification (hash + diff) | ✅ |

## Methodology: SENAR + RENAR

- **SENAR** (senar.tech) — engineering standard. Gates, sessions, metrics, verification checklists.
- **RENAR** (renar.tech) — requirements engineering standard. BR→SR→TR hierarchy, 9 SPEC types, V1-V6 substrate, 5 maturity levels.
- RENAR complements SENAR: SENAR handles HOW to build, RENAR handles WHAT to build.
- TAUSIK is the reference implementation for SENAR. NUTAUSIK will also implement RENAR.

## DeepSeek-first Architecture (vs Claude-first original)

The original Tausik is Claude-first (CLAUDE.md, Claude hooks, Claude-specific routing).
NUTAUSIK must be **DeepSeek-first** while maintaining multi-model support.

| Change | Why |
|---|---|
| System prompt structured for DeepSeek prefix-cache | Whale achieves 90% cache hit + ~30x cheaper |
| Default model = `deepseek-chat` (not Claude) | DeepSeek is the best code model for the price. Russian market uses DeepSeek (sanctions bypass). |
| Model routing: simple → `deepseek-chat`, complex → `deepseek-reasoner` | Two-tier routing within DeepSeek family. Whale pattern. |
| Kill Claude-specific MCP hooks (use our NUTAUSIK hooks instead) | Our hooks are already ported and IDE-agnostic. |
| Kill Claude subscription proxy dependency | DuckDuckGo replaces Claude search proxy. DeepSeek replaces Claude as LLM. |

## NUTAUSIK publish checklist

- [ ] Publish `@nocowboy/nutausik` to npm (package.json ready at v0.1.0)
- [ ] Add to NoCowboy `optionalDependencies` or `mcp start` launcher
- [ ] Postinstall: `nocowboy mcp install nutausik || true`
- [ ] Add `tausik` to DEFAULT_LAUNCHES mapping in `launcher.ts`
