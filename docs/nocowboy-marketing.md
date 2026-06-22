# NoCowboy — the composite AI coding harness

**Date:** June 2026
**Status:** Marketing / positioning
**Audience:** Russian developers, team leads, CTOs/CISOs evaluating AI coding harnesses
**Companion docs:** `nocowboy-genesis.md` (due-diligence), `kilocode-fork-playbook.md` (technical reference)

> MiMo's brains. KiloCode's reach. Our own proprietary engineering toolchain. Pre-assembled for the Russian market. **No cowboy coding.**

---

## 1. The honest pitch

Every coding harness on the market is good at one thing and asks you to live without the rest.

NoCowboy is not sold on a feature competitors *can't physically obtain* — it's sold on **the assembly**: the native intelligence of MiMo-Code, the multi-surface reach of KiloCode, and a toolchain we wrote ourselves — already integrated, tuned over 12 months, and aimed at the Russian market.

Buying the open parts is easy. Owning the proprietary parts, and hardening the whole stack into one product, is the moat.

> **Note on models:** model access (DeepSeek, GigaChat, etc.) is a property of the *endpoint*, not the harness. Any agent can point at any reachable API. NoCowboy does not claim model access as a differentiator — this document compares **harness against harness**.

---

## 2. What's actually ours

NoCowboy stands on open foundations and uses some external tools. The layer that makes it *NoCowboy* is **our own code**.

**OURS — proprietary IP (competitors do not have this code):**

| Asset | Type | Source |
|---|---|---|
| Constitution (51 LOC) | MCP toolserver | written by us |
| Score Engine (90 LOC) | MCP toolserver | written by us |
| Contract Guard (87 LOC) | MCP toolserver | written by us |
| ncp-validator (112 LOC) | MCP toolserver | written by us |
| PuppetMaster (26 tools) | MCP toolserver | written by us |
| Ralph (PRD executor) | MCP toolserver | written by us |
| No-shortcuts engine | Instruction set | authored by us |
| 152-ФЗ + cybersecurity rules | Instruction set | authored by us |
| 6 agents, 16 commands, skills, the integration | Mixed | authored by us |

**EXTERNAL — we use, not ours (anyone can install these):**
Tausik (external project-management framework), Context7, SQLite, Puppeteer, Git.

**INHERITED — from the base (shared, not unique vs the base):**
KiloCode → multi-surface, 500+ model routing, semantic search. MiMo (porting) → memory, Dream/Distill, Goal Judge, Compose.

---

## 3. Matrix A — native harness capabilities

These live *inside the binary*. A competitor **cannot** add them by connecting an MCP server or pasting a prompt — they hook the agent's own loop.

Legend: ✅ native · ⚠️ partial · ❌ none · ✅* NoCowboy roadmap (porting from MiMo)

| Native capability | NoCowboy | Claude Code | OpenCode | KiloCode | MiMo-Code | Aider | Qwen / Gemini CLI |
|---|---|---|---|---|---|---|---|
| CLI + TUI | ✅ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| VS Code extension | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| JetBrains plugin (≈40% RU share) | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Built-in 500+ model routing | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Native semantic search (embeddings) | ✅ | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Persistent memory (inject + checkpoint + reconstruct) | ✅* | ⚠️ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Dream / Distill (self-improvement) | ✅* | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Goal Judge (stop-logic override) | ✅* | ⚠️ | ❌ | ⚠️ | ✅ | ❌ | ❌ |
| Compose runtime (plan→TDD→build→review→verify→merge) | ✅* | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| MCP host (can connect external tools) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |

**How to read it honestly:** today the exclusive native edge over CLI-only rivals is multi-surface + semantic search (shared with KiloCode). The ✅* rows are being ported from MiMo — and they make NoCowboy the **only multi-surface product** carrying them, because MiMo is a research repo, not a product.

---

## 4. Matrix B — our proprietary toolchain (this is the moat)

These are MCP toolservers and rule-sets **we wrote**. MCP is an open *protocol*, not an open *implementation* — competitors speak MCP, but they **do not have our code**, so the honest mark for them is ❌. (External tools we merely *use* — Tausik, Context7, Git — are excluded here, because anyone can install those.)

| Our proprietary asset | What it does | NoCowboy | Anyone else |
|---|---|---|---|
| **Constitution** | AST code-quality rules, enforced pre-commit | ✅ | ❌ would have to rebuild |
| **Score Engine** | Objective quality scoring + history | ✅ | ❌ |
| **Contract Guard** | API breaking-change detection | ✅ | ❌ |
| **ncp-validator** | NCP spec validation / diff | ✅ | ❌ |
| **PuppetMaster** | Framework build/deploy/db/test ops (26 tools) | ✅ | ❌ |
| **Ralph** | PRD → autonomous story-by-story execution | ✅ | ❌ |
| **No-shortcuts engine** | Root-cause-only, anti-suppression discipline | ✅ | ❌ (the "NoCowboy") |
| **152-ФЗ layer** | Data-localization posture, Roskomnadzor + consent templates | ✅ | ❌ — no Western fork will build this |

---

## 5. Why "NoCowboy"

Every other harness optimizes for *speed of output*. NoCowboy optimizes for *correctness*. The name is the philosophy: **no cowboy coding** — no hacks, no `// TODO`, no swallowed errors, no "good enough for now."

The proprietary discipline layer enforces it on every change:

- **Root-cause only** — fix the broken code, never patch the caller.
- **No suppressions** — bans `@ts-ignore`, empty `catch`, disabled lint rules, lowered test bars.
- **Constitution gate** — AST quality rules run *before* every commit.

You are not buying a faster typist. You are buying a senior engineer's discipline, on every line.

---

## 6. What we honestly do NOT claim as a moat

- **Tausik, Context7, SQLite, Puppeteer, Git** — external MCP servers. We use them; so can anyone.
- **Multi-surface, model routing, semantic search** — inherited from KiloCode (shared, not unique vs KiloCode).
- **Memory / Dream / Distill / Goal Judge / Compose** — from MiMo; our edge is shipping them in a real, supported, multi-surface product, which MiMo is not.
- **Model access** — a property of the endpoint, not the harness.

Stating this plainly is the point: the claims that remain — our six proprietary toolservers, the discipline engine, the 152-ФЗ layer, and the pre-assembled integration — survive scrutiny line by line.

---

## 7. Who should switch

- **From Aider / Qwen CLI / Gemini CLI** → multi-surface (incl. JetBrains), native memory, and our proprietary quality/PRD toolchain.
- **From OpenCode / KiloCode** → the MiMo native layer + six proprietary toolservers you'd otherwise build yourself.
- **From MiMo-Code** → MiMo's brains without MiMo's "abandoned research repo" reality — as a product.
- **From Claude Code** → openness, model freedom, and a discipline + compliance layer it has no answer for.

---

## 8. The one-line positioning

**The only harness that combines MiMo's native intelligence, KiloCode's multi-surface reach, and a proprietary engineering toolchain you can't get anywhere else — pre-assembled, disciplined, and built for the Russian market.**

*No cowboy coding.*
