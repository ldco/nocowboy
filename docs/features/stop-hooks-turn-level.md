# Turn-level Stop Hooks — блокировка завершения turn до проверки

Измерение hooks system: плагин может зарегистрировать `session.stop` и вернуть
`{ continue: true }`, чтобы **запретить** завершение turn. События плагина мало —
как только модель перестаёт делать tool-calls, цикл завершился бы; поэтому
harness обязан сам сохранить синтетическое continuation-сообщение и запустить
цикл снова. Именно это и есть блокировка turn.

## Что делает

- `packages/opencode/src/nocowboy/session/stop-hooks.ts`
  - `StopHooks.decide` — чистое решение (без I/O): блокируем только на границе
    turn (модель закончила), если процессор не вернул `stop`/`compact`, нет
    уже поставленного follow-up и не исчерпан лимит.
  - `STOP_HOOK_MAX_BLOCKS = 8` — максимум последовательных блокировок
    (Claude Code Stop-hook parity).
  - `continuationText` / `buildContinuation` — синтетическое user-сообщение
    `<stop-hook-continue>`, копирующее agent/model/tools предыдущего turn.
- `packages/opencode/src/session/prompt.ts`
  - Плагинный `session.stop` вычисляет запрос, а harness применяет его после
    goal-блока: инжектит continuation и продолжает цикл.
  - Один continuation на границу turn — активный autopilot не дублируется.

## Acceptance

- Turn действительно продолжается (не только логируется счётчик).
- Лимит 8 блокировок; `stop`/`compact`/follow-up не переопределяются.
- `stop-hooks.test.ts` — решение (requested/finished/blocked/followup/cap).
- `prompt.test.ts` — «stop hook blocks the turn end and the harness continues
  the loop»: плагин возвращает `continue: true`, harness сохраняет
  `<stop-hook-continue>` и выполняет второй turn без участия человека.
