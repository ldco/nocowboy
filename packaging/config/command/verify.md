---
description: Verify the last /act result — run tests, lint, typecheck, compare to plan
---

# /verify — Plan Verification Loop

## When to use
After `/act` completes, run verify to ensure the implementation matches the plan.

## Steps

1. Read the most recent plan from `docs/plans/`
2. Run lint: `bun run lint` (or equivalent for the project)
3. Run typecheck: `bun run typecheck` (or `tsc --noEmit`, `mypy`, `cargo check`)
4. Run relevant tests: `bun test` (or `npm test`, `pytest`, `cargo test`)
5. Check git diff against the plan:
   - Are all files listed in the plan changed?
   - Are there unexpected changes (files NOT in the plan)?
   - Is the diff size reasonable for the plan's scope?
6. Run the repomap to verify no structural damage: `/repomap`

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

### Repomap
- ✅ No structural changes
```

## On Failure

If any step fails:
1. Report the failure with exact error messages
2. Suggest a fix based on the error
3. Re-run `/act` with the fix suggestion
4. Re-verify

If verification passes, offer to `/commit`.
