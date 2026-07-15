# Auto-Verify После Edit/Write

**Feature ID:** auto-verify-after-edit
**Version:** v0.11.0
**Status:** ✅ implemented

## Description

После каждого `edit`, `write`, `apply_patch`, `search_replace` автоматически запускается LSP diagnostics. Если есть ошибки — в вывод инструмента добавляется `⚠️ Verification failed — fix errors before continuing` с полным списком ошибок.

Это DEFAULT поведение, не отключаемое.

## Files

- `packages/opencode/src/tool/edit.ts` — изменён
- `packages/opencode/src/tool/write.ts` — изменён
- `packages/opencode/src/tool/apply_patch.ts` — изменён
- `packages/opencode/src/tool/search_replace.ts` — изменён

## Verification

1. Отредактировать файл с ошибкой → вывод содержит `⚠️ Verification failed`
2. Исправить ошибку → вывод содержит `Edit applied successfully.` без `⚠️`
