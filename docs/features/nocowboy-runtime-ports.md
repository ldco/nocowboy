# @nocowboy/runtime — портовое ядро

Доменные зависимости должны пересекать границу только через контракты. Раньше
агенты, policy, session, edit, model, memory и telemetry были сплетены с
engine (`@/session`, `@tui`, внутренние provider services). Этот пункт заводит
**портовое ядро** — самодостаточный модуль с семью контрактами.

## Что сделано

`packages/opencode/src/nocowboy/runtime/`:

- `ports.ts` — семь портов (тип + Effect Schema там, где есть форма данных):
  1. `AgentCatalogPort` — `isSpawnable` / `spawnable` (реализуется `AgentCatalog`).
  2. `PolicyPort` — `evaluate(PolicyRequest) -> allow|ask|deny`.
  3. `SessionPort` — `create/get/children` над `SessionRef`.
  4. `EditPort` — `apply(EditRequest) -> { outcome, applied }`; `outcome ∈ applied|no-match|ambiguous|stale|partial`.
  5. `ModelPort` — `resolve({agent, fallback?}) -> ModelRef | undefined`.
  6. `MemoryPort` — `status() ∈ available|degraded|unavailable`, `add(namespace, record)`.
  7. `TelemetryPort` — `emit(TelemetryEvent)`.
- `index.ts` — barrel.

Граница: `runtime/**` импортирует **только `effect`/`zod` и свои файлы** —
никаких `@/session`, `@tui`, `@/provider` и никаких `../`, выходящих из каталога.

## Гейт

`scripts/check-runtime-boundary.ts` сканирует импорты в `runtime/**` и падает на
любом голом импорте вне allowlist (`effect`, `zod`) или относительном импорте,
выходящем за пределы каталога. Запускается в `.husky/pre-commit` и через
`bun run scripts/check-runtime-boundary.ts --check`.

## Проверка

```bash
bun run scripts/check-runtime-boundary.ts --check
cd packages/opencode && bun test test/nocowboy/runtime/ports.test.ts
```

Тесты контрактов не поднимают engine: декодируют схемы (валид/невалид),
проверяют, что `AgentCatalog` удовлетворяет `AgentCatalogPort`, и что детектор
границы ловит `@/session`-импорт и escaping-`..`, а реальный `runtime/**` чист.
