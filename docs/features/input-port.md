# InputPort — контракт button propagation + navigation

Кнопки нижнего бара раньше инлайнили навигацию (`setScreen(key)`) и обработку
мыши (`evt.preventDefault?.(); onClick()`) прямо в upstream-компоненте, поэтому
правила propagation/navigation жили в JSX и не тестировались. InputPort выносит
их в чистый, тестируемый контракт; обработчики монтируются через порт.

## Что сделано

### Ядро (чистое) — `packages/opencode/src/nocowboy/ui/input-port.ts`

- `SCREEN_ORDER` (`chat`, `api`, `git`, `db`, `files`, `edit`) + `SCREEN_LABELS`.
- `isClick(button)` — кликом считается только основная кнопка (`0`/`"left"`;
  `undefined` тоже); правая/средняя (`1`/`2`/`"right"`/`"middle"`) пропагируют.
- `nextScreen`/`prevScreen`/`screenIndex` — навигация по кругу, порядок
  переопределяем.
- `ButtonPort` + `createButtonPort({ screen, setScreen, order? })`:
  - `active(key)`, `select(key)` (no-op если уже активна),
  - `move("next"|"prev")`,
  - `click({ button, key })` → `{ handled }` — `preventDefault` вызывается только
    при `handled`, поэтому правая/средняя кнопки пропагируют.

Свой mouse-protocol не пишется — используем JSX-события рендерера.

### Провязка — `packages/opencode/src/nocowboy/components/nocowboy-bars.tsx`

`BottomBar` создаёт `createButtonPort({ screen, setScreen })` и рендерит `port.order`;
`Btn` берёт `active`/`click` из порта — per-button логика навигации больше не
дублируется в компоненте.

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/input-port.test.ts
bun run typecheck
```

Покрыто: порядок экранов; wrap-around вперёд/назад; кастомный порядок;
`screenIndex`; `isClick` (0/left/undefined — клик; 1/2/right/middle — нет);
`createButtonPort.active/select/move/click` (в т.ч. что правая/средняя кнопки не
меняют экран и не потребляют событие).
