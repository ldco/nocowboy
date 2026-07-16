# todowrite: блокировать status=completed

**Feature ID:** todowrite-completed-block
**Version:** v0.11.0
**Status:** ✅ implemented

## Description

todowrite больше не принимает `status="completed"`. Только `"pending"` и `"in_progress"`. Когда пункт завершён — он удаляется из todowrite.

## Changes

- `src/tool/todo.ts` — Schema.Literal вместо Schema.String
- `src/session/todo.ts` — allTerminal → allDone
- `src/nocowboy/todo-view.ts` — terminal → empty check
- `src/cli/cmd/run/tool.ts` — убран [✓] рендеринг
- 6 других файлов

## Verification

1. todowrite с `status: "completed"` → ParseError
2. todowrite с `status: "in_progress"` → OK
3. todowrite с пустым массивом → OK (очистка)
4. Typecheck: 0 errors
