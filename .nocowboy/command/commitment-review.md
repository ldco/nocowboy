---
description: Commitment-Boundary Review — fresh model reads the diff and returns ship, fix-first or rethink (once per deliverable)
mode: all
---
Commitment-Boundary Review. Запрашивается **ровно один раз** в конце deliverable (guard: повторное приглашение для того же deliverable не выдаётся) — это решение о коммите, а не ещё один проход ревью.

Свежая модель (НЕ та, что вела сессию) читает diff с нуля.

Шаги:
1. Собери diff деliverable: `git diff <base>...HEAD` (или `git diff` для незакоммиченного).
2. Запусти независимую модель с промптом commitment-ревью:
   `task(subagent_type: "reviewer", prompt: "<commitment prompt + diff>")`.
   Промпт: «Ты — commitment boundary reviewer; код писал другой модель; прочитай diff с нуля. Верни РОВНО один вердикт отдельной строкой: `Verdict: ship` (корректно, безопасно к поставке), `Verdict: fix-first` (поставить после перечисленных блокеров), `Verdict: rethink` (подход неверен). Затем одна строка обоснования и, для fix-first/rethink, список конкретных блокеров.»
3. Разбери вердикт (`ship` | `fix-first` | `rethink`) и доложи его отдельной строкой.

Правила:
- Один раз на deliverable; повторный запрос для того же deliverable не нужен.
- Вердикт независим: `rethink` означает «не строить на этом», а не «доработать».
- Только три вердикта. Никаких «почти ship».

Usage:
`/commitment-review`
