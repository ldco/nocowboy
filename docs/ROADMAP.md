tt# NoCowboy — Roadmap

Only NOT implemented features. See CHANGELOG.md for completed items.

---

## Архитектура: три слоя

### Слой 1 — Agents (КТО делает работу)

| Агент | Тип | Модель (default) | Группы инструментов | Назначение |
|-------|-----|-----------------|---------------------|------------|
| **code** | coding | Flash | read, edit, command, mcp | Пишет код, рефакторит, тестирует |
| **architect** | coding | Pro | read, command, mcp + edit(docs/*.md) | Планы, ADR, C4, дизайн системы |
| **debug** | coding | Flash | read, edit, command, mcp | Систематическая отладка |
| **overseer** | review | **Kimi K2/Pro** | read, command, mcp | Traycer-like: оркестрирует code, ревьюит (cross-vendor) |
| **nocowboy** | automation | Flash | Все | OpenClaw-like: браузер, файлы, система, anything |

**Always-available meta-tools:** `task`, `question`, `todowrite`

**Tool groups:** `read` → read/grep/glob/list/codebase_search/semantic_search · `edit` → edit/write · `command` → bash · `mcp` → все MCP

### Слой 2 — Instructions (КАК делается работа)

14 files in `packaging/config/instructions/` (was 16: no-shortcuts merged into eng-rules, cybersecurity → puppetmaster MCP)

### Слой 3 — Nutausik MCP (УПРАВЛЯЕТ работой)

80+ инструментов на порту 9204: Tasks, Epics/Stories, Memory, Decisions, Gates, Specs, ADAPT, Verification, Brain, FTS, Sessions, Web.

---

## ❌ NOT IMPLEMENTED

### P2 — UX, Safety & Russian

#### P2-A UX & Safety

| # | Feature | From | Effort |
|---|---|---|---|
| P2-A2 | **Search/replace edit format** — Aider-style block-diff parser | Aider | Medium ✅ Done — `search_replace` tool |
| P2-A3 | **Branch-per-task** (`nocowboy plan --branch`) | Plandex | Medium ✅ Done — `--branch` flag, `Git.createBranch` |
| P2-A4 | **Permission timeout** — auto-deny after N seconds | Claude Code | Low ✅ Done — `experimental.permission_timeout` |
| P2-A5 | **Yolo mode button** — TUI toggle, `"*": "allow"`, visual indicator | Claude Code | Low ✅ Done — `YoloButton` in prompt bar |
| P2-A6 | **Autonomy slider** — full auto ↔ step-by-step in Settings | Plandex | Low |
| P2-A7 | **NUTAUSIK integration** — hybrid ProjMgmt | Self | High 🟡 Partially — MCP runs, not integrated |
| P2-A8 | **UNIFY loop closure** — plan vs actual, SUMMARY.md, STATE.md | Paul | Medium |
| P2-A9 | **Execute/Qualify loop** — verify vs AC before next task | Paul | Medium |
| P2-A10 | **Acceptance-Driven Development** — BDD (Given/When/Then), AC linked to tasks | Paul | Medium |
| P2-A11 | **Diagnostic failure routing** — intent/spec/code error classification | Paul | Low |
| P2-A12 | **Coherence check** — plan validated against PROJECT/MEMORY/STATE/ROADMAP | Paul | Medium |
| P2-A13 | **Session handoff/pause** — `/pause`, `/resume`, HANDOFF files | Paul | Medium ⚠️ Partially — resume exists |
| P2-A14 | **Escalation statuses** — DONE / DONE_WITH_CONCERNS / BLOCKED | Paul | Low |
| P2-A15 | **Commands tab** — новая вкладка в TUI (Info → History → **Commands** → Settings). Список всех команд с описанием, примерами, возможностью кликнуть/выполнить. Команды сгруппированы по категориям (Git, Memory, MCP, Session). Иконки/цвета. Фильтр/поиск. | Self | Medium |

#### P2-B Russian Language

| # | Feature | Effort |
|---|---|---|
| P2-B1 | **Russian system prompts** for all agents | Medium 🟡 Partially — nocowboy is Russian |
| P2-B2 | **Russian instruction files** (`instructions/ru/`) | Medium |
| P2-B3 | **Russian LLM provider preference** (YandexGPT, GigaChat) | Medium |
| P2-B4 | **`nocowboy.json` `lang` field** | Low |
| P2-B5 | **UI Russian localization** — TUI labels, errors, help | High |

#### P2-C Codebase Optimization

| # | Feature | Effort |
|---|---|---|
| P2-C2 | **Optimize instructions** — fix branding, merge overlaps, PM code moved to MCP | Medium ✅ Done — 16→13 files, cybersecurity.md → puppetmaster MCP pm_knowledge |
| P2-C3 | **Optimize 16 commands** | Medium |
| P2-C4 | **Revise MCP server framework** — merge into NUTAUSIK | High 📋 Analyzed (see docs/deferred/) |

### P3 — Ecosystem, Lawer & Reach

#### P3-A Ecosystem

| # | Feature | From | Effort |
|---|---|---|---|
| P3-A1 | **Diff review sandbox** — AI changes isolated until accepted | Plandex | High |
| P3-A2 | **Sandbox mode** — Docker-insulated command execution | OpenHands | High |
| P3-A3 | **2M token context** — deep context with token budgeting | Claude Code + Plandex | High |
| P3-A4 | **Tree-sitter repomap** — regex → AST | Plandex | Medium |
| P3-A5 | **MCP server marketplace** (`mcp search`) | Cline | Medium |
| P3-A6 | **Vector store switcher** — SQLite / LanceDB / Qdrant | Self | Medium 🟡 Partially |
| P3-A7 | **Offline mode** — local LLM via Ollama | Self | Medium 🟡 Partially |
| P3-A8 | **Per-task cost tracking** — ledger per task | Paul/Whale | Medium |

#### P3-B Lawer (152-ФЗ)

| # | Feature | Effort |
|---|---|---|
| P3-B1 | **License for Russian market** — proprietary, 152-ФЗ compliant, RF jurisdiction. Replace MIT/Apache. Drafting + legal review. | High |
| **P3-L1** 🆕 | **Create NoCowboy License** — proprietary license under Russian Federation law. Covers: permitted use, restrictions, liability under 152-ФЗ, IP rights, termination. Must be reviewed by RF-qualified lawyer. | High |
| P3-B2 | **Consent dialogs** — Russian, Art. 9 | Medium |
| P3-B3 | **Data localization** — Art. 21 | High |
| P3-B4 | **Right to deletion** — `nocowboy forget` | Medium |
| P3-B5 | **Roskomnadzor template** | Low |

### P4 — Polish & Future

| # | Feature | From | Effort |
|---|---|---|---|
| P4.1 | **Channels** — webhooks push CI/chat into TUI sessions | Claude Code | Medium 🟡 Tools exist, not stable |
| P4.2 | **Russian LLM providers** (YandexGPT, GigaChat) | Self | High |
| P4.3 | **Share chat / sync between machines** | Self | High 🟡 CLI exists, backend not deployed |
| P4.4 | **Turso driver swap** — `bun:sqlite` → `@tursodatabase/database` | Self | High (blocked) |

## 📦 Publish queue (blocked on `@nocowboy` npm org)

| Package | Status |
|---|---|
| `nocowboy` meta-package | ❌ |
| `@nocowboy/mcp-*` (6 servers) | ❌ |
| `@nocowboy/mcp-puppetmaster` | ❌ needs `dist/` built |
| `@nocowboy/mcp-nutausik` (NUTAUSIK) | ❌ 62 TS files ready, needs publish |
