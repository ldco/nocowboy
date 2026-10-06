# NoCowboy — Changelog

<!-- AUTO-GENERATED from docs/roadmap.json. Do not edit manually. -->

## v0.6.1 — Fork & Foundation (2026-06-24)

### Core Infrastructure

- **DONE** Форк от Kilo Code (TypeScript + Bun + SolidJS + OpenTUI)
  `verify:file docs/features/fork-from-kilocode.md`
- **DONE** Компиляция в single binary — `bun build --compile`
  `verify:grep package.json release`
  `verify:file docs/features/compiled-binary.md`
- **DONE** Repomap — `nocowboy repomap`, авто-инжекция в system prompt
  `verify:file packages/opencode/src/nocowboy/repomap.ts`
  `verify:grep packages/opencode/src/nocowboy/system-prompt.ts RepoMap`
  `verify:file docs/features/repomap.md`
- **DONE** Goal judge — `/goal` команда с subagent-оценкой
  `verify:file packages/opencode/src/nocowboy/session/goal.ts`
  `verify:file docs/features/goal-judge.md`
- **DONE** Voice input — FFmpeg + транскрипция
  `verify:grep packages/opencode/src/cli/cmd/tui voice`
  `verify:file docs/features/voice-input.md`
- **DONE** Multi-turn approval memory — Allow once per session (Codex CLI style)
  `verify:file packages/opencode/src/permission/index.ts`
  `verify:file docs/features/approval-memory.md`
- **DONE** Deep context — repomap + memory в system prompt
  `verify:file docs/features/deep-context.md`
- **DONE** Global config — `~/.config/nocowboy/nocowboy.json`
  `verify:file packages/opencode/src/config/config.ts`
  `verify:file docs/features/global-config.md`
- **DONE** Indexing — first-class (не плагин)
  `verify:file packages/opencode/src/nocowboy/indexing.ts`
  `verify:file docs/features/indexing.md`
- **DONE** Russian system prompts — `code.ru.txt`, `debug.ru.txt`
  `verify:file packages/opencode/src/agent/prompt/worker.ru.txt`
  `verify:file packages/opencode/src/agent/prompt/auto.ru.txt`
  `verify:file docs/features/russian-system-prompts.md`
- **DONE** ADR: Turso Database adoption (Phase 1 blocked, Phase 2 done)
  `verify:file docs/reference/turso-database-adoption.md`
  `verify:file docs/features/turso-adr.md`
- **DONE** Поле `lang` в схеме конфига
  `verify:file packages/opencode/src/nocowboy/config/config.ts`
  `verify:file docs/features/lang-config-field.md`

- **DONE** SQLite vector store (LanceDB replacement, -15MB)
  `verify:file docs/features/sqlite-vector-store.md`
- **DONE** Zero-config wizard — nocowboy init
  `verify:file docs/features/zero-config-wizard.md`
- **DONE** Provider-agnostic — 200+ models via LiteLLM
  `verify:file docs/features/provider-agnostic.md`
- **DONE** Embedded MCP proxy — zero external deps, cross-platform
  `verify:file docs/features/embedded-mcp-proxy.md`
- **DONE** Plugin out/plugin in MCP — auto-detect, npm install
  `verify:file docs/features/plugin-mcp.md`
- **DONE** Launch spec registry (~/.nocowboy/mcp/launch.json)
  `verify:file docs/features/launch-spec-registry.md`
- **DONE** npm publishing pipeline — platform packages + meta-package
  `verify:file docs/features/npm-publishing-pipeline.md`
- **DONE** Incremental PR review — code-reviewer checks only git diff
  `verify:file docs/features/incremental-pr-review.md`

## v0.7.4 — P3 Agent Refactor (2026-07-03)

- **DONE** Agent reduction: 15 → 5
  `verify:grep packages/opencode/src/nocowboy/agent code`
  `verify:file docs/features/agent-refactor-15to5.md`
- **DONE** Tool groups — `groups` field in ConfigAgent
  `verify:file docs/features/tool-groups.md`
- **DONE** Tool groups for agents (read/edit/command/mcp)
  `verify:file docs/features/tool-groups-agents.md`
- **DONE** Agent descriptions — короткие, readable (v0.7.4)
  `verify:file docs/features/agent-descriptions-short.md`

## v0.7.5 — P2 UX & Safety + NUTAUSIK Auto-Wiring (2026-07-04)

- **DONE** P2-A2: Search/Replace edit format (Aider-style)
  `verify:file docs/features/search-replace.md`
- **DONE** P2-A3: Branch-per-task
  `verify:file docs/features/branch-per-task.md`
- **DONE** P2-A4: Permission timeout (auto-deny)
  `verify:file docs/features/permission-timeout.md`
