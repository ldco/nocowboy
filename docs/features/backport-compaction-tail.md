# Backport: сохранение recent tail при compaction + token budgeting/pruning

Пункт «портировать сохранение recent tail при compaction, token budgeting и
pruning на границах cache invalidation». Поведение **уже присутствует** в
унаследованной реализации компактификации (внесено корневым коммитом форка
`ca721a26f9`) и покрыто тестами. Здесь — верификация AC против существующего
кода, а не новый перенос: отдельного upstream-диффа для переноса нет.

## Где это живёт

`packages/opencode/src/session/compaction.ts`:

- **recent tail** — `select()` оставляет хвост из последних `tail_turns`
  (по умолчанию 2) в пределах бюджета `preserve_recent_tokens`; пишется
  `tail_start_id`, и **суммируется только head** (хвост не уходит в summary input).
- **token budgeting** — `preserveRecentBudget()` = `compaction.preserve_recent_tokens`
  либо `clamp(usable*0.25, 2 000, 8 000)`; `splitTurn()` урезает границу хвоста под
  бюджет.
- **pruning на границе компактификации** — `prune()` идёт назад, защищает
  `PRUNE_PROTECT` токенов, эррайзит вывод старых tool-вызовов и **останавливается**
  на `part.state.time.compacted` (граница компактификации) и на summary-сообщении.
- Конфиг: `compaction.tail_turns`, `compaction.preserve_recent_tokens`,
  `compaction.prune` (`src/config/config.ts`).

## Проверка AC

```bash
cd packages/opencode
bun test test/session/compaction.test.ts
bun test test/nocowboy/session-compaction-safety.test.ts
bun test test/nocowboy/compaction-payload-recovery.test.ts
bun run typecheck
```

| AC | Доказательство |
| --- | --- |
| Recent tail сохраняется при compaction | compaction.test.ts: «summarizes only the head while keeping recent tail out of summary input», «persists tail_start_id for retained recent turns» |
| Token budget/pruning на границах | compaction.test.ts: «uses the configured output token ceiling for retained tail budgeting», «shrinks retained tail to fit preserve token budget», describe `session.compaction.prune`; `part.state.time.compacted` как граница |
| Очередь prompts и checkpoint contract не теряются | session-compaction-safety.test.ts (queue+compaction), compaction-payload-recovery.test.ts |

Итог прогонов: `compaction.test.ts` 57 pass / 0 fail; `session-compaction-safety.test.ts`
+ `compaction-payload-recovery.test.ts` 32 pass / 0 fail.
