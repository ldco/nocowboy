// nocowboy_change - new file
//
// Kilo-specific provider logic extracted from packages/opencode/src/provider/provider.ts
// to minimize merge conflicts with upstream opencode.
//
// This module exports patch functions and data that the upstream provider.ts
// calls at well-defined injection points (each marked with nocowboy_change).

import { createNoCowboy, type NoCowboyProvider as KiloProvider, AI_SDK_PROVIDERS, PROMPTS } from "@nocowboy/gateway"
import { DEFAULT_HEADERS } from "@/nocowboy/const"
import { ProviderID, ModelID } from "@/provider/schema"
import { optionalOmitUndefined } from "@opencode-ai/core/schema"
import { Effect, Schema } from "effect"
import type { LanguageModelV3 } from "@ai-sdk/provider"

type KiloSDK = {
  languageModel(modelId: string): LanguageModelV3
  alibaba(modelId: string): LanguageModelV3
  anthropic(modelId: string): LanguageModelV3
  mistral(modelId: string): LanguageModelV3
  openai(modelId: string): LanguageModelV3
  openaiCompatible(modelId: string): LanguageModelV3
}
import { mapValues, omit, pickBy } from "remeda"

/** Default timeout (ms) for provider HTTP requests (connection phase). */
export const REQUEST_TIMEOUT_MS = 300_000 // 5 minutes

// ---------------------------------------------------------------------------
// Bundled providers
// ---------------------------------------------------------------------------

type BundledSDK = { languageModel(modelId: string): LanguageModelV3 }

export const KILO_BUNDLED_PROVIDERS: Record<string, () => Promise<(options: Record<string, unknown>) => BundledSDK>> = {
  "@nocowboy/gateway": async () => createNoCowboy as unknown as (options: Record<string, unknown>) => BundledSDK,
}

// ---------------------------------------------------------------------------
// Model schema extensions  (spread into Provider.Model Schema.Struct)
// ---------------------------------------------------------------------------

export const KILO_MODEL_SCHEMA_EXTENSIONS = {
  recommendedIndex: optionalOmitUndefined(Schema.Finite),
  prompt: Schema.optional(Schema.Literals(PROMPTS)),
  isFree: Schema.optional(Schema.Boolean),
  mayTrainOnYourPrompts: Schema.optional(Schema.Boolean),
  terminalBench: optionalOmitUndefined(
    Schema.Struct({
      overallScore: Schema.Finite,
      avgAttemptCostUsd: Schema.Finite,
    }),
  ),
  ai_sdk_provider: Schema.optional(Schema.Literals(AI_SDK_PROVIDERS)),
}

// ---------------------------------------------------------------------------
// fromModelsDevModel patch — returns kilo-specific fields
// ---------------------------------------------------------------------------

export function patchModelsDevModel(providerID: string, source: Record<string, unknown>) {
  return {
    variants: providerID === "nocowboy" ? (source.variants ?? {}) : {},
    recommendedIndex: source.recommendedIndex,
    prompt: source.prompt,
    isFree: source.isFree,
    mayTrainOnYourPrompts: source.mayTrainOnYourPrompts,
    terminalBench: source.terminalBench,
    ai_sdk_provider: source.ai_sdk_provider,
    options: source.options ?? {},
  }
}

// ---------------------------------------------------------------------------
// Config model patch — merges kilo-specific fields from config + existing
// ---------------------------------------------------------------------------

type VariantEntry = { disabled?: boolean } & Record<string, unknown>

export function patchConfigModel(cfg: Record<string, unknown>, existing: Record<string, unknown> | undefined) {
  const variants = cfg.variants as Record<string, VariantEntry> | undefined
  return {
    recommendedIndex: cfg.recommendedIndex as number | undefined,
    prompt: cfg.prompt as string | undefined,
    isFree: cfg.isFree as boolean | undefined,
    mayTrainOnYourPrompts: cfg.mayTrainOnYourPrompts as boolean | undefined,
    terminalBench: existing?.terminalBench as { overallScore: number; avgAttemptCostUsd: number } | undefined,
    ai_sdk_provider: cfg.ai_sdk_provider as string | undefined,
    variants: variants
      ? mapValues(
          pickBy(variants, (v) => !!v && !v.disabled),
          (v) => omit(v, ["disabled"]),
        )
      : {},
  }
}

// ---------------------------------------------------------------------------
// Custom loaders (new or fully-replaced loaders)
// ---------------------------------------------------------------------------

type CustomDep = {
  auth: (id: string) => Effect.Effect<unknown>
  config: () => Effect.Effect<object>
  env: () => Effect.Effect<Record<string, string | undefined>>
  get: (key: string) => Effect.Effect<string | undefined>
}

// Mirrors upstream's CustomLoaderResult return type so Object.entries preserves proper typing
// discoverModels must stay `any` because it must match upstream's CustomDiscoverModels type
// (a complex generated type from Model schema) — our loaders never set it.
type CustomLoaderResult = {
  autoload: boolean
  getModel?: (sdk: Record<string, unknown>, modelID: string, options?: Record<string, unknown>) => Promise<unknown>
  vars?: (options: Record<string, unknown>) => Record<string, string>
  options?: Record<string, unknown>
  discoverModels?: any
}

type CustomLoader = (provider: Record<string, unknown>) => Effect.Effect<CustomLoaderResult, never, never>

