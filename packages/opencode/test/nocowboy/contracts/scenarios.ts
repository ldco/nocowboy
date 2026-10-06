/**
 * Migration contract manifest.
 *
 * A future engine migration must not silently drop these behaviours. Each
 * scenario maps to one or more automated tests — some live in this directory,
 * the rest are the existing suites that already prove the behaviour. The
 * contract test (`migration-contracts.test.ts`) fails if a required scenario has
 * no test or a referenced test file disappears, so the gate cannot rot silently.
 *
 * `tests` paths are relative to `packages/opencode/`.
 */
export interface ContractScenario {
  id: string
  description: string
  tests: string[]
}

export const REQUIRED_SCENARIOS: ContractScenario[] = [
  {
    id: "worker-child-lifecycle",
    description: "worker child: foreground/background/resume/cancel/timeout; a long tool or permission wait is not a stall",
    tests: ["test/tool/task.test.ts", "test/nocowboy/contracts/worker-child.contract.test.ts"],
  },
  {
    id: "planner-reviewer-mutation-policy",
    description: "planner/reviewer read-only ceiling (incl. YOLO and delegation)",
    tests: [
      "test/nocowboy/agent/read-only-agents.test.ts",
      "test/nocowboy/server/permission-allow-everything.test.ts",
      "test/nocowboy/contracts/mutation-policy.contract.test.ts",
    ],
  },
  {
    id: "parallel-resumed-child-costs",
    description: "two parallel child costs; a resumed child is not counted twice",
    tests: ["test/nocowboy/cost-propagation.test.ts", "test/nocowboy/stats-subagent-cost.test.ts"],
  },
  {
    id: "locale-switch-and-isolation",
    description: "RU/EN locale selection (i18n strings + agent prompt); two projects with different locale",
    tests: ["test/nocowboy/i18n.test.ts", "test/nocowboy/contracts/mutation-policy.contract.test.ts"],
  },
  {
    id: "edit-roundtrip-and-safety",
    description: "edit round-trip UTF-8 BOM/CRLF/legacy + duplicate/batch/stale/partial",
    tests: ["test/tool/search_replace.test.ts", "test/nocowboy/tool-encoding.test.ts"],
  },
  {
    id: "memory-status-and-isolation",
    description: "memory unavailable/recovered and namespace isolation",
    tests: ["test/nocowboy/memory-adapter.test.ts", "test/nocowboy/nutausik-client.test.ts"],
  },
  {
    id: "compaction-with-active-goal",
    description: "compaction safety together with the goal/checkpoint machinery",
    tests: ["test/nocowboy/session-compaction-safety.test.ts", "test/nocowboy/goal.test.ts"],
  },
  {
    id: "tui-navigation",
    description: "TUI focus/selection/navigation",
    tests: ["test/cli/cmd/tui/attention.test.ts", "test/nocowboy/contracts/tui-navigation.contract.test.ts"],
  },
]
