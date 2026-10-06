# NoCowboy Documentation

## System

```
BACKLOG  →  ROADMAP  →  CHANGELOG
 идеи        план        свершившееся
```

| Документ | Что |
|----------|-----|
| [BACKLOG.md](BACKLOG.md) | Идеи на будущее. Свободный формат. |
| [ROADMAP.md](ROADMAP.md) | План. DONE требует verify-директив. |
| [CHANGELOG.md](CHANGELOG.md) | Релизы. Свершившиеся факты. |
| [known-issues.md](known-issues.md) | Известные проблемы и текущие ограничения. |

## Features

[features/](features/) — по одному документу на реализованную фичу. DONE в
`roadmap.json` требует либо verify-директивы, либо документ здесь.

## Reference

[reference/](reference/) — справка и ADR-контекст:

- [engine-manifest.md](reference/engine-manifest.md) — карта движка и provenance
- [upstream-backport-ledger.md](reference/upstream-backport-ledger.md) — ledger upstream-переносов (SHA → потребность → verify)
- [mcp-first-party.md](reference/mcp-first-party.md) — судьба first-party MCP серверов
- [upstream-port-list.md](reference/upstream-port-list.md) — порты Tier-0
- [kilocode-fork-playbook.md](reference/kilocode-fork-playbook.md) — fork reference manual
- [competitive-analysis.md](reference/competitive-analysis.md) — 30+ TUIs compared
- [turso-database-adoption.md](reference/turso-database-adoption.md) — ADR: Turso plan
- [tui-layout-architecture.md](reference/tui-layout-architecture.md) — архитектура TUI-layout
- [glossary.md](reference/glossary.md) — глоссарий
- [known-test-failures.md](reference/known-test-failures.md) — известные падения тестов

## Guides

- [autopilot.md](guides/autopilot.md) — автопилот и roadmap: как пользоваться
- [publish.md](guides/publish.md) — npm publishing

## Decisions & Records

- [adr/](adr/) — architecture decision records (001 external patterns … 006 autopilot continuation)
- [attestations/](attestations/) — reviewer attestations по версиям
- [releases/](releases/) — release notes (1.0.x-alpha)

## Plans

[plans/](plans/) — текущие планы разработки.

## Archive

[archive/](archive/) — старые планы, genesis, marketing, исторический анализ.
