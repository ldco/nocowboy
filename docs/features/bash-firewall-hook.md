# Bash firewall hook — блокировать опасные команды

> Generated from docs/roadmap.json — part of NoCowboy verification system.

## Description
Добавлен bash firewall blocker в blocked-tools.ts (12 опасных паттернов: rm -rf /, dd, fork bomb, curl|bash, ...). ToolBlocker.check() теперь принимает args. Execute-time блокировка требует доработки bash tool executor.

## Key files
_No files tracked._

## Verification
- File existence: ✅ not tracked
- Attestation for overseer: ✅ not required
