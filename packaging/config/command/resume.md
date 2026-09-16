---
description: Resume an interrupted workflow from its next unfinished step
---

Resume the interrupted work — do not restart it.

1. **Find the workflow.** If this session already has a NUTAUSIK task, use it.
   Otherwise look for an unfinished one: `nutausik_task_list` with status
   `active`, then `planning`, and prefer a task whose plan is incomplete. If more
   than one is plausible, ask which one — a single question, not a menu.

2. **Read its durable progress**: `nutausik_task_progress` with the slug. It
   returns `next` (the first unfinished step) and `steps` with per-step marks.
   - `complete: true` → say it is already finished and stop.
   - `total: 0` → it has no plan; offer to write one with `nutausik_task_plan`.

3. **Continue from `next`**, then the following steps, in order.
   - After each step is genuinely done and verified, call `nutausik_task_step`
     with its number. The ledger is what makes the run resumable — never skip it.
   - Never re-run a step already marked done.

4. **If the plan no longer matches reality**, fix the plan (`nutausik_task_plan`)
   and say why. Doing different work than the plan says, silently, is a lie.

5. **If it cannot continue** (missing access, unclear spec), block it:
   `nutausik_task_update` with status `blocked`, and state exactly what is needed.

Finish with a short report: which steps ran now, what `next` is, and the slug.
