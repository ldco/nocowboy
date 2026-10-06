# Контракт read-only planner/reviewer — реальное ограничение, а не декларация

До фикса planner и reviewer были «read-only» только на словах: `agent.ts`
начинает defaults с `*: allow`, а planner/reviewer добавляли разрешения без
deny. Ограничение было декларацией в промпте, не инвариантом движка.

## Что сделано

`packages/opencode/src/nocowboy/agent/index.ts` — `patchAgents()`:

- **planner** и **reviewer** получают read-only ceiling **последним** правилом:

  ```ts
  Permission.fromConfig({ bash: readOnlyBash, edit: { "*": "deny" } })
  ```

  `Permission.evaluate` возвращает **последнее** совпадение, поэтому глобальный
  `permission.bash`/`permission.edit`-allow не может втихую вернуть мутацию.
- `edit: {"*": "deny"}` закрывает `edit`/`write`/`apply_patch`/`search_replace`
  (все четыре просят `permission: "edit"`).
- `readOnlyBash` расширен не-мутирующими verify-командами (`bun test`,
  `bun run typecheck`, read-only `--check`-скрипты), чтобы reviewer мог
  запускать тесты, оставаясь read-only. Поверх allow-правил добавлены deny
  для write/exec-обходов внутри «безобидных» команд: `*--out*`
  (`git log/diff/show --output=<file>` пишет файл), `bun test *outfile*`
  (`--reporter-outfile`), `rg --pre`, `bun test -u`/`--update-snapshots`/`--coverage`,
  `quality-ratchet --update`. Команды с опцией-префиксом (`git remote -v`) дают
  **точный** allow без wildcard — deny-список обходится формой аргументов.
- `packages/opencode/src/permission/index.ts`: `EDIT_TOOLS` дополнен
  `search_replace` — раньше он не скрывался у read-only агентов.

`hardPermissions()` + `modes = ["architect","planner","reviewer"]` превращают
это в **hardRuleset**: saved «always allow» и глобальный `permission.edit/bash`
allow не перебивают read-only deny. Снять ограничение можно только **YOLO** или
**явным agent-level config** (он мержится последним в `agent.ts`), что и
требует AC3.

### Граница инварианта

Потолок обязывает **собственные инструменты** planner/reviewer. Делегирование
через `task` spawn'ит дочерний агент (subagent_type), и `KiloTask.inherited()`
намеренно ограничивает наследование: edit-deny наследуется, bash-денойсы — нет
(worker по дизайну исполняет verify/сборочные команды). То есть read-only — это
политика для самого planner/reviewer, а не запрет использовать подагентов;
делегирование исполнительных шагов worker'у остаётся штатным путём.

Отдельная граница — команды, исполняющие **код репозитория**: `bun test`
(тестовый код), `git --ext-diff`/`--filters` (repo-defined textconv-драйверы из
`.gitattributes`). Deny-набор закрывает флаги, которые пишут файл напрямую
(`--out*`, `--coverage*`, `-u`, `--pre`), но исполнение доверенного кода самого
репозитория — это граница доверия репозитория, а не то, что read-only ceiling
пытается отменить.

## Проверка

- `packages/opencode/test/nocowboy/agent/read-only-agents.test.ts` — собирает
  реальные правила через `patchAgents()` и проверяет: edit-инструменты запрещены,
  мутирующий bash запрещён, read/verify bash разрешён, явный agent-config
  поднимает ограничение.
- `packages/opencode/test/nocowboy/server/permission-allow-everything.test.ts` —
  YOLO снимает read-only deny; внешняя директория и защита конфигов абсолютны.

```bash
cd packages/opencode && bun test test/nocowboy/agent/read-only-agents.test.ts
cd packages/opencode && bun test test/nocowboy/server/permission-allow-everything.test.ts
```
