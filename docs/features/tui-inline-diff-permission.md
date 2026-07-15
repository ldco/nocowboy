# Inline diff в permission dialog

**Feature ID:** tui-inline-diff-permission
**Version:** v0.12.0
**Status:** ✅ implemented (overseer fixes applied 2026-07-15)

## Description

Permission диалог показывает diff изменений с цветовой подсветкой + русские UI строки.

## Changes

- `packages/opencode/src/cli/cmd/tui/routes/session/permission.tsx`
  - `truncateDiff()` обёрнут вокруг `diff()` перед `splitDiffHunks()` — усечение diff >50 строк реально применяется
  - fallback цветов: `theme.diffAddedBg ?? theme.success`, `theme.diffRemovedBg ?? theme.error`, `theme.diffHighlightAdded ?? theme.success`, `theme.diffHighlightRemoved ?? theme.error`
  - 19 русских UI строк (все строки интерфейса на русском)

## Overseeer Fixes (2026-07-15)

| # | Issue | Fix |
|---|-------|-----|
| 1 | `truncateDiff` не вызывалась | `diff()` → `truncateDiff(diff())` в createMemo для hunks |
| 2 | Нет fallback цветов | `?? theme.success` / `?? theme.error` для addedBg, removedBg, addedSignColor, removedSignColor |
| 3 | Английские UI-строки | Все 19 строк заменены на русские |
| 4 | Документация | Обновлена |

## Verification

1. Permission диалог показывает diff с цветами (fallback на success/error если diff-цвета не заданы)
2. Diff >50 строк усекается до 30 + `… +N строк`
3. Все строки интерфейса на русском
4. Typecheck проходит (предсуществующие ошибки в provider.test.ts и plugin модулях не связаны)
