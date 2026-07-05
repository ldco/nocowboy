---
description: Verify the last /act result — run tests, lint, typecheck, compare to plan
---

# /verify — Plan Verification Loop

## When to use
After `/act` completes, run verify to ensure the implementation matches the plan.

## Steps

1. Read the most recent plan from `.kilo/plans/`
2. Run lint:
   ```bash
   npm run lint 2>/dev/null || bun run lint 2>/dev/null || npx eslint . 2>/dev/null || true
   ```
3. Run typecheck:
   ```bash
   npx tsc --noEmit 2>/dev/null || bun run typecheck 2>/dev/null || cargo check 2>/dev/null || mypy . 2>/dev/null || true
   ```
4. Run relevant tests:
   ```bash
   npm test 2>/dev/null || bun test 2>/dev/null || cargo test 2>/dev/null || pytest 2>/dev/null || true
   ```
5. Check git diff against the plan:
   - `git_git_diff_unstaged` + `git_git_diff_staged` for working tree diff
   - `git_git_log(max_count: 10)` for recent commits
   - Are all files listed in the plan changed?
   - Are there unexpected changes (files NOT in the plan)?
   - Is the diff size reasonable for the plan's scope?

## Output Format

```markdown
## Verification Report

### Lint
- ✅ No errors
- ⚠️ 2 warnings (pre-existing)

### Typecheck
- ✅ Clean

### Tests
- ✅ 15 passed, 0 failed

### Diff vs Plan
- ✅ All planned files changed
- ⚠️ 1 extra file modified: src/utils/helper.ts (unplanned)
- 📏 Diff: +42, -3 lines (matches plan scope)
```

## On Failure

If any step fails:
1. Report the failure with exact error messages
2. Suggest a fix based on the error
3. Re-run `/act` with the fix suggestion
4. Re-verify

If verification passes, offer to `/commit`.
