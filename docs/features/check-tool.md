# Tool `check` — Language-Agnostic Verification

**Feature ID:** check-tool
**Version:** v0.11.0
**Status:** ✅ implemented

## Description

Новый инструмент `check` для AI-агента. Вызывает LSP diagnostics и возвращает ошибки компиляции/тайпчека для любого языка (TypeScript, Go, Python, Rust, Java, C++).

## Files

- `packages/opencode/src/tool/check.ts` — инструмент
- `packages/opencode/src/tool/registry.ts` — регистрация

## Verification

1. Агент вызывает `check(files?: string[])`
2. Если errors есть → `⚠️ Verification failed — N error(s) found`
3. Если errors нет → `✅ Verification passed — no LSP errors found`
4. Language-agnostic: работает с любым LSP из конфига `lsp`
