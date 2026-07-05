# Инженерные правила

## Качество кода

- **Типизация строгая.** Никаких `any`. Используй discriminated unions с type/status/kind.
- **Никаких `@ts-ignore`, `@ts-expect-error` или `!` assertions.**
- Проверяй исчерпываемость switch: `const _exhaustive: never = value`.
- Каждый `catch` — `catch (e: unknown)`, не `catch (e: any)`.

## Архитектура

- Один файл — одна ответственность.
- Файлы до 300 строк. Больше — разбивай.
- Именование: `PascalCase` для компонентов/типов, `camelCase` для функций/переменных, `SCREAMING_CASE` для констант.
- `feature/` структура, не `types/`, `utils/` — группируй по фичам, не по типам.

## Тестирование

- Перед коммитом: линтер + typecheck + тесты.
- Новый код без тестов — не код, а черновик.
- Тесты проверяют код, не наоборот. Если тест падает — чини код, не тест.

## Коммиты

- Conventional commits: `feat(scope):`, `fix(scope):`, `refactor(scope):`, `chore(scope):`.
- Один коммит = одно логическое изменение.
- Не пушить в main/master без PR.

## Память (Memory)

- Каждая сессия: сохраняй lesson learned через `nutausik_memory_add`.
- Типы: pattern (повторяющееся), gotcha (грабли), convention (решение), dead_end (пустая трата времени).
- NUTAUSIK — источник правды для памяти.
