# EditPort — семантика match/batch/stale-read/partial-failure

Контракт редактирования был неявным: `search_replace` искал **первое**
совпадение через `indexOf`, а несколько блоков одного файла читали файл **до**
фазы записи — то есть каждый блок применялся к исходному содержимому, и поздний
блок затирал ранний.

## Контракт

1. **Match — уникальное точное совпадение.** 0 совпадений → ошибка «not
   found»; 2+ (включая перекрывающиеся, напр. `aa` дважды в `aaa`) → ошибка
   **ambiguous** (`findUniqueIndex`). Тихий выбор первого совпадения больше
   невозможен.
2. **Batch одного файла — последовательно.** Блоки группируются по файлу и
   применяются к *эволюционирующему* содержимому: блок N видит результат блока
   N−1. Файл пишется **один раз**.
3. **Stale/partial.** Все блоки резолвятся **до** любой записи. Если хоть один
   блок не применился (not found/ambiguous) — ничего не записано, половинчатого
   состояния нет. Batch при этом **не** атомарная транзакция между файлами —
   это явно задокументированный контракт.
4. **Кодировка.** BOM/CRLF/legacy-кодировка сохраняются (через `EncodedIO` +
   `Bom`); покрыто round-trip тестом.

## Артефакты

- `packages/opencode/src/tool/search_replace.ts` — `findUniqueIndex` (уникальный
  точный матч, включая перекрывающиеся совпадения), группировка по нормализованному
  пути + последовательное применение, одна запись на файл.
- `packages/opencode/src/tool/search_replace.txt` — модель уведомлена о контракте
  unique/ambiguous, порядке блоков и «no partial edit».
- `packages/opencode/test/tool/search_replace.test.ts` — duplicate/ambiguous
  (включая `aa` в `aaa`), batch same-file, chain (no stale read),
  no-partial-state, CRLF single + multi-block batch, нормализация двух написаний
  пути.
- `packages/opencode/test/nocowboy/tool-encoding.test.ts` — `SearchReplaceTool`
  round-trip UTF-8 BOM / Shift_JIS / Windows-1251 / UTF-16 LE / UTF-32 LE.

## Проверка

```bash
cd packages/opencode && bun test test/tool/search_replace.test.ts
cd packages/opencode && bun test test/nocowboy/tool-encoding.test.ts
```
