# NoCowboy — Roadmap

> **Только планируемое.** Что уже сделано → [CHANGELOG.md](CHANGELOG.md). Идеи на будущее → [BACKLOG.md](BACKLOG.md).
> **Версионирование:** x.y.z — z только для багфиксов. Роадмап планирует x.y.0.
> **Единственный источник:** `docs/roadmap.json`. `.md` файлы генерируются автоматически.
> **Правило:** DONE-пункт обязан иметь verify-директивы. Если регрессия ломает verify — DONE недействителен.

<!-- AUTO-GENERATED from docs/roadmap.json. Do not edit manually. -->

## v1.0.0 — Production

- Turso — production SQLite для multi-machine sync
  > Event-sourcing фундамент есть (src/sync/). Turso multi-machine — НЕ РЕАЛИЗОВАН. ADR: Phase 1 blocked.
  - src/sync/turso-sync.ts — push/pull sync engine
  - CLI: tausik turso setup/sync/status
  - turso секция в NutausikConfig (url, authToken, syncInterval)
  `verify:file packages/opencode/src/sync/turso-sync.ts`
- Publish: npm org @nocowboy + npm run publish-all
  > 9 MCP-пакетов готовы, publish-all.sh есть. Нужно создать npm org и запустить.
  `verify:cmd npm org ls nocowboy 2>/dev/null`

---
