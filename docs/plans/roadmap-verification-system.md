# Roadmap Verification System

**Статус:** план  
**Дата:** 2026-07-08  
**Цель:** исключить false positive DONE-статусы в ROADMAP.md через механическую + агентную верификацию

---

## 1. Проблема

ROADMAP.md содержит ложные `**DONE**`. Агенты пишут DONE без проверки. Ни один слой защиты (NUTAUSIK, SENAR, critical rules) не сработал, потому что они привязаны к NUTAUSIK-задачам, а ROADMAP.md — текстовый файл.

Руткоз: **два несвязанных источника истины** — ROADMAP.md (текст) и NUTAUSIK (SQLite). Между ними нет моста.

---

## 2. Решение

### 2.1 Три документа — одна система

```
BACKLOG.md          ROADMAP.md           CHANGELOG.md
(ручной, идеи)      (план + verify)      (свершившееся)
    │                    │                     ▲
    │  ручной перенос    │    DONE + verify     │
    └─────────────────→  └─────────────────────┘
                          только при релизе
```

| Документ | Кто пишет | Кто проверяет | Защита |
|----------|-----------|---------------|--------|
| **BACKLOG.md** | Человек/агент, свободно | Никто | Не нужна — это просто идеи |
| **ROADMAP.md** | Агент, но с verify-директивами | `verify-roadmap.ts` на pre-commit | Механическая: file/grep/test/typecheck |
| **CHANGELOG.md** | Скрипт при релизе | Агент post-release | Сверка с кодом + ROADMAP |

### 2.2 Verify-директивы (инлайн, видимые)

Каждый пункт ROADMAP со статусом DONE обязан иметь verify-директивы:

| Тип | Синтаксис | Что проверяет |
|-----|-----------|---------------|
| `verify:file` | `` `verify:file src/sync/turso-sync.ts` `` | Файл существует |
| `verify:grep` | `` `verify:grep src tursoSync` `` | Строка/символ найден в директории |
| `verify:test` | `` `verify:test test/sync/turso.test.ts` `` | Указанные тесты проходят |
| `verify:typecheck` | `` `verify:typecheck` `` | `bun run typecheck` возвращает 0 |
| `verify:agent` | `` `verify:agent` `` | Агент читает код, сверяет с заявленным, пишет attestation |

Пример пункта в ROADMAP.md:

```markdown
## v1.0.0 — Production

- **DONE** /share — built-in template  
  `verify:file src/share/share-next.ts`  
  `verify:grep src SessionShare`
- Turso — production SQLite  
  `verify:file src/sync/turso-sync.ts`  
  `verify:grep src tursoSync`  
  `verify:test test/sync/turso.test.ts`
```

### 2.3 Жизненный цикл пункта ROADMAP

| Стадия | Что происходит |
|--------|---------------|
| **1. ВХОД** | Пункт из BACKLOG попадает в ROADMAP. Сразу получает verify-директивы. Статус: без DONE. |
| **2. РАБОТА** | Агент пишет код. Может локально дёргать verify для самопроверки. |
| **3. ПРЕТЕНДЕНТ** | Агент считает работу законченной. Запускает ВСЕ verify-директивы. Все 5 — PASS. |
| **4. DONE** | Агент пишет `**DONE**`, коммитит. Pre-commit перепроверяет все DONE-пункты. |
| **5. РЕЛИЗ** | При релизе версии: все DONE → CHANGELOG, из ROADMAP удаляются. |

**Критическое правило:** DONE — не декларация агента. DONE — состояние, при котором все verify-директивы возвращают PASS. Если регрессия сломает тест — verify упадёт на pre-commit, и DONE станет недействительным, несмотря на текст `**DONE**`.

### 2.4 Attestations

`docs/attestations/<версия>/` — человеческие подписи + выводы `verify:agent`.

**Правило:** Без attestation для `verify:agent` DONE недействителен. Pre-commit проверяет: если есть `verify:agent` в директивах, обязан существовать attestation-файл.

Формат attestation:
```markdown
# Attestation: Turso multi-machine sync
**Пункт ROADMAP:** v1.0 — Turso production SQLite
**Агент:** NoCowboy / deepseek-v4-pro
**Дата:** 2026-07-08
**Вердикт:** PASS

## Доказательства
- `src/sync/turso-sync.ts` (стр. 45-89): реализован push/pull через @libsql/client
- Интеграционный тест: PASS

## Риски
- Нет обработки конфликтов при одновременной записи
```

### 2.5 NUTAUSIK — где входит

| Слой | Без NUTAUSIK | С NUTAUSIK (когда готов) |
|------|-------------|--------------------------|
| G0 | `verify-roadmap.ts` проверяет наличие директив | NUTAUSIK task creation — AC обязательны |
| G1 | `verify:file`, `verify:grep`, `verify:test`, `verify:typecheck` | NUTAUSIK verify suites (tsc, eslint, ...) |
| G2 | `verify:agent` — attestation вручную | NUTAUSIK `task_verify` + **ed25519 signed receipt** |
| G3 | `release.ts` + агент сверяет CHANGELOG | NUTAUSIK QG-2: все задачи верифицированы, receipts подписаны |
| G4 | Агент перепроверяет CHANGELOG | NUTAUSIK audit trail + loop_close |

**Дублирования нет.** NoCowboy делает быструю механику (file/grep/test). NUTAUSIK делает глубокий агентный анализ (receipt + audit). NoCowboy не анализирует код агентом. NUTAUSIK не проверяет существование файлов.

### 2.6 verify-roadmap.ts

