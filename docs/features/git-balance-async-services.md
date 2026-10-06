# Git/Balance — асинхронные сервисы, unknown ≠ 0

Git-состояние в верхнем баре читалось синхронно (`execSync` в `createMemo`) — блокировка
рендера каждые 10 секунд — и на «не репозиторий» возвращало поддельное чистое дерево
(ветка `""`, все счётчики 0). Баланс теперь тоже не фабрикует 0.

## Что сделано

### GitPort (чистое ядро) — `packages/opencode/src/nocowboy/git/git-port.ts`

- `GitState = { status: "ok"; dir; branch; detached; ahead; behind; dirty; untracked }
  | { status: "unknown"; dir?; reason } | { status: "error"; dir?; reason }`.
- `parseGitHead(text)` / `parseGitStatus(porcelain)` / `findRepoRoot(cwd, exists)` —
  чистые, юнит-тестируемые.
- `GitPort` интерфейс + `createGitPort({ run, exists, readFile })` — асинхронный,
  инъектируемый; `read()` никогда не бросает.
  - нет репозитория → `unknown` (не поддельное чистое дерево);
  - сбой `git status` / нечитаемый HEAD → `error` с причиной;
  - отсутствие upstream → `ahead/behind = 0`, но `status: "ok"` (это «нет данных о
    ahead», не ошибка).
- `defaultGitPort` — из fs + асинхронного `execFile("git", …, { windowsHide: true })`.

### Топ-бар — `packages/opencode/src/nocowboy/components/nocowboy-bars.tsx`

`gitInfo()` (sync `execSync`) удалён. `TopBar` обновляет `defaultGitPort.read(process.cwd())`
асинхронно (сигнал + интервал 10с, вне рендера). Ветка/счётчики показываются только
при `status: "ok"`; при `unknown`/`error` — иконка ветки приглушённым цветом без
факельных нулей.

### Баланс

См. `cost-balance-semantics`: `Balance` со `status: ok|unknown`, сбой не возвращает 0
(эта AC закрыта там; здесь подтверждается тестом баланса).

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/git-port.test.ts
bun test test/nocowboy/provider-balance.test.ts
bun run typecheck
```

Покрыто: парсинг HEAD (ветка/деточ) и `status --porcelain` (dirty/untracked);
`findRepoRoot`; `createGitPort` — не-репозиторий → unknown, ok-репозиторий с
counts, отсутствие upstream → 0/0 ok, сбой status → error, нечитаемый HEAD → error.
