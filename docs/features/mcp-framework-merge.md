# MCP Framework — судьба first-party MCP серверов

Решение по first-party MCP-серверам (`mcp-framework-merge`): единый тестируемый
фреймворк запуска, без merge серверов. Приоритет запуска
(`launch.json` → `@nocowboy/mcp-<name>` → third-party `npx` дефолт → null) вынесен
из `Launcher.command` в чистую `resolveCommand`; `nutausik` остаётся встроенным
project-scoped сервером; MCP plugin-registry НЕ вливается в NUTAUSIK.

## Что сделано

- `packages/opencode/src/nocowboy/mcp/launcher.ts`: `resolveCommand(name, deps)` —
  чистая инъецируемая функция приоритета; `Launcher.command` резолвит async-источники
  (`readLaunchJson` + `resolveInstalled`) и делегирует в неё; `FIRST_PARTY_MCP_PREFIX`,
  `isFirstPartyMcp(name)`, типы `LaunchSource`/`LaunchDeps`.
- Конфликт имён решается детерминированно: `resolveCommand` ровно один раз вызывает
  `deps.onResolve({ name, source, command })` с выигравшим тиром, а `Launcher.command`
  логирует его через `Log.create({ service: "mcp.launcher" })` → `log.debug("mcp launch resolved", info)`.
- Тесты: `packages/opencode/test/nocowboy/mcp-launcher.test.ts` — тиры приоритета,
  пустая запись json пропускается, `isFirstPartyMcp`, отчёт `onResolve` для каждого
  тира (launch-json / installed / default / none) и конфликт имён.
- Решение: `docs/reference/mcp-first-party.md` + запись в NUTAUSIK decisions.

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/mcp-launcher.test.ts
bun run typecheck
```

Покрыто: приоритет (json → установленный пакет → дефолт → null); пустая запись
json пропускается; `isFirstPartyMcp` отличает first-party от third-party дефолтов;
выигравший источник детерминированно сообщается через `onResolve` и логируется.
