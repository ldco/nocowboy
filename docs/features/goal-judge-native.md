# Goal judge — интегрировать в agent stop loop (Effect-native)

> Generated from docs/roadmap.json — part of NoCowboy verification system.

## Description
GoalService.evaluate() интегрирован в runLoop (session/prompt.ts строка 1941). После каждого handle.process проверяется активная цель. Если ok или impossible — break из цикла. GoalService.get/clear/import все подключены.

## Key files
_No files tracked._

## Verification
- File existence: ✅ not tracked
- Attestation for overseer: ✅ not required
