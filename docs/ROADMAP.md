# NoCowboy — Roadmap

> **Sync:** NoCowboy releases are paired with NUTAUSIK releases.
> See [NUTAUSIK Roadmap](https://github.com/nocowboy/nutausik-js/blob/master/ROADMAP.md) for NUTAUSIK-side.
> **Versioning:** x.y.z — z = bugfixes only. Roadmap tracks x.y.0.
> **Status legend:** ✅ Done | 🟡 Partial | ❌ Nothing | ⚫ Dropped

---

## v0.7.0 ✅ Released — P2 UX & Safety + NUTAUSIK Phase 1

### P2-A UX & Safety

| # | Feature | Status | Code evidence |
|---|---|---|---|
| P2-A2 | **search_replace** tool — Aider-style SEARCH/REPLACE parser | ✅ | `src/tool/search_replace.ts` + tests |
| P2-A3 | **Branch-per-task** — `--branch` flag | ✅ | `src/git/index.ts` createBranch, `src/cli/cmd/run.ts` |
| P2-A4 | **Permission timeout** — auto-deny | ✅ | `src/config/config.ts` permission_timeout, `src/permission/index.ts` |
| P2-A5 | **Yolo mode** — `[YOLO]` button | ✅ | `src/nocowboy/components/yolo-button.tsx` |
| P2-A6 | ~~Autonomy slider~~ | ⚫ | Dropped — Yolo covers it |
| P2-A7-12 | **NUTAUSIK Auto-Wiring** | 🟡 | Phase 1 ✅ (hooks + NutausikDot). Phase 2-4 ❌ |
| P2-A13 | **Session handoff** — automatic | 🟡 | `nutausik-hooks.sh` exists but manual. No auto-save/load. |
| P2-A14 | **Escalation statuses** — DONE/DONE_WITH_CONCERNS/BLOCKED | ❌ | Zero code |
| P2-A15 | **Commands tab** — TUI sidebar | ❌ | Zero code |
| P2-A16 | ~~Documentation agent~~ → skill `write-docs` | ⚫ | Decision made. Code.txt needs doc-discipline lines. Skill not created. |

### P2-B Russian Language

| # | Feature | Status | Code evidence |
|---|---|---|---|
| P2-B1 | **Russian system prompts** | 🟡 | `nocowboy.txt` + `overseer.txt` are RU. code/debug/architect are EN. |
| P2-B2 | **Russian instruction files** (`instructions/ru/`) | ❌ | Directory doesn't exist |
| P2-B3 | **Russian LLM providers** (YandexGPT, GigaChat) | ❌ | Not in models-snapshot |
| P2-B4 | **`nocowboy.json` `lang` field** | ❌ | No lang field exists |
| P2-B5 | **UI Russian localization** | ❌ | No i18n framework. Some fragments translated ad-hoc. |

### P2-C Codebase Optimization

| # | Feature | Status | Code evidence |
|---|---|---|---|
| P2-C2 | **Optimize instructions** — merge overlaps | ✅ | 11 files (was 16). `cybersecurity.md` → puppetmaster MCP. |
| P2-C3 | **Optimize 16 commands** — deduplicate | 🟡 | 30 commands registered. Not deduplicated. |
| P2-C4 | **MCP server framework** → merge into NUTAUSIK | 🟡 | Analyzed (`docs/deferred/`). Not implemented. |

### Agent Instructions (v0.7.0)

| What | Status | Code evidence |
|---|---|---|
| AGENTS.md — forbidden phrases, behavioral corrections | ✅ | `AGENTS.md` |
| code.txt — engineering agent prompt | ✅ | `src/agent/prompt/code.txt` |
| debug.txt — strengthened debug agent | ✅ | `src/agent/prompt/debug.txt` |
| NutausikDot — 3-state TopBar indicator | ✅ | `src/nocowboy/components/nocowboy-bars.tsx` |
| Agent descriptions — short, no "native" | ✅ | `src/nocowboy/agent/index.ts` |

### NUTAUSIK Integration (v0.7.0)

| What | Status | Code evidence |
|---|---|---|
| SQLite rebuilt for Node 26 | ✅ | `better-sqlite3@12.11.1` |
| Port fix — nutausik 9204→9210 | ✅ | `nocowboy.json` |
| `.nutausik/` initialized | ✅ | `.nutausik/nutausik.db` (434KB) |
| NutausikDot indicator | ✅ | `src/nocowboy/components/nocowboy-bars.tsx` |
| Todo Injection — `context_inject` in prompt | ✅ | `src/session/system.ts` |
| NUTAUSIK v0.2.0 tools | ✅ | context_inject, handoff, coherence, loop_close |

---

## v0.8.0 🟡 — Full Auto-Wiring + Russian

| Domain | What | ↔ NUTAUSIK |
|---|---|---|
| P2-A7-12 Phases 2-4 | Full auto-wiring: task creation, log, verify on close | ↔ v0.3.0 |
| P2-A13 | Session handoff — auto save/load HANDOFF | ↔ handoff tools |
| P2-A14 | Escalation statuses | ↔ task status |
| P2-A15 | Commands tab in TUI | — |
| P2-B1..B5 | Russian language: full localization | — |
| P2-C3 | Command deduplication | — |

**NUTAUSIK companion:** v0.3.0

---

## v0.9.0 🟡 — Ecosystem

| Domain | What | Truth (cross-checked) |
|---|---|---|
| P3-A1 | **Diff sandbox** — isolate AI changes | ❌ Zero code. |
| P3-A2 | **Sandbox mode** — Docker execution | ❌ Zero code. Plugin references are for cloud, not sandbox. |
| P3-A3 | **2M token context** — deep context with budgeting | 🟡 `checkpoint-validator.ts` has token budgeting. Not 2M. |
| P3-A4 | **Tree-sitter repomap** — regex→AST | ✅ `src/nocowboy/repomap.ts` exists! |
| P3-A5 | **MCP marketplace** — `mcp search` | ❌ Zero code. |
| P3-A6 | **Vector store switcher** — LanceDB | ✅ `src/nocowboy/lancedb.ts` exists! |
| P3-A7 | **Offline mode** — Ollama | ❌ Zero code. |
| P3-A8 | **Per-task cost tracking** | ✅ `src/nocowboy/session/cost-propagation.ts` exists! |
| P4.1 | **Channels** — webhooks | ❌ Tools in MCP but not stable. |

**NUTAUSIK companion:** v0.4.0

---

## v1.0.0 🟡 — Production

### Lawer (152-ФЗ) — Cross-checked vs Code

| # | Feature | Status | Truth |
|---|---|---|---|
| P3-B1 | **License** — RF proprietary | ❌ | **No LICENSE file exists.** Project is unlicensed. |
| P3-B2 | **Consent dialogs** — Art. 9 | 🟡 | `share_consent` is UX only, not legal consent. Skill has template. |
| P3-B3 | **Data localization** — Art. 21 | ❌ | SQLite local by accident, no RU logic. |
| P3-B4 | **Right to deletion** — `nocowboy forget` | ❌ | Zero code. |
| P3-B5 | **Roskomnadzor template** — Art. 22 | 🟡 | Skill has consent template. No RKN notification. |
| P3-B6 | **Legal research** — does `.nutausik/nutausik.db` contain personal data? Task names, file paths, memory, session logs — are these ПДн under 152-ФЗ Art. 3? Does laptop travel violate Art. 21 localization? What about GDPR? **Requires RF-qualified lawyer opinion.** | 🟡 | Research task, no code |
