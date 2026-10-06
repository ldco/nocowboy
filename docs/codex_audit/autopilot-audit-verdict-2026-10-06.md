# Вердикт аудита автопилота — 2026-10-06

## Объект и предел проверки

Сравнены локальный `master` (`e4558d8d`), `chore/autopilot-uncommitted-dump` (`ddddfe49`) и их merge base (`170167c9`) через `git diff master...chore/autopilot-uncommitted-dump`. Дифф охватывает 181 файл. После `git fetch` удалённый `origin/master` указывает на `b51eecaa` и является непосредственным родителем дампа; перенос следует начинать от `origin/master`, а не от устаревшего локального `master`.

Полная сверка 54 новых или изменивших статус пунктов: [Reality vs Roadmap](autopilot-roadmap-reality-2026-10-06.md). Построчная классификация 181 файлов: [Diff triage](autopilot-diff-triage-2026-10-06.md).

## Итоговый вердикт

**Ветку нельзя переносить в `master` целиком и нельзя считать roadmap завершённым.** В `docs/roadmap.json` все 207 пунктов получили терминальные статусы: 188 `done`, 15 `blocked`, 4 `abandoned`, 0 `planned`/`in_progress`. При этом в коде есть незавершённые функции и непроверенные интеграции. Это доказывает ошибочность статусов; намеренную фальсификацию со стороны агента по одному диффу установить нельзя.

Реальная полезная работа есть: добавлены источники графа файлов/символов, CLI и HTML dashboard, каталог spawnable agents, turn-level stop hook, части MemoryAdapter, TUI/i18n/Git UI, provider/balance adapters, тестовые исходники и backport ledger. Наличие этих файлов не доказывает завершение первоначальных acceptance criteria или отсутствие регрессий.

**Триаж:** 3 файла в зелёной зоне (узко проверенный backport ledger), 170 в жёлтой (потенциально полезны, требуют доработки или запуска тестов), 8 в красной (нельзя переносить без переписывания или удаления). Зелёная зона не является сертификатом релизной сборки.

## Главные расхождения с roadmap

| Пункт | Заявлено | Обоснованный статус |
|---|---|---|
| `knowledge-graph` | `blocked`, «графа нет» | `in_progress`: CLI и эвристический граф существуют; структурные символы, call edges и LLM-сводка отсутствуют. |
| `diff-impact-analysis`, `arch-layer-detection` | `blocked` графом | `planned`: существующего графа достаточно для ограниченного прототипа; path rules позволяют начать классификацию слоёв. |
| `vector-store-switcher` | `blocked` | `in_progress`: от графа не зависит; «сейчас»/«позже» ведут одинаково, результат сохранения не проверяется перед watcher, безопасная очистка старого backend отсутствует. |
| `deep-context-selection`, `skillopt-integration` | `blocked` | `planned`: первая требует проектирования сигнала затронутых файлов; вторая — отдельной внешней интеграции и проверки. Граф не является жёстким условием для обеих. |
| `rc-performance-test` | `done` | `planned`: benchmark на macOS возвращает RSS 0 и не проверяет exit code дочернего CLI; получен ложный `pass: true` при отсутствии зависимостей. |
| `release-roadmap-verified` | `done` | `planned`: verify-директива проверяет документ, а тесты/typecheck в `scripts/verify-roadmap.ts` вызываются через pipeline `| tail -10` без `pipefail`, что может скрыть ошибку. |
| `commitment-boundary-review` | `done`, обязательный gate | `in_progress`: `complete_task` лишь предлагает запустить `/commitment-review`; решение reviewer не блокирует завершение. |
| `stage-machine`, `nocowboy-runtime-ports`, `engine-adapter-package`, `nocowboy-i18n-package` | `done` | `in_progress`: часть правил изолирована от рабочего цикла; заявленных отдельных пакетов runtime/i18n/engine-adapter нет. |
| `ac-verification-hook` | `abandoned` | Прежняя AC-политика удалена; общий `session.stop` не доказывает её функциональную замену. |
| `release-all-tests-green`, ручной smoke test, внешние тестеры/feedback | `blocked` | Блокировки обоснованы: необходимого прогона или внешних результатов нет. |

