# MCP Framework — судьба first-party MCP серверов

Решение по first-party MCP-серверам (`mcp-framework-merge`): единый тестируемый
фреймворк запуска, без merge серверов. Приоритет запуска
(`launch.json` → `@nocowboy/mcp-<name>` → third-party `npx` дефолт → null) вынесен
из `Launcher.command` в чистую `resolveCommand`; `nutausik` остаётся встроенным
project-scoped сервером; MCP plugin-registry НЕ вливается в NUTAUSIK.

## Что сделано

- `packages/opencode/src/nocowboy/mcp/launcher.ts`: `resolveCommand(name, deps)` —
  чистая инъецируемая функция приоритета; `Launcher.command` резолвит async-источники
  и делегирует в неё; `FIRST_PARTY_MCP_PREFIX`, `isFirstPartyMcp(name)`.
- Тесты: `packages/opencode/test/nocowboy/mcp-launcher.test.ts`.
- Решение: `docs/reference/mcp-first-party.md` + запись в NUTAUSIK decisions.

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/mcp-launcher.test.ts
bun run typecheck
```

Покрыто: приоритет (json → установленный пакет → дефолт → null); пустая запись
json пропускается; `isFirstPartyMcp` отличает first-party от third-party дефолтов.
