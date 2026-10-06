import type { Config } from "@/config/config"
import type { Provider } from "@/provider/provider"
import type { MessageV2 } from "@/session/message-v2"
import { Token } from "@/util/token"
import type { ModelMessage } from "ai"
import * as Log from "@nocowboy/core/util/log"
import { resolveContextProfile } from "./context-profile"

const profileLog = Log.create({ service: "nocowboy.context-profile" })

const COMPACTION_BUFFER = 20_000
const OUTPUT_CAP = 20_000

// Token.estimate undercounts provider tokenizers, especially for code and JSON payloads.
const FACTOR = 1.3
const MEDIA = "[encoded media]"
const MEDIA_TOKENS = Token.estimate(MEDIA)

type Payload = {
  messages: ModelMessage[]
  tools: Record<string, { description?: string; inputSchema?: unknown }>
}

function continued(messages: ModelMessage[]) {
  const idx = messages.findLastIndex((message) => message.role === "user")
  return messages.slice(idx + 1).some((message) => message.role === "tool")
}

export namespace NoCowboySessionOverflow {
  export class PreflightError extends Error {
    constructor() {
      super("Outgoing context reached the automatic compaction threshold")
      this.name = "PreflightCompactionError"
    }
  }

  export function count(tokens: MessageV2.Assistant["tokens"]) {
    const total = tokens.input + tokens.output + tokens.reasoning + tokens.cache.read + tokens.cache.write
    return total || tokens.total || 0
  }

  // nocowboy_change start - without a configured threshold, compaction only fired at the very edge of
  // the context window (limit() returned the full usable window), so a session could grow to ~240k
  // tokens per turn before ever compacting. Default to 80% of the window so the context is reined in
  // while there is still headroom, which is what actually bounds cache_read. Measured 2026-09-15:
  // 5.70B cache_read across 265 sessions with only 6 compactions ever fired.
  const DEFAULT_THRESHOLD_PERCENT = 80

  export function limit(input: { cfg: Config.Info; model: Provider.Model; usable: number }) {
    const configured = input.cfg.compaction?.threshold_percent
    const context = input.model.limit.input || input.model.limit.context
    if (context === 0) return input.usable

    // nocowboy_change - a context profile budgets how much of the window may be
    // used: deep raises the threshold to its fraction only on a large enough
    // window (and never beyond `usable` = limit.input - reserved), compact
    // narrows it. Without a profile the previous behaviour is unchanged.
    let percent = typeof configured === "number" ? configured : DEFAULT_THRESHOLD_PERCENT
    const requested = input.cfg.context_profile
    if (requested) {
      const resolved = resolveContextProfile({
        requested,
        modelContext: context,
        budgetMaxTokens: input.cfg.budget?.max_tokens,
      })
      if (resolved.downgradedFrom) {
        profileLog.warn(
          `context profile "${resolved.downgradedFrom}" downgraded to "${resolved.profile}": ${resolved.reason}`,
        )
      }
      const profilePercent = resolved.fraction * 100
      percent = resolved.profile === "deep" ? profilePercent : Math.min(percent, profilePercent)
    }

    const cap = Math.floor(context * (percent / 100))
    return Math.min(input.usable, cap)
  }
  // nocowboy_change end

  export function measure(input: Payload) {
    let extra = 0
    const normalized = JSON.stringify(input.messages, function (this: unknown, key, value: unknown) {
      if (!["data", "url", "image"].includes(key)) return value
      if (!this || typeof this !== "object" || !("type" in this)) return value
      if (!["file", "image", "media"].includes(String(this.type))) return value
      const tokens =
        value instanceof Uint8Array
          ? Math.ceil(value.byteLength / 4)
          : Token.estimate(typeof value === "string" ? value : (JSON.stringify(value) ?? ""))
      extra += Math.max(0, tokens - MEDIA_TOKENS)
      return MEDIA
    })
    const messages = Token.estimate(normalized)
    const raw = messages + extra
    const tools = Token.estimate(
      JSON.stringify(
        Object.entries(input.tools).map(([name, tool]) => ({
          name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      ),
    )
    return {
      normalized: Math.ceil((messages + tools) * FACTOR),
      raw: Math.ceil((raw + tools) * FACTOR),
      continuation: continued(input.messages),
    }
  }

  export function enabled(input: { cfg: Config.Info; model: Provider.Model }) {
    // nocowboy_change - no longer require an explicit threshold_percent: limit() now defaults to 80%
    // of the window, so preflight compaction is on for every auto-compaction model.
    return input.cfg.compaction?.auto !== false && input.model.limit.context !== 0
  }

  export function shouldCompact(
    input: {
      cfg: Config.Info
      model: Provider.Model
      usable: number
    } & (Payload | { tokens: number; continuation: boolean }),
  ) {
    if (!enabled(input)) return false
    const stats = "tokens" in input ? input : measure(input)
    if (stats.continuation) return false
    const tokens = "tokens" in stats ? stats.tokens : stats.normalized
    return tokens >= limit(input)
  }

  // ---------------------------------------------------------------------------
  // Context pressure detection (adapted from MiMo session/overflow.ts)
  // ---------------------------------------------------------------------------

  /**
   * Compute the usable context window for a model: context - output reserve - compaction buffer.
   */
  export function usable(input: { cfg: Config.Info; model: Provider.Model }) {
    const context = input.model.limit.context
    if (context === 0) return 0

    const reserved =
      input.cfg.compaction?.reserved ?? Math.min(COMPACTION_BUFFER, input.model.limit.output || OUTPUT_CAP)
    const outputReserve = Math.min(input.model.limit.output || OUTPUT_CAP, OUTPUT_CAP)

    return input.model.limit.input
      ? Math.max(0, input.model.limit.input - reserved)
      : Math.max(0, context - outputReserve - reserved)
  }

  /**
   * Returns true when the session's token count exceeds the usable window.
   */
  export function isOverflow(input: { cfg: Config.Info; tokens: MessageV2.Assistant["tokens"]; model: Provider.Model }) {
    if (input.cfg.compaction?.auto === false) return false
    if (input.model.limit.context === 0) return false

    const tokenCount =
      input.tokens.total || input.tokens.input + input.tokens.output + input.tokens.cache.read + input.tokens.cache.write
    return tokenCount >= usable(input)
  }

  /**
   * Returns a pressure level 0-3 based on how full the context window is.
   *   0: < 50%  — no pressure
   *   1: 50-70% — mild pressure
   *   2: 70-85% — moderate pressure
   *   3: > 85%  — high pressure, compaction recommended
   */
  export function pressureLevel(input: {
    cfg: Config.Info
    tokens: MessageV2.Assistant["tokens"]
    model: Provider.Model
  }): 0 | 1 | 2 | 3 {
    if (input.cfg.compaction?.auto === false) return 0
    if (input.model.limit.context === 0) return 0

    const tokenCount =
      input.tokens.total ||
      input.tokens.input + input.tokens.output + input.tokens.cache.read + input.tokens.cache.write
    const limitValue = usable(input)
    if (limitValue === 0) return 0

    const ratio = tokenCount / limitValue
    if (ratio < 0.5) return 0
    if (ratio < 0.7) return 1
    if (ratio < 0.85) return 2
    return 3
  }
}
