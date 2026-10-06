# Единый MemoryAdapter — статусы, explicit namespace, shutdown flush

NUTAUSIK достигался несколькими независимыми raw-`fetch` вызовами
(`nutausik-client.ts`, `tool/complete_task.ts`) плюс внешний shell/python/curl
hook — каждый со своим literal endpoint. Транспортный сбой возвращал пустую
строку, а env-override (`NUTAUSIK_MCP_URL`) можно было обойти.

## Что сделано

`packages/opencode/src/nocowboy/memory/adapter.ts` — единый `MemoryAdapter`:

- **Один транспорт**: `httpTransport(fetchImpl)` — единственная реализация raw
  JSON-RPC POST. Все прямые вызовы NUTAUSIK идут через него.
- **Structured errors**: `call()` возвращает `MemoryResult<string>` —
  `{ ok: true, value }` или `{ ok: false, error: { code: "transport" | "timeout" | "rpc" | "tool", message } }`.
  Пустая строка на сбой больше не маскирует ошибку.
- **Observable status**: `status() ∈ available | degraded | unavailable`
  (transport-сбой → unavailable; rpc/tool/non-2xx → degraded; успех → available).
  `probe()` обновляет статус.
- **Explicit namespace**: `call(tool, args, { project, session? })` — `projectDir`
  и `sessionID` добавляются в каждый вызов; два проекта и параллельные children
  не смешиваются.
- **Bounded flush**: `flush(timeoutMs)` ждёт in-flight вызовы ограниченно и
  возвращает `{ flushed, pending }`; `pending()` — число вызовов в полёте.

Ре-вайринг:
- `nutausik-client.ts` — `callTool`/`callToolResult` через адаптер;
  `hasNutausik` через `adapter.probe`; экспортирует `memoryStatus()` / `flushMemory()`.
- `tool/complete_task.ts` — `nutausik_task_done` через адаптер (свой URL/fetch убран).
- `nutausik-auto-wire.ts` — PostToolUse hook больше не `python3` + `curl` с
  literal endpoint, а node+`fetch`, читающий `NUTAUSIK_MCP_URL` (env-override
  соблюдён).

## Границы

Generic MCP SDK-путь (`mcp/index.ts`, `PROJECT_SCOPED_MCP`) — отдельный
SDK-транспорт; он уже пробрасывает `projectDir` сам. Этот пункт сводит **прямой
JSON-RPC** путь к одному адаптеру (включая health-индикатор TUI
`NutausikDot` → `hasNutausik()`); объединение SDK-транспорта зарегистрировано
как отдельный пункт `memory-transport-sdk-unify`.

`flushMemory()` подвязан к `onSessionEnded` (bounded 2s) — «shutdown flush» не
только юнит, но и реальный lifecycle hook.

## Проверка

```bash
cd packages/opencode && bun test test/nocowboy/memory-adapter.test.ts
cd packages/opencode && bun test test/nocowboy/nutausik-client.test.ts
```