function shouldUseCopilotResponsesApi(modelID: string): boolean {
  const match = /^gpt-(\d+)/.exec(modelID)
  if (!match) return false
  return Number(match[1]) >= 5 && !modelID.startsWith("gpt-5-mini")
}

function useLanguageModel(sdk: Record<string, unknown>) {
  return sdk.responses === undefined && sdk.chat === undefined
}

export function ncowboyCustomLoaders(dep: CustomDep): Record<string, CustomLoader> {
  return {
    "github-copilot-enterprise": () =>
      Effect.succeed({
        autoload: false,
        async getModel(sdk: Record<string, unknown>, modelID: string, _options?: Record<string, unknown>) {
          if (useLanguageModel(sdk)) return (sdk as Record<string, Function>).languageModel(modelID)
          return shouldUseCopilotResponsesApi(modelID)
            ? (sdk as Record<string, Function>).responses(modelID)
            : (sdk as Record<string, Function>).chat(modelID)
        },
        options: {},
      }),

    kilo: Effect.fnUntraced(function* (input: Record<string, unknown>) {
      const env = yield* dep.env()
      const inp = input as { env: string[]; id: string; models: Record<string, { ai_sdk_provider?: string }> }
      const hasKey = yield* Effect.gen(function* () {
        if (inp.env.some((item: string) => env[item])) return true
        if (yield* dep.auth(inp.id)) return true
        const cfg = (yield* dep.config()) as Record<string, unknown>
        const provider = cfg.provider as Record<string, unknown> | undefined
        const kiloCfg = provider?.["kilo"] as { options?: { apiKey?: string } } | undefined
        if (kiloCfg?.options?.apiKey) return true
        return false
      })

      const options: Record<string, string> = {}
      if (env.KILO_ORG_ID) {
        options.ncowboyOrganizationId = env.KILO_ORG_ID
      }
      if (!hasKey) {
        options.apiKey = "anonymous"
      }

      return {
        autoload: Object.keys(inp.models).length > 0,
        options,
        async getModel(sdk: KiloSDK, modelID: string) {
          const p = inp.models[modelID]?.ai_sdk_provider
          if (p === "alibaba") return sdk.alibaba(modelID)
          if (p === "anthropic") return sdk.anthropic(modelID)
          if (p === "mistral") return sdk.mistral(modelID)
          if (p === "openai") return sdk.openai(modelID)
          if (p === "openai-compatible") return sdk.openaiCompatible(modelID)
          return sdk.languageModel(modelID)
        },
      }
    }) as CustomLoader,

    // Override opencode to prevent auto-connecting without credentials
    opencode: () =>
      Effect.succeed({
        autoload: false,
        options: { headers: DEFAULT_HEADERS },
      }),
  }
}

// ---------------------------------------------------------------------------
// Post-processing for custom loader results
// Patches options/headers for providers whose upstream loaders we don't fully
// replace but where specific values differ (headers, branding, env vars).
// ---------------------------------------------------------------------------

export function patchCustomLoaderResult(
  providerID: string,
  result: { options?: Record<string, unknown> },
  env: Record<string, string | undefined>,
) {
  if (!result.options) return

  const opts = result.options as Record<string, unknown>

  switch (providerID) {
    case "openrouter":
    case "vercel":
    case "zenmux":
      opts.headers = { ...(opts.headers as Record<string, string> | undefined), ...DEFAULT_HEADERS }
      break
    case "cerebras":
      opts.headers = {
        ...(opts.headers as Record<string, string> | undefined),
        "X-Cerebras-3rd-Party-Integration": "kilo",
      }
      break
    case "azure": {
      // Extend env var lookup for Azure baseURL / resource name
      const url = (opts.baseURL as string | undefined) ?? env["AZURE_OPENAI_ENDPOINT"]
      const resource = (() => {
        const name = opts.resourceName as string | undefined
        if (typeof name === "string" && name.trim() !== "") return name
        return env["AZURE_RESOURCE_NAME"] ?? env["AZURE_OPENAI_RESOURCE_NAME"]
      })()
      if (url) {
        opts.baseURL = url
        delete opts.resourceName
      } else if (resource) {
        opts.resourceName = resource
        delete opts.baseURL
      }
      break
    }
    // gitlab User-Agent and cloudflare error message are patched inline
    // in provider.ts with single-line nocowboy_change markers
  }
}

// ---------------------------------------------------------------------------
// getSmallModel helpers
// ---------------------------------------------------------------------------

export function ncowboySmallModelPriority(providerID: string): string[] | undefined {
  if (providerID.startsWith("nocowboy")) return ["nocowboy-auto/small"]
  return undefined
}

// ---------------------------------------------------------------------------
// Fetch timeout wrapper
// Replaces AbortSignal.timeout() with a cancellable setTimeout+AbortController
// so the timer is cleared once response headers arrive. This prevents healthy
// streaming responses from being aborted mid-stream.
// ---------------------------------------------------------------------------

export function buildTimeoutSignal(options: Record<string, unknown>): {
  signal: AbortSignal | undefined
  clear: () => void
} {
  const ms = options["timeout"] ?? REQUEST_TIMEOUT_MS
  if (ms === false || ms === undefined || ms === null) return { signal: undefined, clear() {} }

  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new DOMException("The operation timed out.", "TimeoutError")),
    ms as number,
  )
  return {
    signal: controller.signal,
    clear() {
      clearTimeout(timer)
    },
  }
}
