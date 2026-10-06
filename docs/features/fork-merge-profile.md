# Профиль merge/backport — upstream read-only reference, без legacy OpenCode→Kilo transforms

Отдельный **NoCowboy merge profile** для генеалогии Kilo Code → NoCowboy.
Унаследованный апдейтер (`defaultConfig` в `script/upstream/utils/config.ts`)
переписывает `opencode-ai`/`@nocowboy/*` в `@kilocode/*` и нацелен на линию
anomalyco/opencode — это механизм OpenCode → Kilo, а не Kilo → NoCowboy.

## Что введено

- `script/upstream/utils/config.ts`
  - `nocowboyConfig: MergeConfig` — `packageMappings` только inbound
    (`@kilocode` → `@nocowboy`); `upstreamReadOnly: true`; `branchPrefix`
    `nocowboy-merge`; preserved-каталоги `src/nocowboy`, `test/nocowboy`.
  - `resolveProfile("legacy-kilo" | "nocowboy")`.
  - `assertNoLegacyRewrite(profile)` — бросает, если профиль переписывает
    `@nocowboy/*` в `@kilocode/*` (guard; `defaultConfig` его не проходит).
  - сам `defaultConfig` не изменён.
- `script/upstream/utils/compare-trees.ts`
  - `normalizePackageName` / `normalizePath` — брендовые scope/сегменты
    (`@nocowboy/`, `@kilocode/`, `@opencode-ai/`, `nocowboy`, `kilocode`,
    `opencode`, …) сводятся к `engine` **до** сравнения.
  - `compareTrees(ours, theirs)` — `onlyOurs` / `onlyTheirs` / `common` по
    нормализованным путям (переименование бренда не даёт ложный add/remove).
  - `buildMergeDryRunReport(profile)` — read-only dry-run отчёт; ничего не
    трогает на диске.
- `script/upstream/utils/compare-trees.test.ts` — 11 тестов (нормализация,
  сравнение, guard профиля, dry-run read-only).

## Почему upstream read-only

Дерево NoCowboy — импортированный снимок Kilo Code без сохранённой Git-цепочки
(см. `docs/reference/engine-manifest.md`, `provenance.confidence = snapshot`).
Прямой merge/rebound невозможен: сначала нормализуем деревья и сравниваем, а
upstream держим как read-only reference, не инжектя в рабочие пути.

## Проверка

```bash
cd script/upstream && bun test utils/compare-trees.test.ts
bun run script/upstream/utils/compare-trees.ts --dry-run
```
