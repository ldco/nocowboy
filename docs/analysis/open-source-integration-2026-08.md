# Анализ открытых инструментов — что перенять в NoCowboy

> **Дата:** 2 августа 2026
> **Проекты:** Understand-Anything (77K★), fable-advisor (620★), ponytail (94K★)

## 1. Understand-Anything — Knowledge Graph

**Что делает:** Анализирует кодовую базу, строит интерактивный knowledge graph с нодами (файлы, функции, классы) и рёбрами (зависимости, вызовы). Много-агентный пайплайн: scanner → file-analyzer → architecture-analyzer → tour-builder → graph-reviewer. Tree-sitter + LLM гибрид.

| Возможность | NoCowboy | Understand-Anything | Gap |
|-------------|----------|---------------------|-----|
| Структурный обзор кода | ✅ Repomap (Aider-pattern) | ✅ Основа продукта | Мало |
| Семантический поиск | ✅ semantic_search | ✅ Fuzzy + semantic | Мало |
| Индексация | ✅ LanceDB indexing | ✅ — | Мало |
| Knowledge Graph | ❌ | ✅ Noda + рёбра | 🔴 Большой |
| Интерактивная dashboard | ❌ | ✅ Web UI с zoom/search | 🔴 Большой |
| Diff impact analysis | ❌ | ✅ Какие части затронуты | 🔴 Большой |
| Архитектурные слои | ❌ | ✅ auto-detect API/Service/UI | 🟡 Средний |
| Guided tours | ❌ | ✅ auto-generated walkthrough | 🟡 Средний |
| Tree-sitter parsing | ❌ | ✅ Детерминированный AST | 🟡 Средний |
| Инкрементальные обновления | ❌ | ✅ fingerprint-based | 🟡 Средний |

## 2. Fable Advisor — Multi-Model Orchestration

**Что делает:** Много-модельный оркестратор с роутингом по сложности. Архитектор (Opus) → делегирует в три дорожки: routine (GPT-5.6 Sol), complex (Fable 5), review (Fable 5). Кросс-вендорная независимая проверка.

| Возможность | NoCowboy | Fable Advisor | Gap |
|-------------|----------|---------------|-----|
| Оркестрация агентов | ✅ auto → architect/code/overseer | ✅ Opus → GPT/Fable lanes | Мало |
| Роутинг по модели | ✅ per-agent model config | ✅ per-complexity routing | Мало |
| Кросс-модельное ревью | ✅ overseer (Kimi) | ✅ Fable advisor | Мало |
| Cost monitoring | ✅ balance + peak pricing | ✅ "emit judgment not volume" | Мало |
| Cost-routing doctrine | ❌ | ✅ Систематизированная | 🟡 Средний |
| Commitment-boundary review | ❌ | ✅ Перед каждым deliverable | 🟡 Средний |
| Spec contract для делегации | ❌ | ✅ 5-part spec template | 🟡 Средний |
| Параллельные дорожки | ❌ | ✅ race implementers → pick diff | 🟡 Средний |

## 3. Ponytail — YAGNI Ladder

**Что делает:** Заставляет агента писать ~54% меньше кода через decision ladder. Прежде чем писать: "Нужно ли это? Уже в кодовой базе? В stdlib? Нативное API платформы?" Безопасность: никогда не режет валидацию, обработку ошибок, security.

| Возможность | NoCowboy | Ponytail | Gap |
|-------------|----------|----------|-----|
| Инженерная дисциплина | ✅ no-shortcuts, no-workarounds | ✅ | Пересечение |
| YAGNI ladder | ❌ | ✅ 7-шаговая лестница решений | 🟢 Малый |
| Over-engineering review | ❌ | ✅ /ponytail-review | 🟢 Малый |
| Нативное API предпочтение | ❌ | ✅ `<input date>` вместо flatpickr | 🟢 Малый |
| Code reduction metrics | ❌ | ✅ бенчмарки -54% LOC | 🟢 Малый |
| Безопасность при сжатии | — | ✅ 100% safe в бенчмарках | — |

## Вывод: что добавить в roadmap

### 🔴 P0 — Knowledge Graph (Understand-Anything)
У NoCowboy есть repomap + semantic_search + indexing, но нет knowledge graph — самого мощного инструмента понимания кода из трёх рассмотренных.

### 🟡 P1 — Cost-Routing Doctrine (Fable Advisor)
У NoCowboy есть оркестрация (auto agent) и кросс-модельное ревью (overseer), но нет формализованной доктрины: "дорогая модель — только для суждения, дешёвая — для набора кода".

### 🟢 P2 — YAGNI Ladder / Ponytail-Review (Ponytail)
Культурно близко к NoCowboy (no-shortcuts, root cause), но нет формального инструмента YAGNI-проверки.
