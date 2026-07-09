---
description: "Create a git branch to isolate AI changes before applying"
mode: all
---
Create a new sandbox branch from current HEAD for isolated changes.

Purpose:
- AI changes are made in an isolated git branch
- User reviews diff before changes are applied
- Prevents accidental modifications to main branch

Usage:
`/sandbox-start` — creates branch `nocowboy-sandbox/<session>-<timestamp>`

After `/sandbox-start`:
1. Make your changes normally
2. Run `/sandbox-diff` to review
3. Run `/sandbox-apply` to merge, or `/sandbox-abort` to discard
