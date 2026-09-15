# Permission timeout — доработка (из P2-A4)

> Generated from docs/roadmap.json — part of NoCowboy verification system.

## Description
Добавлен permission_timeout_by_tool в схему конфига (Record<string, PositiveInt>). Permission/index.ts читает tool-specific таймаут (из patterns[0]), fallback на общий permission_timeout. Настройка через nocowboy.json.

## Key files
_No files tracked._

## Verification
- File existence: ✅ not tracked
- Attestation for overseer: ✅ not required
