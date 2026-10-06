# Контрактные тесты миграции движка

Набор исполнимых contract-тестов, который гейтит будущую миграцию движка: если
поведение потеряется, `bun test test/nocowboy/contracts` упадёт.

## Структура

- `scenarios.ts` — **манифест**: 8 обязательных сценариев, каждый маппится на
  один-или-более автоматических тестов (в этом каталоге или в существующих
  наборах).
- `migration-contracts.test.ts` — валидатор: каждый сценарий имеет ≥1 тест, все
  указанные файлы существуют, in-dir contract-тесты замаплены.
- `worker-child.contract.test.ts` — watchdog: разрешение stall-таймаута
  (env→config→default), heartbeat для долгого tool/permission wait (не stall,
  bounded `Activity.keepAlive`), watchdog off при 0; делегирование в один уровень
  (`KiloTask.nestedTask() === false`).
- `mutation-policy.contract.test.ts` — read-only planner/reviewer (deny
  edit/mutating bash, allow verify bash), explicit-config lift, RU/EN locale
  меняет промпт агента и UI-строки (`I18n`).
- `tui-navigation.contract.test.ts` — selection/navigation: escape чистит,
  ctrl+c копирует, focus с выделением сохраняется, прочий ключ без focus чистит.

## Сценарии (обязательные)

| id | покрытие |
|---|---|
| worker-child-lifecycle | `test/tool/task.test.ts` + contract (watchdog keep-alive) |
| planner-reviewer-mutation-policy | `test/nocowboy/agent/read-only-agents.test.ts`, `permission-allow-everything.test.ts` (YOLO) + contract |
| parallel-resumed-child-costs | `cost-propagation.test.ts`, `stats-subagent-cost.test.ts` |
| locale-switch-and-isolation | `i18n.test.ts` + contract (prompt + UI strings) |
| edit-roundtrip-and-safety | `test/tool/search_replace.test.ts`, `tool-encoding.test.ts` |
| memory-status-and-isolation | `memory-adapter.test.ts`, `nutausik-client.test.ts` |
| compaction-with-active-goal | `session-compaction-safety.test.ts`, `goal.test.ts` |
| tui-navigation | `test/cli/cmd/tui/attention.test.ts` + contract |

## Проверка

```bash
cd packages/opencode && bun test test/nocowboy/contracts
```

Манифест намеренно проверяет существование файлов: удаление/переименование
покрытия ломает гейт, а не проходит молча.
