# Performance — startup < 500ms, memory < 200MB

Release-гейт по производительности. Измеряется повторяемым бенчмарком
`scripts/perf-check.ts`: холодный старт CLI (загрузка графа модулей через
`--version`) и пиковый RSS процесса.

## Что сделано

- `scripts/perf-check.ts` — измеряет N=5 прогонов `bun run --conditions=browser
  packages/opencode/src/index.ts --version`, берёт min/median/max времени и
  пиковый RSS (VmHWM из `/proc/<pid>/status`). Флаги: `--json`, `--assert`
  (exit 1 при выходе за порог). Порог: cold start < 500ms, RSS < 200MB.
- Провязка: `cmd`-директива verify-roadmap `bun run scripts/perf-check.ts --assert`.

Метод честно ограничен: измеряется **CLI bootstrap** (путь загрузки модулей), а не
интерактивный TUI — headless это не измерить. Это прокси холодного старта.

## Результат (2026-10-06, эта машина)

| Метрика | Значение | Порог |
| --- | --- | --- |
| Cold start (median) | ~120 ms | < 500 ms |
| Cold start (min/max) | ~116 / ~123 ms | — |
| Peak RSS | ~108 MB | < 200 MB |

Итог: **в пределах порогов** (`bun run scripts/perf-check.ts --assert` → exit 0).

## Проверка

```bash
bun run scripts/perf-check.ts
bun run scripts/perf-check.ts --assert
```
