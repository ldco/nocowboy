---
description: Build a 5-part spec contract and delegate with it (context-independent delegation)
mode: all
---

Spec Contract for Delegation. Перед делегацией собери спек из **пяти частей**, чтобы
субагент не нуждался в дополнительном контексте — промпт и есть спек.

Пять частей (все обязательны; пустую часть пиши явным `none`, не пропускай):
1. **Goal** — что построить, 1–2 предложения.
2. **Constraints** — стек, зависимости, что нельзя менять.
3. **Acceptance criteria** — конкретные проверяемые утверждения «done».
4. **Files to touch** — файлы/модули, которые можно менять.
5. **Files to NOT touch** — файлы/модули, которые трогать нельзя (или `none`).

Формат (заголовки фиксированы; `renderSpecContract` из
`src/nocowboy/spec/contract.ts` даёт ровно такой вывод):

```
## Spec contract

### Goal
<...>

### Constraints
- <...>

### Acceptance criteria
- <...>

### Files to touch
- <...>

### Files to NOT touch
- <...>
```

Шаги:
1. Собери пять частей по текущей задаче.
2. Отрисуй контракт и проверь, что `validateSpecContract` пуст (нет пустых частей).
3. Делегируй: `task(subagent_type: "worker" | "reviewer", prompt: "<контракт + детали>")` —
   контракт идёт в промпт дословно, перед деталями.
4. Для проверки: `hasSpecContract(prompt)` истинно. `task` предупредит в логе,
   если контракта нет (не блокирует).

Usage:
`/spec-contract <task>`
