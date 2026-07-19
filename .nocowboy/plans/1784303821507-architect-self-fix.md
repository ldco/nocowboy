# Agents Self-Fix — подключить NUTAUSIK ко всем агентам

**Created:** 2026-07-19 | **Status:** Final
**Problem:** Месяц строилась инфраструктура (NUTAUSIK — 129 инструментов, handoff, memory, specs, roadmap). Ни один агент её не использует. Architect заблокирован (`mcp: "deny"`). Других агентов нет.

---

## Проблема #1: NUTAUSIK не подключён к агентам

### Данные (верифицировано чтением конфигов)

| Факт | Значение |
|------|----------|
| NUTAUSIK MCP сервер | ✅ жив, порт 9210, 129 tools |
| handoff / memory / specs | ✅ работают |
| Агентов в системе | **1** (architect) |
| Architect `mcp` permission | **`"deny"`** |
| `architect.md` упоминает NUTAUSIK | **0 раз** |
| Глобальный конфиг агентов | 1 (architect) |
| Проектный конфиг агентов | пуст |
| Другие agent-файлы | не существуют |

### Почему это не сделано

NUTAUSIK строился как отдельный проект. Когда его подключили к NoCowboy как MCP сервер — добавили в список MCP, но **не обновили агентов**. Они остались с `mcp: "deny"` или без секции `mcp` вообще. Инструменты существуют, но агенты не имеют к ним доступа.

---

## Проблема #2: Агенты останавливаются посреди фичи

### Симптомы

- «Продолжаем?» / «Что дальше?» — после каждого подшага
- «Phase 2 или Phase 3?» — когда фазы пронумерованы
- Остановка **посередине** фичи — например, сделал Phase 1 из 3 и спрашивает
- Вопросы, ответы на которые уже есть в плане

### Почему это происходит

Агенты не имеют правила «не останавливаться пока фича не закончена». Они воспринимают каждый шаг как отдельную задачу и после каждого шага спрашивают подтверждение.

---

## Fix: 4 шага

### Шаг 1: Исправить architect — доступ к NUTAUSIK + agent.md

**Файл:** `~/.config/nocowboy/nocowboy.jsonc`

Изменить в `agent.architect.permission`:
```json
"mcp": "deny"
```
на:
```json
"mcp": {
  "nutausik_*": "allow",
  "*": "deny"
}
```

**Файл:** `~/.config/nocowboy/agent/architect.md`

Добавить в начало (перед методологией):

```markdown
## ⚠️ MANDATORY PRE-FLIGHT

Перед КАЖДЫМ анализом:
1. nutausik_handoff_load — контекст прошлой сессии
2. nutausik_memory_surface — последние памяти
3. nutausik_memory_search(query="<тема>") — релевантные памяти
4. Прочитать docs/roadmap.json + .nocowboy/specs/
5. Прочитать код (glob + grep + read) — не делать выводов без кода

## 🚫 FORBIDDEN

- «Продолжаем?» / «Что дальше?» / «Сделать X?» → НЕТ. Просто делай.
- «Phase 2 или Phase 3?» → НЕТ. Фазы пронумерованы, иди по порядку.
- Останавливаться посреди плана → НЕТ. План = ВСЕ фазы до последней.
- Ранжировать пункты плана по важности, решать что пропустить/отложить → НЕТ. План = контракт. Все пункты обязательны.
- «Теперь я вижу ПОЛНУЮ картину» без ссылок на код → НЕТ. Ложь.
- Задавать вопрос, ответ на который уже есть в плане → НЕТ. Читай план.

## ✅ MANDATORY OUTPUT

После КАЖДОГО решения:
1. Сохранить spec: создать/обновить .nocowboy/specs/<feature>.md
2. Обновить docs/roadmap.json (если статус изменился)
3. nutausik_handoff_save — контекст для следующей сессии
4. nutausik_memory_add — важные решения и паттерны
5. SELF-CRITIQUE перед отправкой: проверить forbidden patterns

## ПРАВИЛО НЕПРЕРЫВНОСТИ

Если план пронумерован (Phase 1, 2, 3...) — НЕ останавливайся пока ВСЕ фазы не done.
Иди от первой до последней без пауз и без вопросов «продолжать?».
Останавливайся ТОЛЬКО если:
- Нужен внешний input (API key, доступ)
- Обнаружен блокер (зависимость от другой фичи)
- Физически не можешь продолжить (ошибка, отсутствие файла)

## Сохранить методологию
(ADR, C4, ISO 25010 — без изменений)
```