- **DONE** P2-A5: Yolo mode toggle
  `verify:file docs/features/yolo-mode.md`
- **DONE** AGENTS.md + code.txt + debug.txt — укреплённые инструкции
  `verify:file docs/features/agent-instructions.md`
- **DONE** NUTAUSIK Phase 1 — hooks, NutausikDot, fix port + SQLite
  `verify:file docs/features/nutausik-phase1.md`
- **DONE** NUTAUSIK v0.2.0 — context_inject, handoff, coherence, loop_close
  `verify:file docs/features/nutausik-v020-tools.md`
- **DONE** NutausikDot — 3-state TopBar indicator (v0.7.5)
  `verify:file docs/features/nutausik-dot.md`
- **DONE** Todo injection — NUTAUSIK context block в system prompt (v0.7.5)
  `verify:file docs/features/todo-injection.md`

## v0.7.6 — Token Cost Optimization + Identity Scoping (2026-07-04)

- **DONE** Token cost investigation + repomap watcher cache
  `verify:file docs/features/token-cost-optimization.md`
- **DONE** soul.txt — 71% reduction (3449→980 chars)
  `verify:file docs/features/soul-reduction.md`
- **DONE** Soul + identity only for nocowboy agent
  `verify:file docs/features/soul-scoping.md`
- **DONE** Auto-dream: critical rules enforce nutausik_memory_add
  `verify:file docs/features/auto-dream-rule.md`
- **DONE** MEMORY.md → NUTAUSIK memory migration
  `verify:file docs/features/memory-migration.md`

## v0.7.7 — Template System Overhaul + Russian Language (2026-07-05)

- **DONE** Template system: 18→7 built-in templates, /continue
  `verify:file docs/features/template-overhaul.md`
- **DONE** Skills: 12→5, kilo-config→nocowboy-config
  `verify:file docs/features/skills-cleanup.md`
- **DONE** PuppetMaster MCP: pm_git_commit removed, 5 prompts capability
  `verify:file docs/features/puppetmaster-mcp-refactor.md`
- **DONE** Git MCP wrapper — packaging/mcp-servers/git/
  `verify:file docs/features/git-mcp-wrapper.md`
- **DONE** Three-dimensional doc system: ROADMAP/CHANGELOG/BACKLOG
  `verify:file docs/features/three-doc-system.md`
- **DONE** MEMORY.md + Kilo references removed from instructions
  `verify:file docs/features/backward-compat-removal.md`

## v0.7.8 — Ecosystem & Compliance (2026-07-05)

- **DONE** /sandbox — built-in template: checkpoint, diff, confirm, apply
  `verify:file packages/opencode/src/nocowboy/sandbox.ts`
  `verify:file docs/features/sandbox-template.md`
- **DONE** /mcp — built-in template: search, install, list, remove MCP servers
  `verify:grep packages/opencode/src/server/routes/instance/httpapi/groups mcp`
  `verify:file docs/features/mcp-marketplace.md`
- **DONE** /ollama — built-in template: auto-detect, configure, switch to local Ollama models
  `verify:grep packages/opencode/src/nocowboy/config/overlay.ts ollama`
  `verify:file docs/features/ollama-template.md`
- **DONE** P3-B1: LICENSE.md — Chapter 69 Civil Code РФ
  `verify:file LICENSE.md`
  `verify:file docs/features/license-rf.md`
- **DONE** P3-B2: Consent dialog на первом запуске TUI
  `verify:file docs/legal/152FZ-COMPLIANCE.md`
  `verify:file docs/features/consent-152fz.md`
- **DONE** P3-B4: /forget — команда очистки всех данных
  `verify:grep packages/opencode/src/nocowboy/server/httpapi/groups/background-process.ts forget`
  `verify:file docs/features/forget-template.md`
- **DONE** P3-B3: Локализация данных — SQLite в .nocowboy/storage/
  `verify:grep packages/opencode/src/nocowboy/session/checkpoint-paths.ts nocowboy/storage`
  `verify:file docs/features/data-localization.md`
- **DONE** P3-B5/B6: Правовое обоснование + полный анализ 152-ФЗ
  `verify:file docs/legal/152FZ-COMPLIANCE.md`
  `verify:file docs/features/legal-152fz.md`
- **DONE** scripts/publish-all.sh — скрипт публикации 9 MCP-пакетов
  `verify:file scripts/publish-all.sh`
  `verify:file docs/features/publish-all-script.md`
- **DONE** 9 пакетов @nocowboy/mcp-* готовы к публикации
  `verify:file packaging/mcp-servers/constitution/package.json`
  `verify:file packaging/mcp-servers/score-engine/package.json`
  `verify:file docs/features/mcp-packages-ready.md`

