# Семантика стоимости: usage-токены ≠ расчётная стоимость ≠ billing-баланс

Три разных показателя не должны смешиваться, а **неудачный** запрос баланса не
должен выглядеть как нулевой баланс: ноль — это реальное «нет средств», а не
«мы не знаем».

## Что сделано

### Баланс: `unknown` вместо `0` — `packages/opencode/src/nocowboy/provider-balance.ts`

- Новый тип `Balance = { status: "ok"; amount } | { status: "unknown"; reason }`
  (+ `okBalance`/`unknownBalance`).
- `BalanceProviderDescriptor.fetch` и `fetchBalance` возвращают `Balance`.
  Любой сбой (HTTP-ошибка, нет USD/credits в ответе, сеть, отсутствие ключа,
  провайдер без balance API) → `unknown` с причиной, а не `0`.
- Хелперы: `balanceAmount(balance)` (число или `undefined`), `balanceColorOf(balance)`
  (цвет или `undefined` → UI рисует приглушённо, а не красным «нет средств»).
- Кэш хранит `Balance`.

### UI

- `sidebar/context.tsx` и `routes/session/subagent-footer.tsx`: баланс рисуется
  через `balanceAmount`/`balanceColorOf`; при `unknown` — прочерк `—` и muted-цвет.

### Три показателя

- **usage-токены** — из `AssistantMessage.tokens` (как и было);
- **расчётная стоимость** — по metadata модели (отдельный путь, не равен балансу);
- **billing-баланс** — из provider API, теперь с явным `status` (`ok`/`unknown`),
  так что `0` больше не означает «неизвестно».

### Parent cost propagation (проверено)

- Параллельные children: `test/nocowboy/cost-propagation.test.ts`
  («sums deltas correctly under parallel execution»).
- Resumed child учитывается как дельта, не целиком:
  `test/tool/task.test.ts` («resumed task_id only propagates the delta»).

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/provider-balance.test.ts
bun test test/nocowboy/cost-propagation.test.ts
bun run typecheck
```

Покрыто: `fetchBalance` → `{status:"ok",amount}` при успехе и `{status:"unknown"}`
при ошибке/без ключа/без провайдера (не `0`); `balanceColorOf` приглушает unknown
и не красит ноль-по-ошибке; `balanceAmount`.
