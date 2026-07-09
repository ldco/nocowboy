# Roadmap Verification System

## Быстрый старт

В любом проекте с NoCowboy — roadmap.json создаётся автоматически при первом запуске TUI. Ничего копировать не нужно.

Если нужно создать вручную:
```bash
bun run --cwd packages/opencode src/index.ts roadmap init
```

Или если NoCowboy установлен глобально:
```bash
nocowboy roadmap init
```

## Что это

Система предотвращения false positive DONE-статусов. Трёхфазная верификация:

1. **Механическая** (`file`/`grep`/`test`/`typecheck`) — verify-директивы в roadmap.json
2. **Функциональная** (overseer) — другая модель проверяет acceptance criteria, пишет attestation
3. **Аттестационная** — pre-commit проверяет attestation с PASS вердиктом

## CLI команды (встроены в nocowboy)

```bash
nocowboy roadmap init      # создать docs/roadmap.json с шаблоном
nocowboy roadmap generate  # сгенерировать ROADMAP.md, CHANGELOG.md, BACKLOG.md
nocowboy roadmap verify    # проверить все DONE фичи (запускается в pre-commit)
```

## Как это работает

```
                                nocowboy roadmap init
                                        │
                                        ▼
TUI старт ──(нет roadmap.json)──→ docs/roadmap.json создаётся автоматически
                                        │
                          agent ──→ /backlog-promote → Architect пишет acceptance_criteria
                                        │
                          agent ──→ #route overseer: verify feature
                                        │
                                        ▼
                              docs/attestations/<version>/<id>.md
                                        │
                          pre-commit ──→ nocowboy roadmap verify → PASS? → коммит
                                                                  FAIL → блок
```

## Статусы фич

| status | Куда попадает | Описание |
|--------|---------------|----------|
| `backlog` | BACKLOG.md | Идея, не взята в работу |
| `planned` | ROADMAP.md | Запланирована на версию |
| `in_progress` | ROADMAP.md | В разработке |
| `done` | CHANGELOG.md | Готово, overseer attestation PASS |
| `abandoned` | — | Отменено |
| `blocked` | ROADMAP.md | Заблокировано внешней зависимостью |

## Verify-директивы

| type | Синтаксис | Что проверяет |
|------|-----------|---------------|
| `file` | `{"type": "file", "path": "src/main.ts"}` | Файл существует |
| `grep` | `{"type": "grep", "path": "src/", "pattern": "myFunction"}` | Паттерн найден |
| `test` | `{"type": "test", "path": "test/my.test.ts"}` | Тест проходит |
| `typecheck` | `{"type": "typecheck"}` | `bun run typecheck` |
| `cmd` | `{"type": "cmd", "command": "cargo check"}` | Команда возвращает 0 |
| `agent` | `{"type": "agent"}` | Attestation-файл существует (старый формат) |
| `overseer` | `{"type": "overseer"}` | Attestation с PASS от overseer агента |

## Acceptance criteria

Architect генерирует при `/backlog-promote`:

```json
"acceptance_criteria": [
  {
    "check": "Конкретное описание что должно работать",
    "verify": "Как overseer проверит",
    "critical": true
  }
]
```

## Для существующего проекта без NoCowboy

```bash
# Установить NoCowboy
npm i -g nocowboy

# Войти в проект, запустить TUI — roadmap.json создастся автоматически
cd my-project
nocowboy

# Добавить pre-commit hook для верификации
cat >> .husky/pre-commit << 'EOF'
nocowboy roadmap verify
EOF
```

## Пример roadmap.json

```json
{
  "versions": [
    { "tag": "v0.1.0", "description": "Initial release" }
  ],
  "features": [
    {
      "id": "example-feature",
      "title": "My first feature",
      "status": "planned",
      "version": "v0.1.0",
      "acceptance_criteria": [
        {
          "check": "Feature работает",
          "verify": "ручная проверка",
          "critical": true
        }
      ],
      "verify": [
        { "type": "file", "path": "src/my-feature.ts" },
        { "type": "overseer" }
      ]
    }
  ]
}
```