Скрипт в `scripts/verify-roadmap.ts`. Запуск: `bun run scripts/verify-roadmap.ts`

**Логика:**
1. Парсит ROADMAP.md
2. Для каждого пункта со статусом `**DONE**` извлекает verify-директивы
3. Выполняет каждую директиву:
   - `verify:file <path>` → `fs.existsSync(path)` — FAIL если нет
   - `verify:grep <dir> <pattern>` → `grep -rq pattern dir/` — FAIL если не найдено
   - `verify:test <path>` → `bun test path` — FAIL если тесты падают
   - `verify:typecheck` → `bun run typecheck` — FAIL если ошибки
   - `verify:agent` → проверяет наличие attestation-файла — FAIL если нет
4. Выводит результат: каждый пункт — PASS или FAIL с причиной
5. Хотя бы один FAIL → exit 1

**Интеграция:** Husky pre-commit — `bun run scripts/verify-roadmap.ts || exit 1`

### 2.7 Базовое vs глубокое

- **Pre-commit (быстро, <30 сек):** `verify:file`, `verify:grep`, `verify:typecheck`
- **Pre-push (медленно, агент):** `verify:test`, `verify:agent`
- **Релиз (полный цикл):** все пять + сверка CHANGELOG

---

## 3. Очистка docs/

### Удалить
| Файл/папка | Причина |
|-----------|---------|
| `docs/guides/nutausik-roadmap.md` | Чужой роадмап, должен быть в nutausik-js |
| `docs/NUTAUSIK.md` | Чужой репо — не здесь |
| `docs/deferred/` | Вся папка. Содержимое → BACKLOG |
| `docs/milestones/` | Вся папка. DONE, неактуально |

### В архив (`docs/archive/`)
| Файл | Причина |
|------|---------|
| `docs/guides/nutausik-analysis.md` | Исторический анализ архитектуры NUTAUSIK |
| `docs/guides/tausik-js-port.md` | Исторический статус порта |
| `docs/guides/feature-overlap-decisions.md` | Временный документ принятия решений |
| `docs/plans/p1-memory-system.md` | DONE (v0.8.0) |
| `docs/plans/p2-a7-agent-handoff-dialog.md` | DONE (v0.8.0) |
| `docs/plans/p2-mcp-management.md` | DONE (v0.9.0) |
| `docs/plans/p3-add-hooks-mcp-server.md` | DONE (v0.8.0) |
| `docs/agentic_engineering_theses.md` | Философский документ, не операционный |

### В BACKLOG (идеи для будущих версий)
Содержимое `docs/deferred/` + оставшиеся планы без статуса DONE:
- `docs/plans/agent-quality-enforcement.md` → BACKLOG
- `docs/plans/p2-a4-permission-timeout.md` → BACKLOG
- `docs/plans/p2-c1-agent-audit.md` → BACKLOG
- `docs/plans/p3-self-being-meta-cognitive.md` → BACKLOG
- `docs/deferred/p2-c2-instructions-analysis.md` → BACKLOG
- `docs/deferred/p2-c4-mcp-framework-analysis.md` → BACKLOG

### Оставить на месте
| Файл | Причина |
|------|---------|
| `docs/reference/` | Вся папка — технические справки |
| `docs/archive/` | Исторические документы |
| `docs/legal/` | 152-ФЗ compliance |
| `docs/guides/publish.md` | Полезный гайд по публикации |
| `docs/guides/performance-optimization.md` | Полезный гайд |
| `docs/dogfooding-workflow.md` | Полезный гайд разработки |

### Переписать заново
| Файл | Что будет |
|------|-----------|
| `docs/ROADMAP.md` | Новый формат: версии + пункты с verify-директивами. Ложные DONE убраны. |
| `docs/BACKLOG.md` | Идеи из очищенных планов + существующий бэклог |
| `docs/README.md` | Навигация по новой структуре |

---

## 4. Порядок реализации

### Шаг 1: Очистка docs/
Удалить, переместить, переписать файлы согласно разделу 3.

### Шаг 2: Новый ROADMAP.md
Создать ROADMAP.md в новом формате:
- Убрать все ложные DONE (Turso, Sync, tausik CLI)
- Для каждого DONE-пункта добавить verify-директивы
- Пункты без DONE оставить с verify-директивами (на будущее)

### Шаг 3: Новый BACKLOG.md
Собрать все идеи из очищенных планов в единый BACKLOG.

### Шаг 4: scripts/verify-roadmap.ts
Реализовать скрипт верификации:
- Парсинг ROADMAP.md
- Выполнение verify-директив
- Вывод PASS/FAIL
- exit 1 при любом FAIL

### Шаг 5: Husky pre-commit
Добавить в `.husky/pre-commit`:
```bash
cd packages/opencode && bun run typecheck && cd ../.. && bun run scripts/verify-roadmap.ts
```

### Шаг 6: Создать attestations/
Создать `docs/attestations/` с README.md, объясняющим формат и правила.

### Шаг 7: Проверка
- Запустить `verify-roadmap.ts` на новом ROADMAP.md — все DONE должны быть PASS
- Попробовать закоммитить — pre-commit должен пропустить
- Намеренно сломать один verify (удалить файл) — pre-commit должен заблокировать

---

## 5. Что НЕ входит в этот план
- NUTAUSIK signed receipts (ed25519) — будет в плане NUTAUSIK G2
- Release script + auto-CHANGELOG — будет отдельным планом
- `verify:agent` интеграция с NUTAUSIK — когда NUTAUSIK получит QG-2
