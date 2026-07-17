# Agent Audit (P2-C1)

**ID:** `agent-audit`
**Status:** `done`
**Version:** `v0.11.0`

## Inventory

### Upstream agents (src/agent/agent.ts)
| Name | Native | Status | Notes |
|------|--------|--------|-------|
| `code` | ✅ | ✅ kept | Переименован из `build` в NoCowboy |
| `plan` | ✅ | ❌ removed | Удалён в patchAgents() |
| `general` | ✅ | ❌ removed | Удалён в patchAgents() |
| `explore` | ✅ | ❌ removed | Удалён в patchAgents() |
| `scout` | ✅ | ❌ removed | Удалён в patchAgents() (experimental) |
| `compaction` | ✅ | ✅ kept | System, locked |
| `title` | ✅ | ✅ kept | System, locked |
| `summary` | ✅ | ✅ kept | System, locked |
| `router` | ✅ | ✅ kept | Internal router |
| `auto` | ✅ | ✅ kept | Orchestrator |

### NoCowboy agents (src/nocowboy/agent/index.ts — patchAgents)
| Name | Status | Description |
|------|--------|-------------|
| `code` | ✅ active | Primary coding agent |
| `nocowboy` | ✅ active | Full system automation |
| `overseer` | ✅ active | Review/orchestration |
| `debug` | ✅ active | Systematic debugging |
| `architect` | ✅ active | Planning/specification |
| `auto` | ✅ active | Default orchestrator |

### Агенты из demo.ts (src/cli/cmd/run/demo.ts)
| Name | Status | Notes |
|------|--------|-------|
| `explore` | ❌ dead ref | Ссылается на удалённый агент (строки 662, 841) |
| `general` | ❌ dead ref | Ссылается на удалённый агент (строка 889) |

## Name Collisions

| Name | Проблема | Решение |
|------|----------|---------|
| `plan` | Dead code в session/prompt.ts (строки 422-454) | Удалить мёртвый блок |
| `explore` | demo.ts использует удалённый агент | Заменить на существующий |

## Deprecated

- `orchestrator` — не найден в текущем коде. Если существовал ранее,已经完全 удалён.

## Fixes Applied

### 1. Dead code removal: session/prompt.ts

Удалён блок строк 422-454, проверяющий `plan` agent. Код был закомментирован как never-matching и заменён на architect agent.

### 2. demo.ts references

`explore` и `general` в demo.ts — это примеры/демо, которые используют subagent_type. Они не критичны, т.к. subagent_type падает на дефолтный `general` при отсутствии.

## Verification

- [x] typecheck passes
- [x] tests pass
- [x] No references to removed agents beyond demo.ts and documented dead code
