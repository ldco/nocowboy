# NoCowboy: аудит агентурного слоя и стратегии upstream

Дата: 5 октября 2026 года. Проверенный checkout: `170167c95b0b1f1cd9425ba3ec860bce056db5d3`, NoCowboy `1.0.9-alpha`. Рабочее дерево до аудита чистое. Исходный код не изменялся.

## Вывод

**Сейчас рекомендован закреплённый движок с избирательными backport, а не полная синхронизация Kilocode.** Затем — выделение NoCowboy runtime и адаптера движка, после чего контролируемые обновления базового движка снова могут стать экономически разумными.

Причина: наиболее ценные отличия находятся на пути исполнения `agent → session/prompt → task → permission → processor/llm`, а не только в изолированных каталогах. Автоматический merge способен сохранить файлы NoCowboy, но отключить их вызовы или изменить семантику состояния. Cherry-pick также требует адаптации и проверки: это способ ограничить площадь изменений, а не гарантия совместимости.

Сильные стороны: специализированные промпты RU/EN, существующие точки расширения tools/system/stop/compaction, отдельные модули памяти, кодировок, каскадного ревью и бюджета, TUI slots. Главные неподтверждённые гарантии: обязательная независимость reviewer, фактический read-only planner/reviewer, автоматическое прохождение всех стадий и полная локализация.

## 1. Границы доказательств и генеалогия

Локальный Git-репозиторий расположен в `projects/nocowboy`, а не в корне предоставленного workspace.

Корневой коммит — `ca721a2`, от 19 июня 2026 года, с сообщением `NoCowboy TUI — fork of KiloCode v7.3.46`. История содержит 840 коммитов, из них 839 после исходного снимка. В локальных refs только NoCowboy; remote `upstream` и файл `.opencode-version` отсутствуют. Это **импортированный снимок**, а не сохранённая цепочка Git-предков Kilocode.

Проверенный через GitHub тег Kilocode `v7.3.46` указывает на `f388b60ab579adef7cf1a6c022082100338d6450`. Соответствие исходного снимка этому тегу побайтово не установлено. Уже исходный коммит содержит каталог `src/nocowboy`, поэтому считать каждый файл в нём новой разработкой после форка нельзя.

Локальный drift относительно исходного снимка:

| Срез | Измерение |
|---|---|
| Весь репозиторий | 2 297 изменённых файлов; +93 194 / −41 712 строк |
| `packages/opencode/src` | 627 затронутых путей, из них 508 имеют статус M |
| `packages/opencode/src/nocowboy` | 211 затронутых путей; 130 M, 78 A, 2 D, 1 rename |
| `packages/core` | 70 затронутых путей |
| Текущий `src/nocowboy` | 309 файлов `.ts/.tsx` |
| `session/prompt.ts` | +572 / −255 строк |
| `tool/task.ts` | +173 / −57 строк |
| TUI `routes/session/sidebar.tsx` | +525 / −74 строки |

Это показатели изменения NoCowboy после импорта, **не** число конфликтов с сегодняшним Kilocode. Они включают переименование бренда, документацию, generated-файлы и удаления; без нормализации их нельзя превращать в «процент переписанного движка».

Свежий upstream проверен 5 октября через GitHub API и исходники, а не только поисковую выдачу:

