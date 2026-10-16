# NoCowboy Documentation

## Система

```
BACKLOG  →  ROADMAP  →  CHANGELOG
 идеи        план        свершившееся
```

Единственный источник — `docs/roadmap.json`. Три `.md`-файла ниже генерируются из
него (`bun run docs:gen`); вручную их не редактируют.

| Документ | Что |
|---|---|
| [BACKLOG.md](BACKLOG.md) | Идеи на будущее. |
| [ROADMAP.md](ROADMAP.md) | План (только не-`done`). DONE требует verify-директив. |
| [CHANGELOG.md](CHANGELOG.md) | Релизы. Свершившиеся факты. |
| [features/](features/) | Одна страница на каждую реализованную фичу. |

## Guides

- [autopilot.md](guides/autopilot.md) — автопилот и roadmap-прогон: как пользоваться.
- [publish.md](guides/publish.md) — сборка и npm-публикация.

## Проектирование и решения

- [adr/](adr/) — архитектурные решения (external patterns, upstream sync, release audit, NUTAUSIK, durable workflows, autopilot continuation).
- [plans/](plans/) — планы в работе.
- [analysis/](analysis/) — аудиты и разборы (fork management, token-cost, harness comparison, indexing).

## Reference

- [engine-manifest.md](reference/engine-manifest.md) — provenance движка (fork point, upstream, backports).
- [kilocode-fork-playbook.md](reference/kilocode-fork-playbook.md) — справочник по форку и upstream-sync.
- [competitive-analysis.md](reference/competitive-analysis.md) — сравнение TUI-харнессов.
- [mcp-first-party.md](reference/mcp-first-party.md) — приоритет запуска MCP-серверов.
- [tui-layout-architecture.md](reference/tui-layout-architecture.md) · [design-layout.md](reference/design-layout.md) · [design-session.md](reference/design-session.md) — устройство TUI.
- [ownership-manifest.md](reference/ownership-manifest.md) — классы владения файлами.
- [turso-database-adoption.md](reference/turso-database-adoption.md) — ADR: Turso (Phase 1 blocked).
- [known-test-failures.md](reference/known-test-failures.md) · [glossary.md](reference/glossary.md).
- [upstream-port-list.md](reference/upstream-port-list.md) · [upstream-sync-audit.md](upstream-sync-audit.md).

## Прочее

- [known-issues.md](known-issues.md) — известные проблемы текущего состояния.
- [legal/152FZ-COMPLIANCE.md](legal/152FZ-COMPLIANCE.md) — 152-ФЗ.
- [attestations/](attestations/) — reviewer-аттестации по релизам.
- [archive/](archive/) — устаревшие планы, genesis, marketing, исторический анализ.
