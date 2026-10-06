# Deterministic Stage Machine — design → plan → implement → verify → accept

Цепочка качества (design → plan → implement → verify → accept) продвигается по
**артефактам и результатам** — записанный план, изменённые файлы, реально
прогнанный тест, AC с evidence, — а не по наличию слов «APPROVED»/«DONE» в
тексте. Prompt остаётся подсказкой; барьер — этот gate.

## Что сделано

### Ядро (чистое) — `packages/opencode/src/nocowboy/session/stage-machine.ts`

- `STAGES` — `design`, `plan`, `implement`, `verify`, `accept`.
- `StageEvidence` — булевы артефакты: `design`, `plan`, `changed`, `verified`,
  `accepted`; `EVIDENCE_FOR` — какой артефакт нужен какому stage.
- `stageSatisfied(stage, evidence)` / `missingEvidence(evidence)` — есть ли
  артефакт; какие стадии его ещё не имеют (в порядке цепочки).
- `gate(stage, evidence)` — детерминированный gate одной стадии.
- `advance(stage, evidence)` — шаг вперёд только при наличии артефакта:
  `advance("plan", {design:true})` остаётся `plan`, `advance("plan",
  {plan:true})` → `implement` — **implement нельзя войти без записанного plan**.
- `stopRequest(stage, evidence)` — адаптер под turn-level stop hook: блокирует
  turn, называя недостающий артефакт (барьер — артефакт, а не слово модели).
- `roadmapGate({hasFeatures, actionable, inProgress})` — тот же подход для
  roadmap-run:   `design` (нет roadmap) / `plan` (следующий пункт) / `verify`
  (пункт in_progress — доделай и отправь на ревью) / `accept` (нет actionable —
  complete). Детерминирован по статусам пунктов, не по тексту.

### Провязка — `packages/opencode/src/nocowboy/session/autopilot.ts`

`Autopilot.roadmapComplete` и `currentStage` теперь выражены через
`roadmapGate(...).complete` / `.item` — inline-гейт заменён одним протестированным
модулем. Поведение сохранено (regression: `autopilot.test.ts` зелёный).

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/stage-machine.test.ts
bun test test/nocowboy/autopilot.test.ts
bun run typecheck
```

Покрыто: порядок цепочки; стадия удовлетворяется только своим артефактом (не
словом); `missingEvidence`; `advance` не пускает в implement без plan и в accept
без verify; `stopRequest` называет недостающий артефакт; `roadmapGate` во всех
четырёх режимах (нет roadmap / план / verify / accept) и сохранность
`Autopilot.roadmapComplete`/`currentStage`.