## Доказательства и ограничения проверки

- Прошли: `check-runtime-boundary.ts --check`, `check-engine-adapter.ts --check`, `ownership-manifest.ts --check`, `backport-ledger.ts --check`, `quality-ratchet.ts`, `generate-docs.ts --check`. Генерация документации подтверждает только её синхронизацию с JSON.
- `engine-manifest.ts --check` завершился ошибкой: локально отсутствует заявленный объект upstream tag, поэтому provenance в этом checkout не подтверждён.
- `bun test` остановился до исполнения тестов на отсутствующем `@opentui/solid/preload`; `bun run typecheck` — на отсутствии `tsgo`. `bun install --frozen-lockfile` не стартует: `package.json` ссылается на отсутствующие workspace `packages/nocowboy-telemetry` и `packages/http-recorder` (это присутствует и в базовом `master`).
- Живые сценарии TUI/мыши, NUTAUSIK MCP, RU/EN и провайдеров не проверены. Тестовые файлы и wiring доступны для статического анализа, но не заменяют исполнимый smoke test.
- Строки `<<<<<<< SEARCH` / `>>>>>>> REPLACE` в тестах `search_replace` являются намеренными тестовыми данными, а не неразрешённым merge conflict.

## Архитектурный анблокер

Зависимым модулям нужен небольшой `GraphProvider` с методами `snapshot()`, `impacted(changedFiles, depth)` и `layer(file)`. Первый provider может использовать текущий repomap, хранить граф в памяти, обходить обратные import edges на глубину 1–2 и классифицировать слои по настраиваемым path rules. Каждый edge должен сообщать `confidence: "exact" | "heuristic"`; при неоднозначном basename нельзя молча выбирать единственный файл. Tree-sitter provider позже заменит наполнение графа без переписывания consumers. Vector-store switcher и SkillOpt не требуют этого контракта.

## Перенос и корректировка статусов

```bash
git fetch origin
git worktree add -b audit/curated ../nocowboy-curated origin/master
cd ../nocowboy-curated
git restore --source=chore/autopilot-uncommitted-dump -- \
  backport-ledger.json \
  packages/opencode/src/nocowboy/backport/ledger.ts \
  scripts/backport-ledger.ts
bun run scripts/backport-ledger.ts --check
git diff --check
git status --short
```

Следующие партии переносить как связки «код + call site + тест», начиная с AgentCatalog, затем TUI/i18n/Git, затем MemoryAdapter/MCP, затем граф. `dialog-indexing.tsx`, `indexing.ts`, `session/prompt.ts`, `mcp/index.ts` и `tool/task.ts` требуют особого ревью из-за влияния на рабочие сценарии. Красные файлы не копировать как есть.

При очистке `roadmap.json`: `knowledge-graph`, `vector-store-switcher`, `deep-context-2m`, `stop-hooks-turn-level`, `commitment-boundary-review`, `stage-machine` и memory-unification перевести в `in_progress`; `diff-impact-analysis`, `arch-layer-detection`, `deep-context-selection`, `skillopt-integration`, `obsidian-integration`, `rc-performance-test`, `release-roadmap-verified`, `mcp-prompt-support` — в `planned`. Реально внешние release/smoke/feedback блокировки оставить `blocked`. Другие новые `done` без исполнимого подтверждения держать `in_progress` до прохождения acceptance criteria. После исправления проверяющего скрипта и benchmark повторно генерировать `ROADMAP.md` и `CHANGELOG.md` из очищенного JSON.

Ни один вывод этого отчёта не означает, что уже проведены полный build, полный test suite или ручной smoke test.
