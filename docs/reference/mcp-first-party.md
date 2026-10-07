# First-party MCP servers — decision (`mcp-framework-merge`)

## Контекст

NoCowboy запускает MCP-серверы через `src/nocowboy/mcp/launcher.ts`. До этого
решения приоритет запуска был встроен inline в `Launcher.command` и не тестировался:

1. запись пользователя в `~/.nocowboy/mcp/launch.json`;
2. установленный first-party пакет `@nocowboy/mcp-<name>`;
3. third-party `npx`/`uvx` дефолт (`context7`, `sqlite`, `puppeteer`, `git`).

Отдельно `nutausik` — единственный встроенный, авто-подключаемый и
project-scoped MCP-сервер (`PROJECT_SCOPED_MCP`, `nutausik-auto-wire.ts`).

## Решение

**Единый фреймворк запуска, никакого merge серверов.** Приоритет запуска вынесен
в чистую инъецируемую `resolveCommand(name, deps)` (обёртка `Launcher.command`),
покрыта тестами.

- **First-party** — пакеты `@nocowboy/mcp-<name>` (авто-детект через
  `require.resolve`) плюс встроенный `nutausik`. `isFirstPartyMcp(name)` отличает
  их от third-party дефолтов.
- **Third-party дефолты** (`DEFAULT_LAUNCHES`) — opt-in удобство, не first-party;
  остаются как есть.
- **Конфликт имён решается детерминированно.** Одно и то же имя, присутствующее
  в нескольких тирах, всегда разрешается по строгому приоритету
  (`launch.json` → установленный пакет → дефолт → null), и выигравший тир
  сообщается через `onResolve` (`Launcher.command` пишет его в лог
  `mcp.launcher`).
- **MCP plugin-registry НЕ вливается в NUTAUSIK.** NUTAUSIK остаётся хабом
  памяти/проектного скоупа; MCP-серверы остаются индивидуально запускаемыми и
  взаимозаменяемыми. Вливание registry в NUTAUSIK связало бы память и запуск
  серверов без выгоды.
- Ни один сервер не удаляется.

## Последствия

- Единственная точка правды по приоритету запуска — `resolveCommand` (тест
  `test/nocowboy/mcp-launcher.test.ts`).
- `mcp-prompt-support` и другие MCP-направления остаются развязанными от памяти.

Решение записано в NUTAUSIK (`decisions`) с этим task_slug.
