# Autopilot diff triage — 2026-10-06

Итоговый вердикт, доказательства и runbook: [Вердикт аудита автопилота](autopilot-audit-verdict-2026-10-06.md).

Base: local `master` e4558d8d; target: `chore/autopilot-uncommitted-dump` ddddfe49; merge base 170167c9. Green means the narrow static/ledger claim was checked in this checkout. It does not certify a release build. Yellow means useful or plausible work whose integration still needs verification or correction. Red means do not carry over as-is.

| Git | Zone | File | Reason |
|---|---|---|---|
| M | YELLOW | `.husky/pre-commit` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `.nocowboy/command/commitment-review.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `.nocowboy/command/ponytail-review.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `.nocowboy/command/spec-contract.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | GREEN | `backport-ledger.json` | Narrow built-in check passed locally; preserve with its related files. |
| M | RED | `docs/CHANGELOG.md` | Misleading status/claim, invalid benchmark, or audit prompt pollution; rewrite or omit. |
| M | YELLOW | `docs/README.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | RED | `docs/ROADMAP.md` | Misleading status/claim, invalid benchmark, or audit prompt pollution; rewrite or omit. |
| A | YELLOW | `docs/analysis/fork-management-audit-2026-10-05.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | RED | `docs/codex_audit/prompt_for_audit_1.txt` | Misleading status/claim, invalid benchmark, or audit prompt pollution; rewrite or omit. |
| M | YELLOW | `docs/features/ac-verification-hook.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/agent-catalog-spawn-policy.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/backport-compaction-tail.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/backport-provider-malformed-config.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/backport-subagent-depth-resume.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | RED | `docs/features/commitment-boundary-review.md` | Misleading status/claim, invalid benchmark, or audit prompt pollution; rewrite or omit. |
| A | YELLOW | `docs/features/cost-balance-semantics.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/deep-context-2m.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/edit-port-batch-safety.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/engine-adapter-package.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/file-ownership-manifest.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/fork-merge-profile.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/git-balance-async-services.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/input-port.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/lang-switcher-ui.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/mcp-framework-merge.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/mcp-prompt-support.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/memory-adapter-unified.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/memory-transport-sdk-unify.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/migration-contract-tests.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/nocowboy-i18n-package.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/nocowboy-runtime-ports.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/nocowboy-ui-package.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/over-engineering-review.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/planner-reviewer-readonly-contract.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/plugin-hook-facade.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/provider-adapters-port.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | RED | `docs/features/rc-performance-test.md` | Misleading status/claim, invalid benchmark, or audit prompt pollution; rewrite or omit. |
| A | YELLOW | `docs/features/release-all-tests-green.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | RED | `docs/features/release-roadmap-verified.md` | Misleading status/claim, invalid benchmark, or audit prompt pollution; rewrite or omit. |
| A | YELLOW | `docs/features/review-model-independence.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/spec-contract-delegation.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/stage-machine.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `docs/features/stop-hooks-turn-level.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/structured-handoff.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/tool-capability-config.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/upstream-backport-ledger.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/features/vector-store-switcher.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/reference/engine-manifest.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/reference/mcp-first-party.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `docs/reference/upstream-backport-ledger.md` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | RED | `docs/roadmap.json` | Misleading status/claim, invalid benchmark, or audit prompt pollution; rewrite or omit. |
| A | YELLOW | `engine-manifest.json` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `ownership-manifest.json` | Check passes on this branch, but boundary/manifest references branch code; recheck after selective port. |
| A | YELLOW | `packages/opencode/src/cli/cmd/knowledge-graph.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/cli/cmd/tui/app.tsx` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/cli/cmd/tui/config/tui-schema.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/cli/cmd/tui/feature-plugins/sidebar/context.tsx` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/cli/cmd/tui/plugin/api.tsx` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/cli/cmd/tui/plugin/runtime.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/cli/cmd/tui/routes/session/sidebar.tsx` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/cli/cmd/tui/routes/session/subagent-footer.tsx` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/cli/registry.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/config/config.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/mcp/index.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/agent/catalog.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/nocowboy/agent/index.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | GREEN | `packages/opencode/src/nocowboy/backport/ledger.ts` | Narrow built-in check passed locally; preserve with its related files. |
| M | YELLOW | `packages/opencode/src/nocowboy/bootstrap.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/nocowboy/cli/cmd/tui/context/i18n-bridge.tsx` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/nocowboy/commands.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/nocowboy/components/dialog-indexing.tsx` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/nocowboy/components/nocowboy-bars.tsx` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/config/provider-models.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/engine-adapter/index.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/git/git-port.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/indexing-config-key.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/indexing-vector-store.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/nocowboy/indexing.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/knowledge-graph-dashboard.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/knowledge-graph.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/nocowboy/mcp/launcher.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/memory/adapter.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/memory/scope.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/nocowboy/nutausik-auto-wire.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/nocowboy/nutausik-client.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/plugin-view-models.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/nocowboy/plugins/sidebar-usage.tsx` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/nocowboy/provider-balance.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/nocowboy/provider/models-snapshot.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/provider/port.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/nocowboy/review/cascade.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/review/commitment.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/review/over-engineering.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/runtime/index.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/runtime/ports.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/session/agent-handoff.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/nocowboy/session/autopilot.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/session/context-profile.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/nocowboy/session/overflow.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/session/stage-machine.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/session/stop-hooks.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/spec/contract.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| D | YELLOW | `packages/opencode/src/nocowboy/task/ac-verification-hook.ts` | Deletion needs dependent-callsite and regression review; Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/tool/edit-capability.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/tool/resume.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/nocowboy/tool/task.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/nocowboy/ui/i18n.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/ui/input-port.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/src/nocowboy/ui/language.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/permission/index.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/session/prompt.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/tool/complete_task.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/tool/registry.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/tool/search_replace.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/tool/search_replace.txt` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/src/tool/task.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/test/fixture/tui-plugin.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/test/lib/effect.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| D | YELLOW | `packages/opencode/test/nocowboy/ac-verification-hook.test.ts` | Deletion needs dependent-callsite and regression review; Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/agent-catalog.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/agent/read-only-agents.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/backport-ledger.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/commitment-review.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/test/nocowboy/config/config.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/context-profile.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/contracts/migration-contracts.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/contracts/mutation-policy.contract.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/contracts/scenarios.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/contracts/tui-navigation.contract.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/contracts/worker-child.contract.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/docs-index.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/edit-capability.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/engine-adapter/engine-adapter.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/engine-manifest.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/git-port.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/handoff.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/test/nocowboy/i18n.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/indexing-config-key.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/test/nocowboy/indexing-startup.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/indexing-vector-store.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/input-port.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/knowledge-graph.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/mcp-launcher.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/memory-adapter.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/memory-transport-unify.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/over-engineering-review.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/ownership-manifest.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/plugin-view-models.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/test/nocowboy/provider-balance.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/provider-models.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/test/nocowboy/provider/models-snapshot.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/provider/port.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/resume-diagnostic.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/test/nocowboy/review-cascade.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/runtime/ports.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/session-router.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/test/nocowboy/session/overflow.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/spec-contract.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/stage-machine.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/stop-hooks.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/subagent-depth.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/test/nocowboy/tool-encoding.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/nocowboy/tui-language.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/opencode/test/plugin/hook-facade.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/test/session/prompt.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/test/tool/search_replace.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/opencode/test/tool/task.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `packages/plugin/src/facade.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/plugin/src/index.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `packages/plugin/src/tui.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `script/upstream/utils/compare-trees.test.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `script/upstream/utils/compare-trees.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `script/upstream/utils/config.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | GREEN | `scripts/backport-ledger.ts` | Narrow built-in check passed locally; preserve with its related files. |
| A | YELLOW | `scripts/check-engine-adapter.ts` | Check passes on this branch, but boundary/manifest references branch code; recheck after selective port. |
| A | YELLOW | `scripts/check-runtime-boundary.ts` | Check passes on this branch, but boundary/manifest references branch code; recheck after selective port. |
| A | YELLOW | `scripts/engine-manifest.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| M | YELLOW | `scripts/lib/roadmap-types.ts` | Not release-verified: dependencies unavailable, or integration/acceptance scope needs review. |
| A | YELLOW | `scripts/ownership-manifest.ts` | Check passes on this branch, but boundary/manifest references branch code; recheck after selective port. |
| A | RED | `scripts/perf-check.ts` | Misleading status/claim, invalid benchmark, or audit prompt pollution; rewrite or omit. |
