# Reality vs Roadmap — changed status rows

Итоговый вердикт, доказательства и runbook: [Вердикт аудита автопилота](autopilot-audit-verdict-2026-10-06.md).

This table audits the 54 rows newly added or status-changed between local `master` and `chore/autopilot-uncommitted-dump`. “Implemented, unverified” means source is wired but dependencies are absent in this checkout, so tests/typecheck could not run.

| ID | master | branch | Evidence-based status |
|---|---|---|---|
| `deep-context-2m` | planned | done | partial — profile/threshold wired; 2M end-to-end not proven |
| `deep-context-selection` | new | blocked | planned — missing session signal is design work, not external block |
| `mcp-framework-merge` | planned | done | partial — launcher precedence, not a framework merge |
| `mcp-prompt-support` | planned | done | unproven — no prompt implementation in diff |
| `vector-store-switcher` | planned | blocked | in_progress — independent of graph; unsafe rollback/rebuild path |
| `nutausik-mcp-prompts` | planned | abandoned | duplicate/abandoned — rationale required |
| `alpha-manual-smoke-test` | planned | blocked | blocked — human terminal run outstanding |
| `rc-alpha-feedback-incorporated` | planned | blocked | blocked — feedback unavailable |
| `rc-user-testing-complete` | planned | blocked | blocked — external testers outstanding |
| `rc-performance-test` | planned | done | planned — benchmark false-positive on macOS and child failure |
| `rc-all-issues-resolved` | planned | blocked | blocked — unresolved issues, no complete issue inventory |
| `rc-docs-complete` | planned | done | partial — docs generated but carry false roadmap claims |
| `release-beta-feedback-incorporated` | planned | blocked | blocked — beta feedback unavailable |
| `release-all-tests-green` | planned | blocked | blocked — test gate not demonstrated |
| `release-roadmap-verified` | planned | done | planned — file-only verify and shell pipeline mask failures |
| `release-published` | planned | blocked | blocked — release gates not met |
| `obsidian-integration` | planned | blocked | planned — no graph prerequisite or code |
| `lang-switcher-ui` | planned | done | implemented, unverified live — TUI wiring and unit test source |
| `skillopt-integration` | planned | blocked | planned — external package absent, but separable from graph |
| `stop-hooks-turn-level` | in_progress | done | implemented, unverified — harness continuation wired |
| `ac-verification-hook` | in_progress | abandoned | in_progress/missing — old gate removed; generic hook is not AC policy |
| `knowledge-graph` | planned | blocked | in_progress — CLI/file-import graph exists; full spec missing |
| `diff-impact-analysis` | planned | blocked | planned — existing graph can support heuristic MVP |
| `arch-layer-detection` | planned | blocked | planned — path heuristics can run without full graph |
| `commitment-boundary-review` | planned | done | partial — invitation only, no mandatory reviewer gate |
| `spec-contract-delegation` | planned | done | partial — missing sections only warn |
| `yagni-decision-ladder` | planned | abandoned | abandoned — policy choice, no implementation |
| `over-engineering-review` | planned | done | partial — command/parser exist; no enforced gate |
| `engine-manifest` | new | done | partial — local --check fails due unavailable provenance object |
| `fork-merge-profile` | new | done | partial — compare utility exists, integration unverified |
| `file-ownership-manifest` | new | done | narrow done — local --check passes |
| `planner-reviewer-readonly-contract` | new | done | partial — permission rules exist; integration untested |
| `agent-catalog-spawn-policy` | new | done | implemented, unverified — listing/executor wired |
| `review-model-independence` | new | done | partial — warning, same-model review still allowed |
| `nocowboy-runtime-ports` | new | done | partial — interfaces under opencode, no @nocowboy/runtime package |
| `engine-adapter-package` | new | done | partial — wrappers under opencode, no package/live bindings for most ports |
| `structured-handoff` | new | done | partial — directive parser/router, not full artifact handoff |
| `stage-machine` | new | done | partial — only roadmapGate wired; evidence gate/advance isolated |
| `edit-port-batch-safety` | new | done | partial — batch implementation; no executable test verification here |
| `plugin-hook-facade` | new | done | partial — constants/list, not versioned runtime dispatch facade |
| `nocowboy-i18n-package` | new | done | partial — keys/cache changed, no @nocowboy/i18n package |
| `nocowboy-ui-package` | new | done | partial — view models in existing plugin/UI, no new package boundary |
| `input-port` | new | done | partial — bottom-bar mouse handling; not full TUI input contract |
| `git-balance-async-services` | new | done | partial — async git wired; live TUI not verified |
| `memory-adapter-unified` | new | done | partial — direct transport unified; MCP SDK still separate |
| `memory-transport-sdk-unify` | new | done | partial — lifecycle/scope shared; transport still separate |
| `provider-adapters-port` | new | done | partial — balance/model snapshot adapted, core generation path not migrated |
| `cost-balance-semantics` | new | done | partial — balance unknown modeled; broader cost accounting unverified |
| `upstream-backport-ledger` | new | done | narrow done — 13-entry ledger validator passes |
| `migration-contract-tests` | new | done | partial — manifest checks existence, not every live scenario |
| `backport-compaction-tail` | new | done | pre-existing behavior — no new production diff |
| `backport-subagent-depth-resume` | new | done | partial — diagnostics added; end-to-end unverified |
| `backport-provider-malformed-config` | new | done | partial — sanitizer wired; integration unverified |
| `tool-capability-config` | new | done | partial — edit-method selector wired; model-name fallback remains |