## v0.7.9 — Sandbox + Share (2026-07-06)

- **DONE** /sandbox-docker — Docker sandbox isolation template
  `verify:file packages/opencode/src/nocowboy/sandbox.ts`
  `verify:grep packages/opencode/src/nocowboy/sandbox.ts isDockerAvailable`
  `verify:file docs/features/sandbox-docker.md`
- **DONE** /share — session sharing template
  `verify:file packages/opencode/src/share/share-next.ts`
  `verify:file packages/opencode/src/share/session.ts`
  `verify:file docs/features/share-template.md`
- **DONE** MCP marketplace — mcp search template
  `verify:grep packages/opencode/src/nocowboy/cli/cmd/tui/feature-plugins/home/tips.ts Run {highlight}/share`
  `verify:file docs/features/mcp-marketplace-template.md`

## v0.8.0 — Full Auto-Wiring (2026-07-08)

- **DONE** NUTAUSIK Auto-Wiring: fetchContext, onSessionCreated, fetchCoherenceCheck
  `verify:grep packages/opencode/src/nocowboy/nutausik-client.ts fetchContext`
  `verify:grep packages/opencode/src/session/session.ts onSessionCreated`
  `verify:file docs/features/nutausik-auto-wiring.md`
- **DONE** Session Handoff: auto-save/load HANDOFF через nutausik-client
  `verify:grep packages/opencode/src/nocowboy/nutausik-client.ts handoff_save`
  `verify:file docs/features/handoff-auto.md`
- **DONE** Escalation Statuses: DONE/DONE_WITH_CONCERNS/BLOCKED в critical rules
  `verify:grep packages/opencode/src/session/system.ts DONE_WITH_CONCERNS`
  `verify:file docs/features/escalation-statuses.md`
- **DONE** verify-roadmap.ts + pre-commit hook — механический страж false positive
  `verify:file scripts/verify-roadmap.ts`
  `verify:file scripts/lib/roadmap-types.ts`
  `verify:file docs/features/verify-system.md`
- **DONE** Single-source-of-truth: roadmap.json → generate .md docs
  `verify:file docs/roadmap.json`
  `verify:file scripts/generate-docs.ts`
  `verify:file docs/features/roadmap-json-system.md`

## v0.9.0 — Ecosystem (2026-07-09)

### Agent Behavior Hardening

- **DONE** Ponytail 7-rung ladder — lazy-senior.md rule file for code agent
  `verify:file .nocowboy/rules/lazy-senior.md`
  `verify:file docs/features/ponytail-ladder.md`
- **DONE** Auto-grill — context check before work (auto-grill.md)
  `verify:file .nocowboy/rules/auto-grill.md`
  `verify:file docs/features/auto-grill.md`
- **DONE** Debug loop — 6-step disciplined diagnosis (debug-loop.md)
  `verify:file .nocowboy/rules/debug-loop.md`
  `verify:file docs/features/debug-loop.md`

### Quality

- **DONE** Spec-compliance verify axis — spec-compliance.md + score-engine dimension
  `verify:file .nocowboy/rules/spec-compliance.md`
  `verify:file docs/features/spec-compliance-verify-axis.md`

### Commands

- **DONE** /to-spec command — conversation to structured NUTAUSIK task
  `verify:file .nocowboy/command/to-spec.md`
  `verify:file docs/features/to-spec-command.md`
- **DONE** /wayfinder command — investigation tickets for multi-session work
  `verify:file .nocowboy/command/wayfinder.md`
  `verify:file docs/features/wayfinder-command.md`

## v0.10.0 — Russian Language & Localization

- **DONE** Russian system prompts для ВСЕХ агентов (сейчас только code.ru + debug.ru)
  `verify:file packages/opencode/src/agent/prompt/worker.ru.txt`
  `verify:file packages/opencode/src/agent/prompt/nocowboy.ru.txt`
  `verify:file packages/opencode/src/agent/prompt/reviewer.ru.txt`
  `verify:file packages/opencode/src/agent/prompt/compaction.ru.txt`
  `verify:file docs/features/russian-system-prompts-all.md`
- **DONE** Russian instruction files — instructions/ru/
  `verify:file packaging/config/instructions/ru/auto-memory.md`
  `verify:file packaging/config/instructions/ru/aider-features.md`
  `verify:file packaging/config/instructions/ru/sandbox.md`
  `verify:file docs/features/russian-instructions.md`
- **DONE** YandexGPT / GigaChat провайдеры
  `verify:file packages/llm/src/providers/gigachat.ts`
  `verify:file packages/llm/src/providers/gigachat.ts`
  `verify:grep packages/llm/test/provider/openai-compatible-chat.test.ts yandexgpt`
  `verify:grep packages/llm/test/provider/gigachat.test.ts GigaChat`
  
  `verify:file docs/features/yandex-gigachat.md`
