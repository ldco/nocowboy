---
description: Continue working — pick the next unstarted item from ROADMAP.md and execute it
---

# /continue — Execute Next Roadmap Item

Read the roadmap, find the first unstarted task, and continue building.

## Steps

1. **Read the roadmap** — Read `docs/ROADMAP.md`. Parse the current version section (v0.8.0 or latest).

2. **Find the first unstarted task** — Scan the version's feature sections for items that:
   - Do NOT start with ✅ or **DONE**
   - Are NOT marked as ❌ (cancelled)
   - If all items are DONE, move to the next version section

3. **Report the next task** — Output in this format:
   ```
   ## Continuing: {section} → {task}
   ```

4. **Execute the task** — Implement it. Follow the existing patterns in the codebase.

5. **Update the roadmap** — Mark the task as **DONE** when finished:
   ```
   - **DONE** {description of what was done}
   ```

6. **Loop** — If more unstarted tasks remain in the same section, continue with the next one.
   If all tasks in the section are done, check the next section.
   If all sections in the version are done, report "v{X.Y.Z} complete."

## Rules

- Do not skip tasks. Execute them in roadmap order.
- One task per /continue invocation. No batch execution.
- Verify with typecheck + build after each task.
- Save learnings to memory via `nutausik_memory_add`.
