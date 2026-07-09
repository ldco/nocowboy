---
description: "Show diff of changes in the current sandbox branch"
mode: all
---
Show the diff between the sandbox branch and its base branch.

Shows:
- File-by-file change summary (stat)
- Full diff (truncated to 5000 lines)
- Action hint: `/sandbox-apply` or `/sandbox-abort`

Usage:
`/sandbox-diff`

Must be run from within a sandbox branch (created by `/sandbox-start`).
