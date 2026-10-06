# All tests green — 0 failures, 0 flaky (BLOCKED — partial fix)

Release-гейт «весь набор зелёный». Проверяется полным прогоном opencode.

```bash
cd packages/opencode && bun run script/test-runner.ts
```

## Состояние

- Полный прогон: **541 files | 541 passed | 0 failed | 1 flaky** (`nocowboy/indexing-startup.test.ts`
  прошёл на ретрае). `httpapi-mdns.test.ts` в отдельном прогоне падал по таймауту остановки листенера.
- Гейт требует **0 flaky** → **не пройден** (BLOCKED).

## Что уже сделано (частичный фикс — корректный, но недостаточный)

В `packages/opencode/test/nocowboy/indexing-startup.test.ts`:

1. **Временной бюджет** вместо фиксированного: `wait()`/`called()` использовали
   100×10ms (~1s) — чувствительно к нагрузке. Заменено на `WAIT_TIMEOUT_MS = 30_000`
   (цикл до дедлайна).
2. **Порядок в `afterEach`**: `disposeAllInstances()` теперь вызывается ДО
   `IndexingWorker.override()`. Раньше override сбрасывался первым, и in-flight
   init подхватывал реальный воркер → настоящий `CodeIndexManager` пытался
   подключиться к `127.0.0.1:1`, вешал disposal (~10s hook timeout) и утекал
   предупреждением в следующий тест.

Эффект: файл стал **6/6** зелёным в прямых прогонах и **4/4** при 4 параллельных
копиях. Но под полной нагрузкой runner'а (concurrency 4 + тяжёлые соседи
`tui-headless`, `diff-full`, `session/prompt`) он **всё ещё изредка флейкает**.

## Оставшиеся корни (для полного де-flake)

1. Дефолтный `beforeEach`-override (`inline`) конструирует **реальный**
   `CodeIndexManager`; под нагрузкой его `dispose()` медленный → hook timeout.
   Надо убрать реальный менеджер из дефолтного override (легковесный stub) и
   оставить его только тестам, которым он нужен.
2. `dispose` вызывается 2× вместо 1 (гонка жизненного цикла / загрязнение spy).
3. Изоляция intra-file: реальное qdrant-предупреждение `version-unavailable`
   утекает в тест `retains and deduplicates`.
4. `server/httpapi-mdns.test.ts`: `withTimeout(listener.stop(true), 10_000)` —
   остановка листенера под нагрузкой изредка превышает 10s.

Рекомендация `packages/opencode/test/AGENTS.md` («предпочитай readiness-сигналы
фиксированному поллингу») применима и здесь.

## Вывод

Гейт `release-all-tests-green` помечен **BLOCKED**: набор фактически зелёный
(0 failed), но флейк `indexing-startup` под нагрузкой runner'а не устранён до
конца, а verify-директива полного набора не влезает в 120s-таймаут verify-roadmap.
