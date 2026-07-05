---
description: Delete all local data — right to erasure under 152-ФЗ Art. 21
---

# /forget — Right to Erasure

Delete all local data stored by NoCowboy. Complies with 152-ФЗ Article 21 (right to erasure).

## What Gets Deleted

- `~/.config/nocowboy/` — all config, skills, hooks
- `~/.local/share/nocowboy/` — all sessions, storage, cache
- `.nutausik/` — NUTAUSIK memory database (in current project)
- `.kilo/` — legacy Kilo directory (if exists)

## What Stays

- The NoCowboy binary itself
- Project files, source code

## Steps

1. **Confirm** — ask the user: "This will delete ALL local data. Are you sure? (yes/no)"
2. **If yes**: 
   - Call `bash: rm -rf ~/.config/nocowboy ~/.local/share/nocowboy`
   - If in a project with `.nutausik/`: `bash: rm -rf .nutausik`
   - If in a project with `.kilo/`: `bash: rm -rf .kilo`
3. **Report** — "All local data deleted. NoCowboy will recreate config on next start."

## Rules

- ALWAYS confirm with the user before deleting
- Show exactly what will be deleted
- Never delete files outside `~/.config/`, `~/.local/share/`, `.nutausik/`, `.kilo/`
