/**
 * TUI façade view models.
 *
 * A slot widget must not reach into internal TUI contexts (`useLocal`,
 * `getUsage`, `@tui/...`). This module builds the {@link TuiViewModels} facade
 * from injected data sources, so the widget renders display-ready values and the
 * coupling to internal state lives at one boundary (the plugin API). Data
 * sources are injected so the facade is unit-testable without a renderer.
 */

import type { Message } from "@nocowboy/sdk/v2"
import type { TuiUsageViewModel, TuiViewModels } from "@nocowboy/plugin/tui"
import { formatCount, getUsage } from "@tui/routes/session/usage"
import { fmtAttemptCost, fmtScore } from "@/nocowboy/components/model-info-panel-utils"

export interface TuiViewModelDeps {
  /** Session messages (already synced). */
  messages: (sessionID: string) => readonly Message[]
  /** Currently selected model. */
  model: () => { providerID: string; modelID: string } | undefined
  /** Currently selected agent. */
  agent: () => { name: string; mode: string } | undefined
  /** Current git branch name, if any. */
  vcsBranch: () => string | undefined
  /** TerminalBench metadata for a model, if advertised. */
  terminalBench: (
    providerID: string,
    modelID: string,
  ) => { overallScore: number; avgAttemptCostUsd: number } | undefined
  /** NUTAUSIK memory transport health. */
  memoryStatus: () => "available" | "degraded" | "unavailable"
}

export function createTuiViewModels(deps: TuiViewModelDeps): TuiViewModels {
  return {
    usage(sessionID) {
      const total = getUsage(deps.messages(sessionID))
      const usage: TuiUsageViewModel = {
        input: formatCount(total.input),
        output: formatCount(total.output),
        cached: formatCount(total.cached),
      }
      const current = deps.model()
      const bench = current ? deps.terminalBench(current.providerID, current.modelID) : undefined
      if (bench) {
        usage.terminalBench = {
          score: fmtScore(bench.overallScore),
          costPerAttempt: fmtAttemptCost(bench.avgAttemptCostUsd),
        }
      }
      return usage
    },
    model() {
      const current = deps.model()
      return current ? { providerID: current.providerID, modelID: current.modelID } : undefined
    },
    agent() {
      const current = deps.agent()
      return current ? { name: current.name, mode: current.mode } : undefined
    },
    git() {
      const branch = deps.vcsBranch()
      return branch ? { branch } : undefined
    },
    memory() {
      return { status: deps.memoryStatus() }
    },
  }
}
