---
description: Enable sandbox mode — review all AI changes before they are applied
---

# /sandbox — Diff Review Sandbox

Enable sandbox mode to isolate AI changes and review them before accepting.

## How It Works

In sandbox mode, every file change is staged in a git stash or temporary commit.
The user reviews the diff before the changes are finalized.

## Steps

1. **Enable sandbox** — before making changes, create a checkpoint:
   - `git stash push -m "sandbox-before"`
   - Or create a git tag: `git tag "sandbox-ck-$(date +%Y%m%d)"`

2. **Make changes** — implement the requested change

3. **Show diff** — present the diff to the user:
   - `git diff` (if not yet staged)
   - `git diff --cached` (if staged)

4. **Ask for confirmation** — present the diff and ask if the changes are acceptable

5. **If accepted**:
   - `git add` + `git commit` the changes
   - Or `git stash pop` to restore

6. **If rejected**:
   - `git checkout -- .` to discard
   - Or `git stash pop` then `git checkout .`

## Rules

- Always confirm with the user before finalizing changes
- Always show the full diff before asking
- If the user rejects, restore the original state completely
