# Spec Contract for Delegation

> Roadmap id: `spec-contract-delegation` — status is tracked in `docs/roadmap.json`.

## Description
A delegated subagent never sees the spawning conversation, so the prompt *is* the
spec. `packages/opencode/src/nocowboy/spec/contract.ts` defines the canonical
five parts and makes dropping one visible:

| Part | Heading |
| --- | --- |
| `goal` | `## Goal` |
| `constraints` | `## Constraints` |
| `acceptanceCriteria` | `## Acceptance Criteria` |
| `filesToTouch` | `## Files to touch` |
| `filesToNotTouch` | `## Files to NOT touch` |

- `validateSpecContract(contract)` returns one problem per missing/empty part; a
  part with genuinely nothing must be the explicit word `none` (an empty string
  or array is a missing part). When every part is present the function returns an
  empty array of problems, i.e. the contract is valid.
- `renderSpecContract(contract)` renders a stable markdown block (the shape the
  `/spec-contract` command emits and the task tool recognises).
- `contractWarning(prompt)` backs a **non-blocking** warning the task tool logs
  when a delegation prompt carries no contract — discipline, not a barrier.

The `/spec-contract` command (`.nocowboy/command/spec-contract.md`) assembles the
contract. The subagent-discipline rule already referenced these functions and the
command; they now exist.

## Key files
- `packages/opencode/src/nocowboy/spec/contract.ts`
- `packages/opencode/src/tool/task.ts`
- `packages/opencode/test/nocowboy/spec-contract.test.ts`

## Verification
- `bun test test/nocowboy/spec-contract.test.ts` — 9 pass (each empty part
  rejected, explicit `none` accepted, render headings, warning on absent contract).
- `bun run typecheck` — clean.