- **DONE** UI Локализация (русские метки + переключатель языка)
  `verify:file packages/opencode/src/nocowboy/ui/i18n.ts`
  `verify:file packages/opencode/src/cli/cmd/tui/context/i18n.tsx`
  
  `verify:file docs/features/ui-localization.md`
- **DONE** Diff Sandbox — изоляция AI-изменений до принятия (Plandex-style)
  `verify:file packages/opencode/src/nocowboy/sandbox-diff.ts`
  `verify:file .nocowboy/command/sandbox-start.md`
  
  `verify:file docs/features/diff-sandbox.md`
- **DONE** Переключатель языка в настройках TUI (Settings → Language)
  `verify:file packages/opencode/src/nocowboy/ui/i18n.ts`
  
  `verify:file docs/features/lang-switcher-settings.md`

## v0.11.0 — Quality & Infrastructure — verification loop как DEFAULT behavior

- **DONE** Publish: npm org @nocowboy + npm run publish-all
  `verify:file scripts/publish-all.sh`
  `verify:file docs/features/publish-npm.md`
- **DONE** Permission timeout — доработка (из P2-A4)
  `verify:file docs/features/permission-timeout-feature.md`
- **DONE** Agent Audit (P2-C1): inventory 21 агентов, name collisions
  `verify:file docs/features/agent-audit.md`
- **DONE** Command deduplication (P2-C3)
  `verify:file docs/features/command-dedup.md`
- **DONE** Goal judge — интегрировать в agent stop loop (Effect-native)
  `verify:file docs/features/goal-judge-native.md`
- **DONE** Test harness — исправить 39 flaky тестов под параллельной нагрузкой
  `verify:file docs/features/test-harness.md`
- **DONE** Distill command — сканировать сессии → генерировать skills/commands
  `verify:file docs/features/distill-command.md`
- **DONE** Self-Being Meta-Cognitive Architecture (P3-SELF)
- **DONE** Instruction Files Analysis (P2-C2): починить пути, смержить no-shortcuts
  `verify:file docs/features/instructions-analysis.md`
- **DONE** Per-task cost tracking с леджером
  `verify:file docs/features/per-task-cost.md`
- **DONE** DeepSeek prefix-cache optimization
  `verify:file docs/features/deepseek-prefix-cache.md`
- **DONE** Lazy-load tree-sitter WASMs (40MB savings)
  `verify:file docs/features/lazy-treesitter.md`
- **DONE** FTS5 query builder (fts-query.ts)
  `verify:file docs/features/fts5-query-builder.md`
- **DONE** FTS5 schema + migration
  `verify:file docs/features/fts5-schema-migration.md`
- **DONE** Memory reconcile — index MEMORY.md, prune dead
  `verify:file docs/features/memory-reconcile.md`
- **DONE** Channels (webhooks MCP)
  `verify:file docs/features/channels-webhooks.md`
- **DONE** Bash firewall hook — блокировать опасные команды
  `verify:file docs/features/bash-firewall-hook.md`
- **DONE** Task-gate hook — блокировать code tool calls без активного task
  `verify:file docs/features/task-gate-hook.md`
- **DONE** Secret-scan hook — сканировать на секреты перед записью
  `verify:file docs/features/secret-scan-hook.md`
- **DONE** Activity logging hook — PostToolUse для Write/Edit/Bash
  `verify:file docs/features/activity-log-hook.md`
- **DONE** Memory-audit hook — проверка дубликатов
  `verify:file docs/features/memory-audit-hook.md`
- **DONE** Session-metrics hook — сбор метрик сессии
  `verify:file docs/features/session-metrics-hook.md`
- **DONE** Auto-dream programmatic — программаторное сканирование сессий
  `verify:file docs/features/auto-dream-prog.md`
- **DONE** UI для выбора модели каждого агента в Settings TUI
  `verify:file docs/features/agent-model-settings-ui.md`

### Quality — Verification Loop (check tool + auto-verify + prompt enforcement done)

- **DONE** Verification Loop — LSP diagnostics check DEFAULT (✅ check tool + auto-verify + prompt enforcement)
  `verify:file docs/features/quality-enforcement.md`

### Quality — Verification Loop (complete_task tool + LSP gate + Constitution)

- **DONE** Programmatic gate в task done — complete_task отклоняет если check не прошёл (✅ done)
  `verify:file docs/features/task-verify-hook.md`

### Quality — Verification Loop

- **DONE** Tool `check` для агента — явный вызов LSP diagnostics (language-agnostic)
  `verify:file docs/features/check-tool.md`