### Шаг 2: Создать agent-файлы для ВСЕХ агентов

Сейчас существует только `architect.md`. Нужно создать:

| Агент | Файл | Назначение |
|-------|------|------------|
| `architect` | `~/.config/nocowboy/agent/architect.md` | уже есть, обновить |
| `code` | `~/.config/nocowboy/agent/code.md` | реализация кода |
| `explore` | `~/.config/nocowboy/agent/explore.md` | исследование кодовой базы |
| `overseer` | `~/.config/nocowboy/agent/overseer.md` | проверка качества |
| `auto` | `~/.config/nocowboy/agent/auto.md` | автономная оркестрация |

**ОБЩИЕ ПРАВИЛА для ВСЕХ агентов:**

Каждый agent-файл должен содержать:
1. MANDATORY PRE-FLIGHT (nutausik_handoff_load, memory_surface, memory_search)
2. FORBIDDEN patterns (запрещённые вопросы, остановка посреди плана, самовольная приоритизация)
3. MANDATORY OUTPUT (сохранять handoff, memory, обновлять docs)
4. ПРАВИЛО НЕПРЕРЫВНОСТИ (ВСЕ фазы без остановок)
5. Специфичную методологию для роли

### Шаг 3: Зарегистрировать всех агентов в конфиге

**Файл:** `~/.config/nocowboy/nocowboy.jsonc`

Добавить в `agent`:

```json
"code": {
  "mode": "primary",
  "model": "deepseek/deepseek-v4-pro",
  "path": "~/.config/nocowboy/agent/code.md",
  "permission": {
    "mcp": { "nutausik_*": "allow", "*": "deny" },
    "read": "allow",
    "edit": "allow",
    "bash": "allow",
    "glob": "allow",
    "grep": "allow"
  }
},
"explore": {
  "mode": "primary",
  "model": "deepseek/deepseek-v4-flash",
  "path": "~/.config/nocowboy/agent/explore.md",
  "permission": {
    "mcp": { "nutausik_*": "allow", "*": "deny" },
    "read": "allow",
    "glob": "allow",
    "grep": "allow",
    "semantic_search": "allow"
  }
},
"overseer": {
  "mode": "primary",
  "model": "kimi-for-coding/kimi-k2-thinking",
  "path": "~/.config/nocowboy/agent/overseer.md",
  "permission": {
    "mcp": { "nutausik_*": "allow", "*": "deny" },
    "read": "allow",
    "bash": "allow",
    "glob": "allow",
    "grep": "allow"
  }
},
"auto": {
  "mode": "primary",
  "model": "deepseek/deepseek-v4-flash",
  "path": "~/.config/nocowboy/agent/auto.md",
  "permission": {
    "mcp": { "nutausik_*": "allow", "*": "deny" },
    "read": "allow",
    "edit": "allow",
    "bash": "allow",
    "glob": "allow",
    "grep": "allow",
    "task": "allow"
  }
}
```

### Шаг 4: Скопировать общие правила в `packaging/config/nocowboy.json`

Чтобы при `nocowboy init` в новом проекте агенты создавались с правильными правами. Обновить шаблон конфига.

---

## Verification

1. Запустить architect на тестовой задаче → проверить что вызывает nutausik_handoff_load, nutausik_memory_search
2. Запустить code agent → проверить что не останавливается посреди фичи
3. Запустить overseer → проверить что ловит forbidden patterns
4. Проверить в параллельном проекте → architect работает с контекстом
5. Запустить авто-цикл: auto → architect → code → overseer → DONE

---

## Риски

| Риск | Mitigation |
|------|------------|
| Модель игнорирует mandatory rules | Overseer проверяет каждый output |
| Forbidden patterns всё равно просачиваются | Добавить фильтр в prompt building (system.ts) |
| Новые агенты конфликтуют с существующими командами | Тестировать в изолированном проекте |