- последний release, возвращённый `/releases/latest`: [Kilocode v7.8.3](https://github.com/Kilo-Org/kilocode/releases/tag/v7.8.3), опубликован 1 октября 2026 года;
- проверенная вершина `main`: [2792c704edd485768fceb2c51ecd330fa872f596](https://github.com/Kilo-Org/kilocode/commit/2792c704edd485768fceb2c51ecd330fa872f596);
- `.opencode-version` в этой вершине: `v1.18.26`.

Release и `main` — разные цели обновления. Далее сравнение новых агентских абстракций относится именно к закреплённому `main`. Количество отставших upstream-коммитов, точные merge-конфликты и стоимость полного переноса не измерены: общего предка в checkout нет, полное дерево upstream не загружалось. Нельзя выдавать прогноз ниже за результат пробного merge.

## 2. Agent Matrix & Coding Methods

### Реестр и жизненный цикл агентов

`packages/opencode/src/agent/agent.ts:297` вызывает `NocowboyAgent.patchAgents`. Реализация — `src/nocowboy/agent/index.ts:271`. Сначала строятся базовые агенты, затем NoCowboy заменяет набор, затем применяются пользовательские agent-конфиги. Служебные `compaction/title/summary` повторно закрываются от инструментов.

| Агент | Реальная роль и режим | Отличие и уязвимая граница |
|---|---|---|
| `auto` | Default, `primary`; Flash fallback | Имеет собственные tools и по промпту сам выполняет линейную работу. Это не чистый диспетчер без права менять код. |
| `architect` | Проектирование, ADR, NFR; `all` | Явный read-only bash и deny edit, с разрешениями для документов/планов. Agent-конфиг может ослабить правила: это предусмотрено кодом. |
| `planner` | Спецификация и AC; `all` | Назван read-only, но `patchAgents` не задаёт deny edit или read-only bash. Наследует defaults и пользовательские правила. |
| `worker` | Реализация, тесты, отладка; `all` | Образуется из базового `build`; fallback DeepSeek Flash. `build/general/code/debug` переводятся в `worker`. Отдельного встроенного fixer нет. |
| `reviewer` | Проверка AC; `all` | Имеет другой fallback — Moonshot/Kimi, но глобальный `cfg.model` может дать ту же модель, что worker. Ограничения read-only в определении отсутствуют. |
| `nocowboy` | Диалог, идеи, companion; `all` | Отдельный persona prompt; техническая маршрутизация задаётся инструкциями. Это не закрытый chat-only capability profile. |
| `compaction/title/summary` | Внутренние агенты | RU-варианты промптов и принудительное `* : deny`; существенный инвариант, который надо сохранять при изменении agent lifecycle. |

`all` позволяет выбирать роль в TUI и использовать через `task`. Список типов `task` фильтрует `primary`, но `KiloTask.validate()` ничего не запрещает: запрет spawn `auto` не является отдельной проверкой executor. Политику доступных ролей следует выразить один раз и применять как при описании tools, так и при исполнении.

**Факт о read-only:** `agent.ts:115` начинает defaults с `* : allow`. Встроенные planner/reviewer добавляют разрешения, но не вводят запрет изменения файлов. `NoCowboySessionPrompt.guardPermissions/hardPermissions` повторно применяют agent rules, а не создают отсутствующий deny. Поэтому описание «read-only» для них не доказано и противоречит встроенному профилю по умолчанию. Это собственная граница NoCowboy, а не дефект upstream. Нельзя полагаться на неё как на барьер безопасности при merge.

**Факт о cross-model:** `resolveModel` предпочитает agent model, затем глобальную model, затем fallback. Само наличие разных hardcoded fallback не обеспечивает независимого ревью. `review/cascade.ts` допускает конфигурируемую карту семейства автора к reviewer и вторую фазу; по умолчанию функция возвращает пустой результат, если cascade не включён. Вторая фаза может использовать автора. Независимость — отдельная политика, которую нужно валидировать.

### Как действительно меняются файлы

| Механизм | Исполнение | Что специфично и что сохранять |
|---|---|---|
| `edit` | Текстовые замены в базовом tool | NoCowboy EncodedIO и ConfigValidation; сохранить путь permission, форматирование, LSP и metadata diff. |
| `apply_patch` | Текстовый patch с подготовкой изменений нескольких файлов | NoCowboy чтение/запись исходной кодировки и проверка конфигов. Не AST-редактор. |
| `write` | Запись полного содержимого файла | EncodedIO, проверка конфигов, собственный secret scan. |
| `search_replace` | Новый Aider-подобный `<<<<<<< SEARCH / ======= / >>>>>>> REPLACE` | Точное строковое совпадение, CRLF, BOM, кодировка, diff для permission, LSP/format и ConfigValidation. Файл находится в общем `src/tool`, а не в `src/nocowboy`. |

В проверенном runtime не найден собственный AST-механизм редактирования production-кода. `ts-morph` в `script/upstream` относится к преобразованиям при сопровождении форка, а не к обычной работе агента.

`search_replace` ищет первое точное совпадение через `indexOf`: это не проверка семантической уникальности цели. Изменения предварительно собираются, затем после разрешения записываются последовательно. Для нескольких блоков одного файла каждый блок читает файл до фазы записи: такой batch нельзя считать доказанно последовательным применением или атомарной транзакцией. При выделении EditPort нужно явно определить совпадения, объединение блоков, защиту от устаревшего чтения и поведение частичного сбоя.

Выбор инструментов уже зависит от модели: `tool/registry.ts:344` включает `apply_patch` для части `gpt-*` и E2E URL, исключая `edit`; `write` и `search_replace` остаются в общем списке. Следовательно, нет единственной обязательной методики редактирования: фактическое поведение зависит от модели, tools и промпта. Лучше заменить проверку имени модели capability-конфигурацией.

### Оркестрация и верификация

1. `auto` получает запрос и решает, работать самому, делегировать или передать роль. Цепочка architect → planner → worker → reviewer описана в промптах. Она не равна принудительному автомату стадий.
2. `session/router.ts` распознаёт `#route:` в тексте assistant. В `session/prompt.ts:1685` main session запускает следующий loop с `agentOverride`; это смена роли в той же сессии, а не новый child через `task`. Парсер извлекает описание/body, но этот участок передаёт в loop имя роли, не создаёт отдельное сообщение с `route.prompt`. Текстовый handoff нужно сохранить и формализовать при миграции.
3. `tool/task.ts` создаёт child session, проверяет принадлежность при resume, выбирает модель, переносит permissions, учитывает стоимость и поддерживает background execution. Дочерние tools `task/question` закрываются; `nestedTask()` возвращает false.
4. `Activity`, `ToolBusy`, watchdog и stream-idle обеспечивают различие между зависанием модели и законным ожиданием tool/permission. Это затрагивает основной loop и Effect layers, а не только отдельный helper.
5. `agent-teams` предоставляет file-backed task list, mailbox и team lead. `team_spawn` создаёт структуру задач и inbox; он сам не запускает готовую команду worker-процессов. Запуск участников остаётся через `task`.
6. `session.stop` допускает продолжение вместо завершения; loop ограничивает повторные блокировки. Встроенный `ACVerificationHook` проверяет имя агента **`goal`**, а `patchAgents` такого встроенного агента не создаёт. Для стандартных шести ролей это не универсальный AC-barrier. В реестре tools также не зарегистрированы найденные в дереве `check/complete_task`; упоминание `complete_task` в critical rules не доказывает доступности.
7. Autopilot имеет бюджет продолжений, анализ roadmap и stall policy. Checkpoints, recovery compaction, очередь prompts и cost propagation дополняют runtime. Эти гарантии потребуют совместного переноса с их вызовами и состоянием.

**Оценка:** специализированные роли и инженерный workflow реализованы; обязательность всей цепочки, read-only reviewer и независимость модели — не установлены. Надёжность нельзя вывести из строгости формулировок промпта.

### Что добавил современный Kilocode

Проверены [agent/index.ts на закреплённом SHA](https://github.com/Kilo-Org/kilocode/blob/2792c704edd485768fceb2c51ecd330fa872f596/packages/opencode/src/kilocode/agent/index.ts) и [tool/task.ts](https://github.com/Kilo-Org/kilocode/blob/2792c704edd485768fceb2c51ecd330fa872f596/packages/opencode/src/tool/task.ts).

Kilocode сохраняет `build → code`, plan/explore, добавляет debug/ask и deprecated orchestrator; имеет более развитые plan/explore guards и интеграцию task board. В task появились ограничение `subagent_depth`, background-process bridge, resume hints и JSON-schema слой. Это пересекается с NoCowboy worker aliases, own planner, hard permissions, team registry, watchdog и background resume.

Это конфликт **политик и lifecycle**, не доказательство ошибки чужого кода. Новый Kilo `orchestrator` помечен deprecated: нельзя обосновывать обновление обещанием, что upstream предлагает обязательный новый универсальный orchestration runner.

## 3. Upstream Friction Matrix

Пути далее относительно `packages/opencode/src`, если не указано другое. Степень — прогноз семантического конфликта, не результат Git merge.

| Компонент / файл | Что сделано в NoCowboy | Что делает проверенный upstream | Конфликт | Решение |
|---|---|---|---|---|
| `agent/agent.ts`, `nocowboy/agent/index.ts` | Свой набор, aliases, RU/EN, model selection | Code/plan/explore/debug/ask и свои guards | **Critical** | Держать набор; выделить AgentCatalog + PolicyPort |
| `session/prompt.ts`, `session/router.ts` | Routes, очередь, goal/autopilot, watchdog, stop hook | Развивающийся core loop и subagent lifecycle | **Critical** | Изолировать Orchestrator; изменения core переносить вручную |
| `tool/task.ts`, `nocowboy/tool/task.ts` | Собственные permissions, cascade, watchdog, cost | Depth limit, background bridge, resume/schema changes | **Critical** | Держать политику; взять отдельные механизмы после адаптации |
| `agent/subagent-permissions.ts`, `permission/*` | Agent/session ceilings, YOLO, специальное наследование | Собственные hard guards и permission evolution | **Critical** | Один PolicyPort; invariant tests обязательны |
| `session/system.ts`, `session/llm.ts` | Soul, язык, memory/handoff, provider prompts | Базовое формирование запросов и protocol adapters | **High** | PromptComposer + MemoryPort; protocol fixes выбирать |
| `session/compaction.ts`, `nocowboy/session/checkpoint*` | Checkpoint/recovery и retarget очереди | Tail preservation, token budgets, pruning boundaries | **High** | Backport алгоритмов с сохранением checkpoint contract |
| `tool/edit.ts`, `write.ts`, `apply_patch.ts` | Кодировки/BOM, config validation, secret scan | Базовые filesystem tools | **High** | EditPort middleware; базовый механизм можно брать выборочно |
| `tool/search_replace.ts` | Новый текстовый edit format | Отдельный NoCowboy tool, отсутствовал в исходном локальном snapshot | **Med** | Перенести в собственный tool package; не объявлять AST |
| `mcp/index.ts`, `nutausik-client.ts`, auto-wire | Project scoping + параллельный raw JSON-RPC | Общий MCP transport/runtime | **High** | MemoryPort через один транспорт; generic MCP fixes брать отдельно |
| TUI `app.tsx`, prompt, sidebar, sync | Clickable UI, свои панели, кнопки и события | Solid/OpenTUI и plugin runtime | **High** | UI slots + facade; не заменять файл целиком |
| `nocowboy/ui/i18n.ts`, TUI context | Typed RU/EN словарь + phrase lookup | Изменяющиеся UI labels и components | **High** | Независимый словарь и keys; UI update требует review |
| `provider/provider.ts`, gateway, `packages/core` | Собственные schemas/loaders/routes/options | Provider protocol/config evolution | **High** | ProviderPort и конвертеры schema; брать совместимые исправления |
| `provider-balance.ts`, cost propagation | API balance, TTL, parent cost | Generic usage и shared provider/session types | **Med** | TelemetryPort + отдельные BalanceAdapters |
| `nocowboy/components/nocowboy-bars.tsx` | Git branch/ahead/behind/dirty, polling | TUI component/event API | **Med** | Git service → view model → slot |
| `agent-teams`, review cascade, budget | Отдельные domain-модули | Task board/manager и core task | **Med** | Держать domain; не объединять независимые registries вслепую |
| `script/upstream/utils/config.ts` | Унаследованный updater с Kilo mappings | Механизм OpenCode → Kilo | **Critical при запуске** | Не использовать для Kilo → NoCowboy без отдельного профиля |

Последняя строка особенно практична: updater всё ещё переводит `@nocowboy/cli/sdk/plugin` **в `@kilocode/*`**, нацелен на `anomalyco/opencode`, использует Kilo patterns и допускает take-theirs для UI. Это не готовый менеджер данной генеалогии форка. Сохранение `src/nocowboy` само по себе не защитит точки вызовов.

## 4. i18n, мышь, память и инфраструктура

### RU/EN: рабочая основа, неполное покрытие

`nocowboy/ui/i18n.ts` содержит тип ключей, RU/EN словари и phrase map. TUI context экспортирует `t(key)` с placeholders и `p(phrase)`; Solid signal обновляется через мост от `sync.data.config.lang`. Агентские промпты имеют отдельные `.txt` / `.ru.txt`; системные prompts выбираются в `session/system.ts`.

Это уже независимый словарь, но ещё не независимая архитектура локализации:

- phrase lookup опирается на английский literal: изменение upstream wording превращает перевод в passthrough;
- в own sidebar usage остаются `Token Usage`, `Input`, `Output`, `Cached`; в custom sidebar — `[+ New Session]` и `[ Share ]`;
- environment, task reentry, autopilot и identityAnchor содержат английские строки;
- UI использует signal, Agent state имеет свой cache key, а системные prompts — module-global `_lang`. В `NocowboyAgent.cacheKey` нет `lang`, хотя выбранный agent prompt от него зависит. Без проверки invalidation нельзя обещать согласованное hot switching;
- `packages/ui/src/context/i18n.tsx` — отдельная точка локализации; единое покрытие TUI/GUI не подтверждено.

Риск затирания высокий в изменяемых upstream-компонентах; риск потерять сам словарь ниже. Решение: locale передаётся через RequestContext, стабильные keys для UI и prompt fragments, проверка полноты словарей, запрет новых пользовательских literals в own modules. Проверить переключение RU→EN→RU в открытой сессии и параллельные проекты с разными locale.

### Мышь: публичные handlers, но инвазивное монтирование

В `TUI/app.tsx:135–146` мышь включена через config/flag и `useMouse`. Обработчики `onMouseDown/onMouseUp` стоят в app, prompt, sidebar и own buttons; используются preventDefault/stopPropagation, focus и selection API. Это не найденный отдельный глобальный parser терминального mouse protocol.

В проверенных точках **не обнаружена прямая зависимость обработчиков мыши от приватных OpenTUI методов**. Используются JSX events и renderer API. Это ограниченный вывод по просмотренным файлам, не гарантия совместимости любых версий. Главная связность — расположение handlers внутри крупных upstream-компонентов, порядок mount/propagation, focus и SDK/context types.

Готовая основа изоляции — `@nocowboy/plugin/tui` и `slots.register`: own sidebar plugins уже используют её. Но `sidebar-usage` импортирует внутренние `useLocal` и `getUsage`; slots пока не дают полной автономии. Git bar синхронно читает `.git/HEAD` и вызывает Git, обновляясь раз в 10 секунд: это polling, не непрерывный Git event stream. Выделение GitPort одновременно защищает TUI от filesystem/worktree особенностей и блокирующих вызовов.

### «Нутаусик»: частично изолирован, runtime-связность высокая

Имеются три слоя:

1. Generic MCP SDK в `mcp/index.ts`: special `PROJECT_SCOPED_MCP` для nutausik и добавление projectDir в tool calls.
2. `nutausik-client.ts`: отдельный JSON-RPC через fetch, default `127.0.0.1:9210/mcp`, env override, bounded timeouts, memory/coherence/handoff.
3. Auto-wire/lifecycle: launcher и proxy startup в bootstrap, hooks на create/remove session, автоматический handoff/compact/logging и metrics.

Память внедряется в `session/system.ts`; module environment cache связан с project directory. Это собственная контекстная интеграция, не просто декларативное подключение MCP server.

Raw client возвращает пустую строку при transport failure и не превращает JSON-RPC/tool error в явный memory status. Session-end операции fire-and-forget; нельзя утверждать гарантированное сохранение handoff на shutdown. Logging hook дополнительно прописывает shell/python/curl command с literal endpoint, обходя общий client/env override. Эти особенности важны для переноса, наблюдаемости и project isolation.

Рекомендовано сохранить degraded operation без памяти, но сделать состояние явным: available/degraded/unavailable, structured errors, session/project identity в каждом вызове, один transport adapter, bounded shutdown flush. Это снимает dependency со структуры `session/system.ts` и внутренних Effect services. Запускать сторонний MCP ради статического аудита не требовалось; сервер и его persistence здесь не верифицированы.

### Провайдеры, деньги и токены

Реальные точки: `nocowboy/provider/provider.ts`, `packages/nocowboy-gateway`, `packages/core/src/plugin/provider/nocowboy.ts`, provider metadata/options/model filter, budget и balance adapters. Generic AI SDK используется совместно с custom schemas/loaders; наличие Chinese defaults не означает независимость от shared provider runtime.

Balance module имеет registry для DeepSeek, Moonshot/Kimi и OpenRouter, baseURL override и cache TTL 5 минут. Widget mounting находится в sidebar/context и subagent footer. Session cost propagation сериализует обновления parent message, чтобы параллельные children не потеряли сумму; это нужно сохранять при смене persistence/runtime.

Различать три показателя: токены из usage, расчёт стоимости по metadata модели и остаток из provider billing API. Они не взаимозаменяемы. Balance failure сейчас возвращает 0, поэтому zero не доказательство отсутствия средств. В отдельных own balance fetch используется `rejectUnauthorized:false`: это собственный workaround транспорта, его не следует закреплять как нормальный контракт суверенного provider adapter.

Наличие configurable baseURL и китайских моделей подтверждено. Фактическая доступность из РФ, корректность тарифов, прокси-маршрутизация всех tools и независимость от внешних каталогов не проверялись сетевыми запросами к пользовательским аккаунтам. Обещать «санкционную независимость» по этим исходникам нельзя.

## 5. Что забирать и что не импортировать целиком

**Ценные кандидаты, подтверждённые просмотренными upstream-участками:** сохранение recent tail при compaction, token budgeting и pruning на границах cache invalidation; ограничения глубины subagents и resume diagnostics; терпимость provider config к malformed model entry. Для первого нужен перенос вместе с NoCowboy queue/checkpoints; для второго — согласование с нашей depth policy; третий можно оценить как относительно узкий adapter/config backport.

Generic MCP compatibility и provider protocol fixes могут быть ценны, но каждый кандидат надо сопоставить с уже перенесёнными локальными исправлениями. В истории есть release `0.14.0 — Security Hardening & Upstream Harvest` и явные annotations с upstream SHA: выборочный harvest уже используется. Повторный перенос способен вернуть старую семантику.

Улучшения terminal protocols не установлены этим сравнением: не следует считать их аргументом за full merge без конкретного изменения OpenTUI/PTY и воспроизводимого сценария. Аналогично «все базовые фиксы» — слишком неопределённая категория для решения.

**Не импортировать автоматически:** default agent set, marketplace/organization/cloud wiring, авторизацию Kilo gateway, дефолтные configs, брендовые mappings updater. Они могут быть полезны другим продуктам, но не оправдывают конфликт с нашим runtime. Западный provider сам по себе не токсичен: критерий — обязательная внешняя зависимость, изменение defaults или нарушение собственной политики маршрутизации.

### Что первым деградирует при обновлении

Прямой rebase не имеет сохранённого upstream base в этой истории; обычный merge независимых историй не является нормальной операцией синхронизации. Принудительное объединение unrelated histories не создаст корректную модель общего форка. Сначала нужно выбрать reference snapshot и сравнить нормализованные деревья либо переносить изменения вручную.

При ручном merge/замене общих файлов первыми под риском:

1. Agent aliases/default selection и permissions: режим поменяется, roles станут недоступны либо будут иметь иные mutation rights.
2. Child lifecycle: background notifications/resume, watchdog cancellation, долгие tools и permission waits. Ошибка здесь выглядит как зависание или потерянный результат.
3. Loop continuation: routes, stop hooks, autopilot и checkpoints; обновление может завершать goal раньше или продолжать лишние turns.
4. Compaction: retarget prompt queue, recovery chunks, сохранность memory/AC контекста и schema сообщений.
5. UX/i18n: handlers, focus, slots, sync events, phrase translations; сохранённый словарь не спасает удалённую точку вызова.
6. Telemetry: повторное включение child cost, пропавшие events/schema fields, неверный balance/provider match.

Это прогноз приоритетов regression testing. Реальный merge не выполнялся.

## 6. Action Plan: независимые слои вместо разнесённых patch-функций

### P0. Зафиксировать измеримую базу

- Записать engine manifest: NoCowboy SHA, заявленный исходный Kilo tag/SHA, provenance confidence, версии OpenTUI/AI SDK/MCP SDK и список локальных upstream backport.
- Ввести отдельный NoCowboy merge profile; выключить legacy OpenCode→Kilo transforms для этого workflow. Хранить upstream как read-only reference, сравнивать с нормализацией package names/paths.
- Разделить файлы на owned, adapted и generated. `src/nocowboy` не использовать как единственный ownership criterion.
- Зафиксировать executable contracts: read-only planner/reviewer, spawnable agents, review model policy, edit behavior, memory scope, budget/cost и continuation. Исправления собственных несоответствий — отдельная работа, этот аудит их не вносит.

### P1. Сначала агентурный runtime

Создать `@nocowboy/runtime` без imports из `@/session`, `@tui` и внутренних provider services. Доменные зависимости только через интерфейсы:

| Интерфейс | Контракт |
|---|---|
| `AgentCatalog` | Roles, capabilities, prompt IDs, model policy; schema/config вместо мутации upstream map |
| `PolicyPort` | Effective permissions, mutation ceilings, delegation rules; единый порядок применения |
| `SessionPort` | Создать/resume/cancel child, append message, events, project identity |
| `EditPort` | prepare diff → permission → apply → verify; encoding/BOM, conflicts и batch semantics |
| `ModelPort` | Resolve/fallback/capabilities; проверка независимости reviewer |
| `MemoryPort` | Context/handoff/session start/end; явные errors, timeout, namespace |
| `TelemetryPort` | Usage, cost ledger, balance status, Git events |

Отдельный `@nocowboy/engine-adapter` связывает эти ports с Effect layers/InstanceState и текущими schemas. Переносить по одному вертикальному сценарию, начиная с worker + task + permissions; оставлять одну точку входа в shared core вместо нескольких разрозненных callbacks.

`#route:` заменить внутренним структурированным `Handoff { target, reason, context, artifacts }`, сохранив textual parser как compatibility adapter. Если обязательна цепочка AC/review, реализовать stage machine `design? → plan → implement → verify → accept/fix`, а prompt оставить подсказкой. Детерминированный gate проверяет результаты, а не наличие слов APPROVED/DONE.

### P2. Использовать существующие hooks, не переоценивать их

Уже доступны `tool.definition`, `tool.execute.before/after`, `experimental.chat.system.transform`, `experimental.session.compacting`, `experimental.compaction.autocontinue` и собственный `session.stop` в `packages/plugin/src/index.ts`.

Выносить через них system fragments, инструменты, validation и stop policy. Но hooks **не покрывают** всю мутацию agent registry, task cancellation/queue и transport semantics. Для этого нужен узкий engine adapter. Experimental hooks закрыть versioned facade и contract tests; собственный `session.stop` сохранять как явно поддерживаемый adapter seam, а не предполагать наличие в любом upstream.

### P3. Независимый UI и локализация

- `@nocowboy/i18n`: stable keys, placeholders и locale context для UI/runtime prompts. Удалять phrase fallback постепенно, начиная с наших панелей.
- `@nocowboy/ui`: TUI widgets через slots; facade предоставляет agent/model/usage/git/memory view models. Убрать imports внутренних `useLocal/getUsage`.
- Отдельный InputPort или UI facade для mouse/focus/selection; contract на button propagation и navigation, а не собственный terminal protocol parser без необходимости.
- Git/balance polling вынести из render functions в асинхронные services. Represent unknown/stale/error отдельно от 0.

### P4. Memory и provider adapters

- Свести raw fetch и generic MCP path к одному MemoryAdapter, передавать project/session explicitly, убрать shell logging endpoint из lifecycle.
- Ввести наблюдаемое degraded состояние и flush contract; проверить изоляцию двух проектов и нескольких child sessions.
- Сохранить provider baseURL/proxy policy в ProviderAdapters; преобразовывать shared model schema на границе. Разделить capability metadata, billing currency/status и generation protocol.

### P5. Обновление как проверяемый experiment

Для каждого backport: upstream SHA → локальная потребность → затронутый contract → adaptation diff → проверка → запись в ledger. Если fix тянет значительную часть session/runtime, оценить цельный совместимый срез, а не раскладывать обязательные зависимости на случайные cherry-pick.

Минимальные сценарии при будущей миграции:

- worker child: foreground/background, resume, cancel, timeout; долгий tool и permission ожидание не считаются stall;
- planner/reviewer: edit/write/patch/search_replace/bash/MCP mutation согласно policy, включая YOLO и delegation;
- два параллельных child costs; resumed child не учитывается повторно;
- RU/EN switch в живой сессии и два проекта с разными locale;
- edit round-trip UTF-8 BOM, CRLF, legacy encoding; duplicate match, batch same file, stale read и partial failure;
- память недоступна/восстановилась; namespaces разных проектов не смешиваются;
- compaction при активном goal/checkpoint; очередь и budget не теряются;
- mouse click/focus/selection/navigation на поддерживаемых терминалах.

Существующие `test/nocowboy` уже содержат watchdog, permissions, cost propagation, review cascade, balance, encoding, i18n и autopilot тесты. Это база для contracts, а не доказательство текущего прохождения. В checkout отсутствует root `node_modules`; тесты, typecheck и интерактивные TUI сценарии в данном статическом аудите не запускались, зависимости не устанавливались.

## 7. Итоговый вердикт

**Обосновано:** полный upstream merge сейчас имеет чрезмерную площадь семантического риска; нужны pinned core + selective backport и сначала изоляция Agent/Policy/Session/Edit contracts.

**Не обосновано:** полностью отказаться от upstream навсегда. Обслуживать MCP, provider protocols, terminal dependencies и compaction собственными силами дорого. После появления адаптера и совместимых contract tests регулярные ограниченные обновления могут быть выгоднее бесконечной коллекции patches.

Решающая граница — не «наш код лежит в своей папке», а «движок можно заменить, сохранив измеримые права, lifecycle, методы редактирования и пользовательские сценарии». Сегодня эта граница ещё не создана.

## Карта основных исходников

- [Определение агентов](/Users/romanzinnatov/Documents/dev/Fabrika22/projects/NoCowboy/projects/nocowboy/packages/opencode/src/nocowboy/agent/index.ts:271)
- [Интеграция реестра и defaults](/Users/romanzinnatov/Documents/dev/Fabrika22/projects/NoCowboy/projects/nocowboy/packages/opencode/src/agent/agent.ts:115)
- [Основной loop и маршрутизация](/Users/romanzinnatov/Documents/dev/Fabrika22/projects/NoCowboy/projects/nocowboy/packages/opencode/src/session/prompt.ts:1685)
- [Task executor и watchdog](/Users/romanzinnatov/Documents/dev/Fabrika22/projects/NoCowboy/projects/nocowboy/packages/opencode/src/tool/task.ts:325)
- [Профили и наследование task permissions](/Users/romanzinnatov/Documents/dev/Fabrika22/projects/NoCowboy/projects/nocowboy/packages/opencode/src/nocowboy/tool/task.ts:36)
- [SEARCH/REPLACE](/Users/romanzinnatov/Documents/dev/Fabrika22/projects/NoCowboy/projects/nocowboy/packages/opencode/src/tool/search_replace.ts:79)
- [Memory client](/Users/romanzinnatov/Documents/dev/Fabrika22/projects/NoCowboy/projects/nocowboy/packages/opencode/src/nocowboy/nutausik-client.ts:19)
- [Словарь RU/EN](/Users/romanzinnatov/Documents/dev/Fabrika22/projects/NoCowboy/projects/nocowboy/packages/opencode/src/nocowboy/ui/i18n.ts:161)
- [TUI slots usage](/Users/romanzinnatov/Documents/dev/Fabrika22/projects/NoCowboy/projects/nocowboy/packages/opencode/src/nocowboy/plugins/sidebar-usage.tsx:69)
- [Legacy updater mappings](/Users/romanzinnatov/Documents/dev/Fabrika22/projects/NoCowboy/projects/nocowboy/script/upstream/utils/config.ts:58)