- **DONE** Auto-verify после edit/write/apply_patch — если ошибки, блокировать продолжение
  `verify:file docs/features/auto-verify-after-edit.md`
- **DONE** Prompt enforcement — агент ОБЯЗАН вызвать check перед task_done (записано в code.ru.txt)
  `verify:file docs/features/verify-prompt-enforcement.md`

### Quality — Integrity

- **DONE** todowrite: блокировать status=completed — удалять пункты вместо completed
  `verify:file docs/features/todowrite-completed-block.md`

## v0.12.0 — Autonomous Agent Loop + Subagent Reliability — Goal Agent, Agent Teams, subagent watchdog, TUI polish (2026-09-14)

### UI/UX — TUI Improvements

- **DONE** Inline diff в permission dialog — показывать diff прямо в диалоге подтверждения
  `verify:file docs/features/tui-inline-diff-permission.md`
- **DONE** Smart cost display — цветной индикатор остатка запросов до лимита (🟢🟡🔴)
  `verify:file docs/features/tui-smart-cost.md`
- **DONE** Context mention (@file, @folder) в prompt — автодополнение из repomap
  `verify:file docs/features/tui-context-mention.md`
- **DONE** Timeline view — /timeline — хронология изменений с diff по точкам
  `verify:file docs/features/tui-timeline-view.md`
- **DONE** Markdown превью — таблицы, ссылки, подсветка кода в TUI
  `verify:file docs/features/tui-markdown-preview.md`
- **DONE** Collapse tool output по умолчанию — сворачивать bash/edit результаты
  `verify:file docs/features/tui-collapse-tool-default.md`

- **DONE** Goal Evaluator — быстрая модель для проверки условия после каждого turn
  `verify:file docs/features/goal-evaluator.md`
- **DONE** Goal Loop Controller — автономный цикл agent turn → evaluate → repeat
  `verify:file docs/features/goal-loop-controller.md`
- **DONE** Auto-Permission Classifier — трёхуровневая система авто-одобрения tool calls
  `verify:file docs/features/auto-permission-classifier.md`
- **DONE** Turn-level Stop Hooks — блокировка завершения turn до проверки
  `verify:file docs/features/stop-hooks-turn-level.md`
- **DONE** Built-in AC Verification Stop Hook
  `verify:file docs/features/ac-verification-hook.md`
- **DONE** Async Task Spawning — асинхронные под-агенты
  `verify:file docs/features/async-task-spawn.md`
- **DONE** Task Dependency Chain — авто-запуск задач по зависимостям
  `verify:file docs/features/task-dependency-chain.md`
- **DONE** Shared Task List для Agent Teams
  `verify:file docs/features/shared-task-list.md`
- **DONE** Inter-Agent Mailbox — сообщения между агентами
  `verify:file docs/features/agent-mailbox.md`
- **DONE** Team Lead — мульти-агентный оркестратор
  `verify:file docs/features/team-lead.md`
- **DONE** Goal Agent — автономный режим в TUI (/autopilot, agent auto)
  `verify:file src/nocowboy/autopilot/command.ts`
  `verify:grep src/command/index.ts autopilotCommand`
- **DONE** TUI Goal UX — индикатор, /goal команды, визуализация прогресса
  `verify:file docs/features/tui-goal-ux.md`
- **DONE** Goal Headless — CLI режим для CI/CD: nocowboy run --autopilot '...'
  `verify:file src/nocowboy/cli/cmd/run-autopilot.ts`
  `verify:grep src/cli/cmd/run.ts resolveRunCommand`
- **DONE** Tree-sitter Integration — детерминированный парсинг AST (функции, классы, импорты)
  `verify:file docs/features/tree-sitter-parsing.md`
- **DONE** Cost-Routing Doctrine — формализованный роутинг по стоимости модели
  `verify:file docs/features/cost-routing-doctrine.md`

### Agent Behavior Hardening

- **DONE** Subagent Hang Watchdog — детект зависших субагентов, idle-таймаут стрима, уведомление родителя
  `verify:file packages/opencode/test/tool/task-watchdog.test.ts`
  `verify:file docs/features/subagent-hang-watchdog.md`
- **DONE** Model Fallback — резервная модель агента при сбое провайдера
  `verify:file packages/opencode/test/nocowboy/tool-task-model.test.ts`
  `verify:file docs/features/agent-model-fallback.md`

### Core Infrastructure

- **DONE** Indexing — автоматический failover voyage → ollama для эмбеддера
  `verify:file packages/opencode/src/nocowboy/indexing.ts`
  `verify:file docs/features/embedder-autofailover.md`

## v0.12.1 — Stream-stall hotfix — раздельные бюджеты TTFT/межсобытиечного idle + авто-ретрай сталла провайдера (2026-09-15)

