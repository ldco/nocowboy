# MCP Prompt Support — серверные prompt templates как команды

Roadmap item `mcp-prompt-support` (P3, v0.11.0). Механизм **универсален**: любой
prompt, который возвращает подключённый MCP-сервер (`listPrompts`), появляется в
палитре команд NoCowboy. NUTAUSIK-шаблоны (`dream`, `memory`, `context_inject`)
приходят через этот же путь — **их содержимое живёт на стороне сервера** (внешний
MCP-сервер, не в этом репозитории).

## Что сделано

- **Подтверждение (без изменения кода):** `packages/opencode/src/mcp/index.ts`
  — `prompts()` собирает prompt'ы со всех подключённых серверов,
  `getPrompt(client, name, args)` резолвит конкретный. `packages/opencode/src/command/index.ts`
  превращает каждый prompt в команду с `source: "mcp"`; `hints` строятся из
  аргументов prompt'а (`$1`, `$2`, …).
- **Исправление (реальный гэп):** новый чистый модуль
  `packages/opencode/src/mcp/prompt-template.ts` — `renderPromptTemplate(template, ref)`
  рендерит сообщения prompt'а в строку шаблона (`text`-части через `"\n"`,
  не-текстовые — пустые). Для `undefined` (неизвестный/недоступный prompt) он
  **бросает явную ошибку** с именем prompt'а и клиента, а **не** возвращает `""`.
  `command/index.ts` в getter'е `template` теперь вызывает `renderPromptTemplate`
  вместо `... || ""` (лениво, на исполнении команды, — листинг команд не ломается).

## Почему неизвестный prompt — ошибка

Пустой шаблон молча запускал бы пустую команду. Явная ошибка
`MCP prompt "<name>" is unavailable from client "<client>"` делает сбой
наблюдаемым, а не скрытым.

## Ключевые файлы

- `packages/opencode/src/mcp/prompt-template.ts` — чистый рендер + явная ошибка
- `packages/opencode/src/command/index.ts` — prompt → команда (`source: "mcp"`), ленивое `template`
- `packages/opencode/src/mcp/index.ts` — `prompts()` / `getPrompt()` (проверено, не менялось)

## Проверка

```bash
cd packages/opencode
bun test test/mcp/prompt-template.test.ts
bun test test/mcp/lifecycle.test.ts
bun run typecheck
```

Покрыто: многосообщенческий текст, склейка через `"\n"`; не-текстовые части →
пустые строки; `undefined` → `Error`, имя prompt'а и клиента в сообщении, результат
не `""`; prompt'ы подключённых серверов по-прежнему становятся командами
(`lifecycle.test.ts`).
