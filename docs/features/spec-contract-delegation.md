# Spec Contract for Delegation — контекстно-независимая делегация

Когда оркестратор отдаёт работу другому агенту, у получателя **нет** контекста
разговора — промпт и есть спек. Контракт из пяти частей делает делегацию
контекстно-независимой: получателю не нужно доспрашивать контекст.
Вдохновлено Fable Advisor.

## Что сделано

### Ядро (чистое) — `packages/opencode/src/nocowboy/spec/contract.ts`

- `SPEC_CONTRACT_SECTIONS` — пять частей в фиксированном порядке: **Goal**,
  **Constraints**, **Acceptance criteria**, **Files to touch**,
  **Files to NOT touch**.
- `renderSpecContract(contract)` — детерминированный markdown; каждая секция
  всегда присутствует (пустой список → `- (none)`, часть не пропускается).
- `validateSpecContract(contract)` — по одной проблеме на пустую часть
  (пусто = контракт полный). Пустую часть надо указать явным `none`.
- `missingSpecContractSections(text)` / `hasSpecContract(text)` — какие из пяти
  заголовков отсутствуют в промпте делегации.

Функции детерминированы и не зависят от движка — контракт юнит-тестируется.

### Команда — `.nocowboy/command/spec-contract.md`

`/spec-contract <task>` собирает пять частей, проверяет `validateSpecContract`
(нет пустых частей) и делегирует через `task(...)`, вставляя контракт в промпт
дословно. Файл force-added (`.nocowboy/` в `.gitignore`).

### Дисциплина делегации — `.nocowboy/rules/subagent-discipline.md`

Добавлена секция «5. Спец-контракт для делегации»: каждая делегация несёт пять
частей; пустая часть — явный `none`.

### Провязка — `packages/opencode/src/tool/task.ts`

Инструмент `task` перед делегированием вызывает `missingSpecContractSections`
и пишет в лог предупреждение, если контракта нет (**advisory, не блокирует** —
это дисциплина, а не барьер). Это реальный call-site, а не мёртвый модуль.

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/spec-contract.test.ts
bun run typecheck
```

Покрыто: рендер всех пяти секций в фиксированном порядке; `(none)` вместо
пропуска секции; валидация каждой пустой части; раунд-трип
`hasSpecContract(renderSpecContract(x))`; точечное определение отсутствующих
секций в частичном промпте.
