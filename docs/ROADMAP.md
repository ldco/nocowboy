# NoCowboy — Roadmap

> **Sync:** NoCowboy releases are paired with NUTAUSIK releases.
> See [NUTAUSIK Roadmap](https://github.com/nocowboy/nutausik-js/blob/master/ROADMAP.md) for NUTAUSIK-side details.
> **Versioning:** x.y.z — z is for bugfixes only. This roadmap tracks x.y.0 releases.

---

## v0.7.0 ✅ Released — P2 UX & Safety + NUTAUSIK Phase 1

| Domain | What |
|---|---|
| P2-A2 | **search_replace** tool — Aider-style SEARCH/REPLACE block parser |
| P2-A3 | **Branch-per-task** — `--branch` flag, `Git.createBranch` |
| P2-A4 | **Permission timeout** — `experimental.permission_timeout` |
| P2-A5 | **Yolo mode** — `[YOLO]` button in prompt bar |
| Instructions | AGENTS.md (forbidden phrases, behavioral corrections), code.txt, debug.txt |
| Agent UI | Short descriptions, no "native" badge hiding |
| NUTAUSIK | Fix SQLite (Node 26), port 9210, `.nutausik/` init, NutausikDot in TopBar |
| NUTAUSIK | v0.2.0 — context_inject, handoff_save/load, coherence_check, loop_close |
| Todo Injection | `system.ts` calls `nutausik_context_inject` on prompt assembly |
| P2-A16 | ~~Documentation agent~~ → skill `write-docs` instead |

**NUTAUSIK companion:** v0.2.0

---

## v0.8.0 🟡 — Full Auto-Wiring + Russian

| Domain | What | ↔ NUTAUSIK |
|---|---|---|
| P2-A7-12 Phase 2-4 | Full NUTAUSIK auto-wiring: session → task, log edits, verify on close, coherence check | ↔ v0.3.0 hooks |
| P2-A13 | **Session handoff** — automatic HANDOFF at session end, auto-load on start | ↔ `handoff_save/load` tools |
| P2-A14 | **Escalation statuses** — DONE / DONE_WITH_CONCERNS / BLOCKED | ↔ task status field |
| P2-A15 | **Commands tab** — TUI sidebar tab (Info→History→Commands→Settings) | — |
| P2-B1..B5 | **Russian language** — system prompts, UI labels, YandexGPT/GigaChat preference, `lang` field | — |
| P2-C3 | **Optimize 16 commands** — deduplicate, merge overlaps | — |
| P2-C4 | **MCP server framework** — merge into NUTAUSIK where possible | ↔ v0.3.0 |

**NUTAUSIK companion:** v0.3.0

---

## v0.9.0 🟡 — Ecosystem (Sandbox + Deep Context)

| Domain | What | ↔ NUTAUSIK |
|---|---|---|
| P3-A1 | **Diff review sandbox** — isolate AI changes until accepted (Plandex-style) | ↔ v0.4.0 |
| P3-A2 | **Sandbox mode** — Docker-insulated command execution (OpenHands-style) | ↔ v0.4.0 |
| P3-A3 | **2M token context** — deep context with token budgeting | — |
| P3-A4 | **Tree-sitter repomap** — regex → AST file indexing (Aider-style) | ↔ v0.4.0 |
| P3-A5 | **MCP server marketplace** (`mcp search`) — Cline-style | — |
| P3-A6 | **Vector store switcher** — SQLite / LanceDB / Qdrant | — |
| P3-A7 | **Offline mode** — local LLM via Ollama | — |
| P3-A8 | **Per-task cost tracking** — ledger per task | ↔ v0.4.0 metrics |
| P4.1 | **Channels** — webhooks push CI/chat into TUI sessions | — |

**NUTAUSIK companion:** v0.4.0

---

## v1.0.0 🟡 — Production (Law + Market)

| Domain | What | ↔ NUTAUSIK |
|---|---|---|
### P3-B Lawer (152-ФЗ) — Cross-checked vs Code

| # | Feature | Code exists? | Truth |
|---|---|---|---|
| P3-B1 | **License** — proprietary RF license | ❌ | **No LICENSE file at all.** Project is unlicensed. `russian-it-law` skill has Art. 3-24 reference, not a license text. |
| P3-B2 | **Consent dialogs** — Art. 9 | 🟡 | `share_consent` dialog exists (UX only, not legal consent). Skill has consent template, no code uses it. |
| P3-B3 | **Data localization** — Art. 21 | ❌ | SQLite is local by accident, not by design. No RU-specific localization logic. |
| P3-B4 | **Right to deletion** — `nocowboy forget` | ❌ | No command exists. Zero code. |
| P3-B5 | **Roskomnadzor template** | 🟡 | Skill has consent template (Art. 9). No RKN notification templates. |

