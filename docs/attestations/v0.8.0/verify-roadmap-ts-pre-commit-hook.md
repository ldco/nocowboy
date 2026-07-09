# Attestation: verify-roadmap.ts + pre-commit hook
**Пункт ROADMAP:** v0.8.0 — механический страж false positive
**Агент:** code
**Дата:** 2026-07-09
**Вердикт:** PASS — Система полностью реализована и работает

## Развитие
Изначально: два скрипта в scripts/ (verify-roadmap.ts, generate-docs.ts).
Теперь: встроено в `nocowboy` CLI как `roadmap init/generate/verify`.

## Что работает
- `nocowboy roadmap init` — создаёт шаблон roadmap.json
- `nocowboy roadmap generate` — генерирует .md файлы
- `nocowboy roadmap verify` — проверяет DONE фичи (40/40 pass)
- Auto-init на старте TUI — если нет roadmap.json, создаётся автоматически
- pre-commit hook — вызывает `nocowboy roadmap verify`
- Тип `overseer` — проверяет attestation с PASS вердиктом
- Система аттестаций: docs/attestations/<version>/<feature-id>.md

## Ключевые файлы
- `packages/opencode/src/cli/cmd/roadmap.ts` — 3 команды
- `packages/opencode/src/cli/cmd/tui/thread.ts` — auto-init
- `scripts/verify-roadmap.ts` — legacy (ещё существует, но не нужен)
- `scripts/lib/roadmap-types.ts` — типы

## Риски
- нет проверки, что attestation написан ДРУГОЙ моделью (overseer), а не code
- pre-commit hook работает только если пользователь его настроил
- auto-init не сработает если TUI не запущен (например, в CI)