### Core Infrastructure

- **DONE** Stream-stall watchdog fix — TTFT не убивает здоровые запросы, stall ретраится
  `verify:file docs/features/stream-stall-idle-timeout-fix.md`

## v0.12.2 — Stream-stall UX — индикатор тишины провайдера с обратным отсчётом до аборта (2026-09-15)

### UI/UX — TUI Improvements

- **DONE** Индикатор provider stall в TUI — «Provider stalled… aborting in Ns» вместо замороженного спиннера
  `verify:file docs/features/stream-stall-ui-indicator.md`

## v0.13.0 — Alpha hardening — stream-stall watchdog (0.12.1/0.12.2) + API-эмбеддер OpenRouter для индексации (2026-09-15)

### Core Infrastructure

- **DONE** Индексация через API-эмбеддер OpenRouter вместо заблокированного Voyage и CPU-Ollama
  `verify:file docs/features/embedder-openrouter-api.md`

## v0.13.1 — Indexing hardening — provider-aware batch + shrink-on-timeout для медленных локальных эмбеддеров, реестр эмбеддингов расширен (gemini-embedding-001/qwen3-embedding-8b), легаси-идентификаторы kilo-indexing снова распознаются (2026-09-15)

### Core Infrastructure

- **DONE** Индексация — provider-aware batch и shrink-on-timeout для медленных локальных эмбеддеров
  `verify:file docs/features/indexing-slow-embedder-hardening.md`
- **DONE** Реестр эмбеддингов — google/gemini-embedding-001 и qwen/qwen3-embedding-8b в профиле openrouter
  `verify:file docs/features/embedding-registry-upgrade.md`
- **DONE** Индексация — легаси-идентификаторы kilo-indexing канонизируются, KiloEmbedder уважает explicit baseUrl
  `verify:file docs/features/indexing-legacy-plugin-compat.md`

## v0.14.0 — Security Hardening & Upstream Harvest (2026-09-15)

### Security

- **DONE** Безопасность — доверительная граница конфигов: untrusted project config не резолвит {env:}/{file:}
  `verify:file packages/opencode/src/nocowboy/config/variable.ts`
  `verify:grep packages/opencode/src/config/variable.ts trusted`
  `verify:test packages/opencode/test/nocowboy/config/config.test.ts`
  `verify:file docs/features/config-trust-boundary.md`
- **DONE** Надёжность — финальные сообщения сессии не теряются при выходе (flush ingest на shutdown)
  `verify:grep packages/opencode/src/nocowboy-sessions/ingest-queue.ts drain`
  `verify:test packages/opencode/test/nocowboy/sessions/ingest-queue.test.ts`
  `verify:file docs/features/session-ingest-shutdown-flush.md`
- **DONE** Безопасность — read-only bash-запреты родителя не блокируют делегированных субагентов
  `verify:file packages/opencode/src/nocowboy/tool/task.ts`
  `verify:test packages/opencode/test/nocowboy/tool/task-inherited.test.ts`
  `verify:file docs/features/subagent-bash-permission-inheritance.md`
- **DONE** Процесс — hard fork Kilo Code: аудит релизов v7.4–v7.7 и дисциплина точечного порта
  `verify:file docs/adr/002-upstream-sync-strategy.md`
  `verify:file docs/reference/upstream-port-list.md`
  `verify:file docs/features/upstream-hard-fork-harvest.md`
- **DONE** Безопасность — ресинк зависимостей: 29 уязвимостей → 1 low
  `verify:grep package.json brace-expansion`
  `verify:file bun.lock`
  `verify:file docs/features/dependency-security-resync.md`
- **DONE** Надёжность — task-инструмент возвращает реальный ответ субагента вместо пустого результата
  `verify:grep packages/opencode/src/tool/task.ts synthetic`
  `verify:file docs/features/empty-task-result-return.md`
- **DONE** Надёжность — откат сессии атомарен: нет половинчатого состояния при неудачном checkpoint
  `verify:file packages/opencode/src/nocowboy/session/revert.ts`
  `verify:grep packages/opencode/src/snapshot/index.ts is unavailable`
  `verify:file docs/features/atomic-session-revert.md`
- **DONE** Надёжность — восстановление после read-only файлов БД на старте
  `verify:file packages/core/src/nocowboy/db-preflight.ts`
  `verify:test packages/core/test/nocowboy/db-preflight.test.ts`
  `verify:file docs/features/db-readonly-recovery.md`
- **DONE** Надёжность — инъекция $schema через jsonc-parser: без перезаписи файла на каждом чтении
  `verify:grep packages/opencode/src/config/config.ts getInsertionIndex`
  `verify:file docs/features/config-schema-injection-jsonc.md`
