---
description: Stage and commit changes with a conventional commit message
---

# /commit — Stage & Commit with Conventional Message

## Steps

1. Run `git_git_status` to see what's changed
2. Run `git_git_diff_unstaged` to review all changes
3. Run a quick quality check:
   ```bash
   npm run lint -- --fix 2>/dev/null || bun run lint -- --fix 2>/dev/null || npx eslint . --fix 2>/dev/null || true
   ```
4. Stage all changed files: `git_git_add(repo_path, files: [...all changed files...])`
5. Generate a conventional commit message based on the diff:
   - Type: feat, fix, refactor, style, docs, test, chore
   - Scope: main module/directory affected
   - Description: one-line summary of the change
6. Commit: `git_git_commit(repo_path, message: 'type(scope): description')`
7. Report summary: files changed, commit hash, quality results
