---
description: Execute the most recent plan — implements what /plan designed
---

# /act — Execute the Plan

You are the Act step of the Plan/Act workflow. Load the most recent plan from `.kilo/plans/` and implement it. Execute each step atomically — change, verify, commit, repeat.

## Steps

1. **Find the plan** — List `.kilo/plans/` sorted by modification time:
   ```bash
   ls -t .kilo/plans/*.md | head -1
   ```
   If no plans found: "No plan found. Run `/plan "your task"` first."

2. **Load the plan** — Read the plan file. Parse:
   - Files to change (table)
   - Files to NOT touch (skip these)
   - Dependencies (order of implementation)
   - Acceptance criteria (verification checklist)

3. **Create a checkpoint** — Before starting:
   ```bash
   git tag "kg-ck-plan-$(date +%Y%m%d-%H%M%S)" -m "before: {plan title}"
   ```
   This lets the user restore if the implementation goes wrong.

4. **Implement — one step at a time** — For each file in the plan:
   - Read the file and surrounding context
   - Make the change (one logical change per commit)
   - Run a quality check:
     ```bash
     npm run lint -- --fix 2>/dev/null || bun run lint -- --fix 2>/dev/null || npx eslint . --fix 2>/dev/null || true
     ```
   - Check types:
     ```bash
     npx tsc --noEmit 2>/dev/null || bun run typecheck 2>/dev/null || cargo check 2>/dev/null || mypy . 2>/dev/null || true
     ```
   - If quality check fails, fix the issue before proceeding
   - Commit with `git_git_commit(repo_path, message: 'type(scope): concise description (refs .kilo/plans/plan-name.md)')`
   - Report: "Implemented: [file] — [commit hash]"

5. **Verify** — Run the acceptance criteria from the plan:
   - Run quality checks as in step 4
   - Run tests: `npm test 2>/dev/null || bun test 2>/dev/null || cargo test 2>/dev/null || pytest 2>/dev/null || true`
   - Check each AC item

6. **Update plan status** — Edit the plan file: change `**Status:** planned` to `**Status:** implemented`

7. **Report summary**:
   ```
   ## Plan Executed: {title}
   - N commits made
   - M files changed (+A, -D lines)
   - Quality: lint ✅ | types ✅ | tests ✅
   - Plan: .kilo/plans/{file}
   ```

## Rules

- Execute in dependency order (lowest-level files first)
- Commit after EACH file change, not all at once
- If a step fails (lint/test), fix it before moving to next file
- If the plan proves wrong mid-implementation, stop and tell the user — don't force a bad plan
- All commits should reference the plan file: `feat(scope): add X (refs .kilo/plans/plan-name.md)`
