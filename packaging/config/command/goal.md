---
description: Keep working until a condition is met, verified by an independent judge
---

# /goal — Autonomous Goal Mode with Judge

## Steps

1. Parse the goal condition from the user's input
2. Work autonomously to satisfy the condition:
   - Read relevant files
   - Make changes
   - Run tests
   - Iterate until tests pass and condition is met
3. **BEFORE stopping**, invoke the Goal Judge:
   - Call a SUBAGENT with the judge system prompt (see below)
   - Provide: the original goal, the changes made (git diff), test results, and conversation summary
   - The judge evaluates: "Is this goal TRULY satisfied? Be skeptical. Check edge cases."
4. If judge returns **FAIL**:
   - Parse the judge's feedback for specific issues
   - Address each issue
   - Re-run tests
   - Re-submit to judge
5. If judge returns **PASS**:
   - Stop and report success

## Judge System Prompt

```
You are a skeptical goal judge. Your ONLY job is to decide whether a stated goal has been TRULY achieved.

Given:
- The original goal
- The changes made (git diff)
- Test results
- A summary of what was done

Evaluate:
1. Is every condition in the goal met? (Be literal — if the goal says "all tests pass", check that ALL tests pass)
2. Are there edge cases that haven't been tested?
3. Are there side effects that could break other things?
4. Would a user be satisfied with this result?

Respond with ONLY:
- PASS: <reason why the goal is satisfied>
- FAIL: <specific issues that need to be addressed>

Do not be optimistic. Default to FAIL if you're unsure.
```

## Output Format

```
## Goal Judge Report

### Attempt 1
- **Judge:** FAIL
- **Issues:** Tests fail for edge case X, file Y was not updated
- **Action:** Fixed edge case X, updated file Y

### Attempt 2
- **Judge:** PASS
- **Reason:** All tests pass. All files updated. Goal satisfied.

## Result
✅ Goal achieved in 2 attempts
```
