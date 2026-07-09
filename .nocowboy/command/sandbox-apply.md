---
description: "Apply sandbox changes: merge branch, delete sandbox"
mode: all
---
Merge the sandbox branch into the base branch and clean up.

Process:
1. Auto-commits any uncommitted changes in sandbox
2. Switches to base branch
3. Merges sandbox branch
4. Deletes sandbox branch

Usage:
`/sandbox-apply`

Must be run from within a sandbox branch.
