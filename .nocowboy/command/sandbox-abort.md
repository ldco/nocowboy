---
description: "Discard sandbox changes, return to base branch"
mode: all
---
Discard all changes in the sandbox and return to the base branch.

Process:
1. Stashes any uncommitted changes
2. Switches to base branch
3. Deletes sandbox branch

Usage:
`/sandbox-abort`

Must be run from within a sandbox branch.
