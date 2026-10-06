# Ledger upstream-backport: SHA → потребность → контракт → adaptation diff → verify

> Generated from docs/roadmap.json — part of NoCowboy verification system.

## Description
В истории уже есть release `0.14.0 — Security Hardening & Upstream Harvest` и annotations с upstream SHA: выборочный harvest используется. Повторный перенос способен вернуть старую семантику. Ledger + validator imported from the audited dump (green zone) and pass: 13 entries, no duplicate upstream SHA (bun run scripts/backport-ledger.ts --check).

## Key files
- `packages/opencode/src/nocowboy/backport/ledger.ts`
- `backport-ledger.json`

## Verification
- File existence: ✅ tracked
- Attestation for overseer: ✅ not required
