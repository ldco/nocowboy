# Roadmap Verification System

## Быстрый старт

```bash
# В любом проекте — одна команда:
bash scripts/init-roadmap.sh
```

Или скачать и запустить:
```bash
curl -fsSL https://nocowboy.dev/init-roadmap | bash
```

Скрипт:
1. Создаёт `docs/roadmap.json` с шаблоном
2. Копирует `scripts/generate-docs.ts` и `scripts/verify-roadmap.ts`
3. Настраивает `.husky/pre-commit`
4. Запускает начальную генерацию

## Что это

Система предотвращения false positive DONE-статусов. Единый источник истины (`docs/roadmap.json`) + два скрипта + pre-commit hook.

Работает в ЛЮБОМ проекте — TypeScript, Python, Go, Rust.

## Как установить в новый проект

### 1. Скопировать скрипты

```bash
cp -r scripts/verify-roadmap.ts scripts/generate-docs.ts <target-project>/scripts/
```

### 2. Создать `docs/roadmap.json`

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
      "verify": [
        { "type": "file", "path": "src/my-feature.ts" }
      ]
    }
  ]
}
```

### 3. Добавить pre-commit hook

```bash
mkdir -p .husky
cat > .husky/pre-commit << 'EOF'
bun run scripts/generate-docs.ts && bun run scripts/verify-roadmap.ts
EOF
```

(Или добавьте в существующий `.husky/pre-commit`)

### 4. Проверить

```bash
bun run scripts/generate-docs.ts    # создаст ROADMAP.md, CHANGELOG.md, BACKLOG.md
bun run scripts/verify-roadmap.ts   # проверит все DONE фичи против кода
```

## Статусы фич

| status | Куда попадает | Описание |
|--------|---------------|----------|
| `backlog` | BACKLOG.md | Идея, не взята в работу |
| `planned` | ROADMAP.md | Запланирована на версию |
| `in_progress` | ROADMAP.md | В разработке |
| `done` | CHANGELOG.md | Готово, verify-директивы проверяются |
| `abandoned` | — | Отменено, не показывается |

## Verify-директивы

| type | Синтаксис | Что проверяет |
|------|-----------|---------------|
| `file` | `{"type": "file", "path": "src/main.ts"}` | Файл существует |
| `grep` | `{"type": "grep", "path": "src/", "pattern": "myFunction"}` | Паттерн найден в файле/директории |
| `test` | `{"type": "test", "path": "test/my.test.ts"}` | Тест проходит |
| `typecheck` | `{"type": "typecheck"}` | `bun run typecheck` |
| `cmd` | `{"type": "cmd", "command": "cargo check"}` | Команда возвращает 0 |
| `agent` | `{"type": "agent"}` | Attestation-файл существует |

## Как это работает

```
roadmap.json (68 фич, 12 версий)
     │
     ├── generate-docs.ts → ROADMAP.md (planned/in_progress)
     ├── generate-docs.ts → CHANGELOG.md (done)
     └── generate-docs.ts → BACKLOG.md (backlog)

     ├── verify-roadmap.ts → 30 done features → 39 verify directives
     │                       → file:exists → grep:found → test:passes
     │                       → FAIL = commit blocked
     └── .husky/pre-commit  → typecheck + generate + verify
```

## Пример roadmap.json

См. `docs/roadmap.json` в этом проекте. Полный пример с 68 фичами, 12 версиями, verify-директивами.

## Для существующего проекта

1. Создать `docs/roadmap.json` — перенести все текущие фичи/планы
2. Запустить `generate-docs.ts` — создаст три .md файла
3. Запустить `verify-roadmap.ts` — покажет какие фичи не проходят проверку
4. Исправить verify-директивы или статусы
5. Поставить pre-commit hook
