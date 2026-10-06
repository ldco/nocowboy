# MCP prompt support

Пункт «MCP prompt support» (в старом ROADMAP помечен NOT DONE). В этом дереве
поддержка **уже присутствует** (унаследована от апстрима форка) и провязана:
MCP-промпты перечисляются из подключённых серверов и становятся командами.

## Где это живёт

- `packages/opencode/src/mcp/index.ts`:
  - `MCP.prompts()` — `client.listPrompts()` по всем подключённым серверам
    (`collectFromConnected`), ключ `clientName:promptName`;
  - `MCP.getPrompt(clientName, name, args?)` — `client.getPrompt(...)`.
- `packages/opencode/src/command/index.ts` (в `commands()`):
  - каждый промпт становится командой с `source: "mcp"`;
  - аргументы промпта маппятся на плейсхолдеры `$1..$n`;
  - `template` лениво тянется через `mcp.getPrompt(...)` и склеивается из
    текстовых сообщений.

## Проверка

```bash
cd packages/opencode
bun test test/mcp/lifecycle.test.ts
bun run typecheck
```

Доказательство: `test/mcp/lifecycle.test.ts` — «prompts() returns prompts from
connected servers» (перечисление промптов по подключённым серверам). Провязка в
команды — в `command/index.ts` (mapping + `getPrompt` template).

Статус: outcome достигнут (промпты перечисляются и доступны как команды) и
пере-верифицирован; отдельной работы не требуется.

## NUTAUSIK-шаблоны (dream / memory / context_inject)

Провязка в NoCowboy **универсальна**: любой промпт, который сервер отдаёт через
`prompts/list`, автоматически становится командой `source: "mcp"`. Поэтому
шаблоны NUTAUSIK (`dream`, `memory`, `context_inject`) появляются в палитре без
отдельного кода на стороне NoCowboy — их **содержимое** отдаёт сам NUTAUSIK
(MCP `prompts/get`). Это NUTAUSIK-side контент; NoCowboy-side поддержка завершена.
