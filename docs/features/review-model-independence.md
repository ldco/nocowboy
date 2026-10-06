# Политика независимости модели reviewer

Ревью независимо ровно настолько, насколько независима модель. Раньше это было
предположением: `resolveModel` предпочитает agent-model, иначе глобальную
`cfg.model` — при общей `cfg.model` reviewer и worker резолвятся в одну модель
(тихий self-review). А вторая фаза cascade по умолчанию **переиспользовала
автора**.

## Что сделано

`packages/opencode/src/nocowboy/review/cascade.ts`:

1. **`diagnoseReviewIndependence(input)`** — чистая проверка: reviewer совпал с
   worker → `{ independent: false, code: "reviewer-equals-worker", message }`;
   reviewer совпал с автором → `code: "reviewer-equals-author"`; `allowSameModel`
   подавляет диагноз; неизвестные модели → `independent: true` (нельзя доказать
   коллизию).
2. **Вторая фаза — только explicit opt-in.** `second_phase` должен назвать модель
   или literal `author` (явно разрешить автора). Без `second_phase` — `secondary`
   `undefined`, тихого переиспользования автора больше нет.

`packages/opencode/src/nocowboy/agent/index.ts` (`patchAgents`): после сборки
агентов вызывает `diagnoseReviewIndependence({ worker: agents.worker.model,
reviewer: agents.reviewer.model })` и логирует `warn` при self-review.

## Проверка

```bash
cd packages/opencode && bun test test/nocowboy/review-cascade.test.ts
```

Тесты: `diagnoseReviewIndependence` (independence flags), а также
`resolveReviewCascade` — «no second phase by default» для обоих направлений,
`second_phase=author` (явный opt-in), `second_phase=<модель>`, `off`/`none`.

## Границы

- Диагностика статическая (момент сборки агентов). Runtime-цепочка оверрайдов в
  `nocowboy/tool/task.ts` (saved subagent model / `subagent_model`) не входит в
  проверку — там независимость обеспечивает cascade-конфиг.
- `allowSameModel` — параметр функции; отдельного config-флага для намеренного
  same-model ревью пока нет, поэтому такой конфиг всегда получает `log.warn`
  (лог не блокирует).