- **DONE** Производительность — компактификация контекста на 80% окна по умолчанию (снижение token burn)
  `verify:grep packages/opencode/src/nocowboy/session/overflow.ts DEFAULT_THRESHOLD_PERCENT`
  `verify:test packages/opencode/test/nocowboy/session/overflow.test.ts`
  `verify:file docs/features/context-compaction-default-threshold.md`

## v1.0.0-alpha — Alpha Release — internal testing, all features done, no critical bugs (2026-09)

- **DONE** v0.10.0 + v0.11.0 — все фичи реализованы
  `verify:typecheck`
  `verify:file docs/features/alpha-all-features-done.md`
- **DONE** Все тесты проходят — bun test
  `verify:cmd bun run test 2>&1 | tail -5`
  `verify:file docs/features/alpha-tests-pass.md`
- **DONE** Нет критических багов — known issues документированы
  `verify:file docs/features/alpha-no-critical-bugs.md`

## v1.0.0 — Production Release — all tests green, npm published, roadmap verified (2026-11)

- **DONE** Typecheck clean — 0 errors
  `verify:typecheck`
  `verify:file docs/features/release-typecheck-clean.md`

## v1.0.6-alpha — Autopilot is a mode, the roadmap is a target — /roadmap owns the finish-the-roadmap goal and is idempotent (an active run is never reset), /autopilot is a non-destructive mode toggle (no-arg arms the active goal, off/pause keeps it), one visible roadmap launcher ([FINISH ROADMAP ▶] on home + palette; the sidebar duplicate that overlapped the session title was removed), restored the run --interactive guard, and user/DX docs (2026-09-25)

- **DONE** Autopilot — режим, roadmap — цель: разведение кнопки и безопасный ре-арм
  `verify:grep packages/opencode/src/nocowboy/session/prompt.ts handleRoadmapCommand`
  `verify:grep packages/opencode/src/nocowboy/session/goal.ts setAuto`
  `verify:test packages/opencode/test/nocowboy/goal-command.test.ts`
  `verify:test packages/opencode/test/nocowboy/run-autopilot.test.ts`
  `verify:file docs/features/autopilot-mode-vs-roadmap-target.md`
  `verify:file docs/guides/autopilot.md`

## v1.0.7-alpha — Live run indicator — the prompt-bar badge is a short mode toggle ([AUTOPILOT ▶/⏸] / [ROADMAP ▶/⏸]) and a new sidebar Roadmap section shows done/total, the current step and the remaining actionable checklist, fed from the session.goal event (stage/done/total/items) rather than the agent's todo table; a bump no longer resurrects a concurrently cleared goal (2026-09-25)

- **DONE** Live run indicator — режим в бейдже, шаги прогона в сайдбаре
  `verify:grep packages/opencode/src/nocowboy/components/run-label.ts export function runLabel`
  `verify:grep packages/opencode/src/nocowboy/session/autopilot.ts export function actionItems`
  `verify:grep packages/opencode/src/nocowboy/session/index.ts stage: Schema.optional`
  `verify:test packages/opencode/test/nocowboy/run-label.test.ts`
  `verify:test packages/opencode/test/nocowboy/autopilot.test.ts`
  `verify:file packages/opencode/src/nocowboy/plugins/sidebar-roadmap.tsx`
  `verify:file docs/features/roadmap-run-indicator.md`
- **DONE** Сгенерированные доки не рассинхронизируются: --check + git add в pre-commit
  `verify:grep scripts/generate-docs.ts includes("--check")`
  `verify:cmd bun run scripts/generate-docs.ts --check`
  `verify:grep .husky/pre-commit git add -- docs/ROADMAP.md`
  `verify:file docs/features/docs-sync-guard.md`

## v1.0.8-alpha — Reviewer no longer receives planner boilerplate — the reviewer agent was misclassified as a plan-like agent, so its prompt got the plan-file / plan_exit system-reminder meant for the planning stage; planning() now matches only architect/planner, and reviewer lost its plan_enter/plan_exit permissions (2026-10-01)

- **DONE** Reviewer больше не получает boilerplate планировщика
  `verify:grep packages/opencode/src/nocowboy/session/prompt.ts return name === "architect" || name === "planner"`
  `verify:grep packages/opencode/src/nocowboy/session/prompt.ts Only architect and planner are plan-like`
  `verify:file packages/opencode/test/nocowboy/plan-exit-detection.test.ts`
  `verify:test packages/opencode/test/nocowboy/plan-exit-detection.test.ts`
  `verify:file docs/features/reviewer-planning-boilerplate.md`

