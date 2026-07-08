# NoCowboy — Backlog

> Идеи, которые мы накидываем. Не в роадмапе, не в работе.
> Когда идея созрела → переносим в `docs/roadmap.json` (status: planned → ROADMAP).

<!-- AUTO-GENERATED from docs/roadmap.json. Do not edit manually. -->

## YandexGPT / GigaChat провайдеры

Код детекции есть, реализации провайдеров нет.

---

## UI Локализация (русские метки + переключатель языка)

Русские метки в sidebar, диалогах, ошибках. Переключатель языка в Settings. Использует lang из nocowboy.json. Сейчас: lang в конфиге есть, system prompts русские есть, UI-меток нет.

---

## Permission timeout — доработка (из P2-A4)

Базовое есть. Нужна доработка: настройка через UI, разные таймауты для разных tool.

---

## Agent Audit (P2-C1): inventory 21 агентов, name collisions

Два name collision (plan, explore). Один deprecated (orchestrator).

---

## Diff Sandbox — изоляция AI-изменений до принятия (Plandex-style)

Старый ROADMAP v0.9.0 (P3-A1).

---

## Deep Context (2M tokens с бюджетированием)

checkpoint-validator.ts имеет частичное бюджетирование, но не 2M.

---

## MCP Framework — merge plugin-registry в NUTAUSIK

P2-C4. Решить судьбу first-party MCP серверов.

---

## Command deduplication (P2-C3)

30 команд зарегистрировано, не дедуплицированы.

---

## Goal judge — интегрировать в agent stop loop (Effect-native)

/goal команда есть, не интегрирована в lifecycle.

---

## Test harness — исправить 39 flaky тестов под параллельной нагрузкой

Файлы: packages/opencode/test/

---

## Distill command — сканировать сессии → генерировать skills/commands

auto-dream.ts есть (только dream, не distill).

---

## Agent Quality Enforcement — coherence_check, agent_log, task-gate hook

coherence_check частично реализован.

---

## Self-Being Meta-Cognitive Architecture (P3-SELF)

NoCowboy как самосовершенствующееся существо.

---

## NUTAUSIK MCP Prompt Support (dream, memory, context_inject prompt templates)

Было в старом ROADMAP как NOT DONE.

---

## Instruction Files Analysis (P2-C2): починить пути, смержить no-shortcuts

Kilo-референсы, auto-memory пути.

---
