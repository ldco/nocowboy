# Backport: subagent depth limit + resume diagnostics

Согласование ограничения глубины субагентов с нашей политикой и понятная
диагностика при неверном/просроченном resume.

## Глубина (depth limit)

Делегация остаётся **одним уровнем**: `KiloTask.nestedTask()` возвращает `false`
(executor выключает инструмент `task` у порождённого субагента), и каждая
subagent-сессия создаётся с `KiloTask.permissions(...)`, который **явно запрещает**
`task` и `question`. Два независимых предохранителя от рекурсивных цепочек.
Покрыто `test/nocowboy/subagent-depth.test.ts`.

## Resume diagnostics

`task(..., task_id: <id>)` — resume-or-create. Просроченный/неверный id
по-прежнему стартует свежего субагента (**намеренный контракт**, не ломаем), но
теперь это **не молча**: `resumeDiagnostic` (`src/nocowboy/tool/resume.ts`) даёт
детерминированный вердикт:

- нет `task_id` → ок (свежий субагент);
- `task_id` не найден → `ok` + **warning** («не найден — истёк или id неверный;
  запущен свежий субагент»), который добавляется в **вывод** инструмента — вызывающий
  видит, что resume не состоялся;
- `task_id` найден, но из **другого** родителя → **hard error** («not a child of the
  current session») — резюмировать через сессии нельзя, это пришило бы чужой разговор.

Провязка: `src/tool/task.ts` вызывает `resumeDiagnostic(...)` и `withResumeNotice(...)`
на обоих путях вывода (foreground и background).

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/resume-diagnostic.test.ts
bun test test/nocowboy/subagent-depth.test.ts
bun test test/tool/task.test.ts
bun run typecheck
```

Покрыто: политика глубины; вердикты resume (нет id / не найден → warning /
чужой родитель → error / совпадает → ок); существующий контракт resume-or-create
сохранён, а тест «creates a child when task_id does not exist» дополнительно
проверяет, что диагностика видна в выводе.
