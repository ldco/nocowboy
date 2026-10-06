# Structured Handoff — типизированный agent handoff вместо текстового `#route`

Auto-роутер раньше переносил передачу хода агента свободным текстом:
assistant писал `#route: <agent> <description>`, а loop выскребал это из
сообщения. Хрупко — агент, причина и переносимый контекст размазаны по прозе.
Теперь у handoff есть типизированная форма `Handoff`, а текстовый `#route:`
остаётся **compatibility adapter**, чтобы ничего, выдающее старую форму, не
сломалось.

## Что сделано

### Ядро (чистое) — `packages/opencode/src/nocowboy/session/agent-handoff.ts`

- `Handoff { target, reason, context, artifacts }` — типизированная структура.
- `parseHandoff(text)` — читает структурированную директиву
  `#handoff: {"target":"…","reason":"…","context":"…","artifacts":[…]}`;
  `null`, если директивы нет или она битая/без `target`.
- `renderHandoff(handoff)` — детерминированная отрисовка (фиксированный порядок
  ключей); раунд-трип `parse(render(h)) === h`.
- `handoffFromRoute(route)` — **compatibility adapter**: legacy
  `RouteDirective { agent, description, prompt }` → `Handoff`.
- `resolveHandoff(text)` — структурная директива приоритетна, иначе legacy
  `#route:` адаптируется.
- `hasHandoff(text)` — есть ли любая из двух форм.

### Провязка — `packages/opencode/src/session/prompt.ts`

Loop, который раньше звал `hasRouteDirective`/`parseRoute` и использовал
`route.agent`, теперь зовёт `hasHandoff`/`resolveHandoff` и использует
`handoff.target`. Поведение для legacy-директив не меняется (адаптер сохраняет
agent/description/prompt), а структурированная форма становится полноценным
путём.

Legacy-парсер `src/session/router.ts` не тронут.

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/handoff.test.ts
bun test test/nocowboy/session-router.test.ts
bun run typecheck
```

Покрыто: разбор/отрисовка структурированной директивы + раунд-трип; дефолты и
фильтрация artifacts; битые/без-target → `null`; адаптер `#route:` → `Handoff`;
приоритет структуры над route; регрессия legacy-парсера (`parseRoute`,
`hasRouteDirective`, `stripRouteDirective`) без изменений.