## v1.0.9-alpha — Autonomous work no longer dead-ends — suggest/question never block in a subagent or an autopilot/roadmap session (no human at the other end), YOLO now lifts the built-in read-only agent ceilings (architect/planner/reviewer) while external-directory safety, config protection and explicit top-level config denies stay absolute, and the built-in auto prompt tells Auto to work itself and delegate only for real parallelism (2026-10-02)

- **DONE** Автономная работа больше не упирается в человека: suggest/question, YOLO и Auto
  `verify:grep packages/opencode/src/nocowboy/session/index.ts export function noHumanReason`
  `verify:grep packages/opencode/src/nocowboy/suggestion/tool.ts noHumanReason`
  `verify:grep packages/opencode/src/tool/question.ts noHumanReason`
  `verify:grep packages/opencode/src/permission/index.ts YOLO is consulted BEFORE`
  `verify:grep packages/opencode/src/agent/prompt/auto.ru.txt работай сам`
  `verify:file packages/opencode/test/nocowboy/suggestion/tool.test.ts`
  `verify:test packages/opencode/test/nocowboy/suggestion/tool.test.ts`
  `verify:test packages/opencode/test/nocowboy/server/permission-allow-everything.test.ts`
  `verify:test packages/opencode/test/tool/question.test.ts`
  `verify:file docs/features/autonomous-harness-hardening.md`

## v1.1.0 — Engine Isolation & Fork Management — pinned core + selective backport, runtime/port isolation so the engine can be swapped while preserving measurable rights, lifecycle, edit methods and user scenarios (audit: docs/analysis/fork-management-audit-2026-10-05.md) (2026-10)

- **DONE** Knowledge Graph — стаб-контракт GraphProvider (in-memory fallback)
  `verify:file packages/opencode/src/nocowboy/knowledge-graph/provider.ts`
  `verify:file packages/opencode/src/nocowboy/knowledge-graph/memory.ts`
  `verify:test packages/opencode/test/nocowboy/knowledge-graph-stub.test.ts`
  `verify:file docs/features/knowledge-graph-stub.md`
- **DONE** Манифест движка — SHA, provenance, версии зависимостей, ledger портов
  `verify:cmd bun run scripts/engine-manifest.ts --check`
  `verify:test packages/opencode/test/nocowboy/engine-manifest.test.ts`
  `verify:file docs/reference/engine-manifest.md`
- **DONE** Профиль merge/backport — upstream read-only reference, без legacy OpenCode→Kilo transforms
  `verify:test script/upstream/utils/config.test.ts`
  `verify:test script/upstream/utils/normalize.test.ts`
  `verify:cmd bun run script/upstream/compare.ts --profile nocowboy --report`
  `verify:file docs/features/fork-merge-profile.md`
- **DONE** Контракт read-only planner/reviewer — реальное ограничение, а не декларация
  `verify:test packages/opencode/test/nocowboy/agent-readonly.test.ts`
  `verify:test packages/opencode/test/nocowboy/server/permission-allow-everything.test.ts`
  `verify:file docs/features/planner-reviewer-readonly-contract.md`
- **DONE** AgentCatalog и единая политика spawnable agents
  `verify:test packages/opencode/test/nocowboy/agent-catalog.test.ts`
  `verify:test packages/opencode/test/tool/task.test.ts`
  `verify:file docs/features/agent-catalog-spawn-policy.md`
- **DONE** @nocowboy/runtime — портовое ядро (AgentCatalog/PolicyPort/SessionPort/EditPort/ModelPort/MemoryPort/TelemetryPort)
  `verify:test packages/opencode/test/nocowboy/runtime/ports.test.ts`
  `verify:test packages/opencode/test/nocowboy/runtime/agent-catalog.test.ts`
  `verify:test packages/opencode/test/nocowboy/runtime/no-forbidden-imports.test.ts`
  `verify:file docs/features/nocowboy-runtime-ports.md`
- **DONE** EditPort — семантика match/batch/stale-read/partial-failure
  `verify:test packages/opencode/test/tool/search_replace.test.ts`
  `verify:test packages/opencode/test/nocowboy/edit-port.test.ts`
  `verify:file docs/features/edit-port-batch-safety.md`
- **DONE** Единый MemoryAdapter — статусы, explicit namespace, shutdown flush
  `verify:test packages/opencode/test/nocowboy/memory-adapter.test.ts`
  `verify:test packages/opencode/test/nocowboy/nutausik-client.test.ts`
  `verify:file docs/features/memory-adapter-unified.md`
- **DONE** Ledger upstream-backport: SHA → потребность → контракт → adaptation diff → verify
  `verify:file packages/opencode/src/nocowboy/backport/ledger.ts`
  `verify:file backport-ledger.json`
  `verify:cmd bun run scripts/backport-ledger.ts --check`
  `verify:file docs/features/upstream-backport-ledger.md`
