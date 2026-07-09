---
description: "Promote a feature from backlog to roadmap with acceptance criteria"
mode: all
---
Promote a feature from BACKLOG.md or a free-form description into docs/roadmap.json with automatically generated acceptance criteria.

Process:
1. Read the feature description (from BACKLOG.md or conversation context)
2. Architect агент (you) анализирует описание фичи И существующий код
3. Architect генерирует acceptance_criteria (check/verify/critical) на основе:
   - Формального шаблона: check (что работает), verify (как проверить), critical (блокирует ли DONE)
   - Анализа кода: какие модули/файлы нужно создать или изменить
4. Добавляет фичу в roadmap.json со статусом "planned"
5. Добавляет verify-директиву: {"type": "overseer"}

После promote — предложи пользователю создать spec:

> `/backlog-spec <feature-id>` — architect напишет детальный spec
> `/fast` — сделать сразу без spec (только для простых задач)

Шаблон acceptance_criteria:
```json
"acceptance_criteria": [
  {
    "check": "Конкретное описание что должно работать",
    "verify": "Как overseer это проверит (unit-тест, grep, чтение кода)",
    "critical": true
  }
]
```

Универсальные критерии (typecheck, test, file-exists) добавляются автоматически — architect их НЕ пишет.

Usage:
`/backlog-promote <feature-title>`

Пример:
`/backlog-promote "YandexGPT / GigaChat провайдеры"`
→ architect читает описание, смотрит код, генерирует criteria, добавляет в roadmap.json
