# Prompt Enforcement — Обязательная Верификация

**Feature ID:** verify-prompt-enforcement
**Version:** v0.11.0
**Status:** ✅ implemented

## Description

В системные промпты code-агента добавлено жёсткое правило:

> **ПЕРЕД каждым `nutausik_task_done` или завершением работы:**
> 1. Вызвать `check` — LSP diagnostics для изменённых файлов
> 2. Если `⚠️ Verification failed` — ИСПРАВИТЬ ВСЕ ОШИБКИ
> 3. Если ошибки не исправлены — НЕЛЬЗЯ закрыть задачу
> 4. ТОЛЬКО после `✅ Verification passed` — завершение

Это НЕ рекомендация. Это закон в промпте.

## Files

- `packages/opencode/src/agent/prompt/code.ru.txt` — русская версия
- `packages/opencode/src/agent/prompt/code.txt` — английская версия

## Verification

1. Промпт содержит секцию `⚠️ ОБЯЗАТЕЛЬНАЯ ВЕРИФИКАЦИЯ` / `⚠️ MANDATORY VERIFICATION`
2. Правило явно запрещает закрывать задачу с type errors
