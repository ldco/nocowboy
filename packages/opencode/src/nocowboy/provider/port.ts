/**
 * ProviderPort — the transport boundary for outbound provider HTTP.
 *
 * Balance/credit fetches each built their own `fetch` call and passed
 * `tls: { rejectUnauthorized: false }` unconditionally. That turned "accept any
 * certificate" into the default transport contract for every provider — a TLS
 * workaround leaked into the domain. A ProviderPort owns the boundary policy
 * (baseURL, proxy, TLS), so the insecure flag is an explicit opt-in and a
 * default port carries no `tls` override at all.
 *
 * The same module converts the shared models.dev model schema into domain
 * descriptors at the edge, so the external `Record<string, unknown>` shape does
 * not leak inward: capabilities, billing identity and the wire protocol are
 * separate domain types, not one amorphous blob.
 *
 * Like {@link ../../git/git-port}, the port is dependency-free and pure where
 * possible so policy and converters are unit-testable without any network.
 */

// ---------------------------------------------------------------------------
// Transport policy
// ---------------------------------------------------------------------------

export interface ProviderTransportPolicy {
  /** Provider API base URL, normalized (no trailing slash). Undefined → provider default. */
  baseURL?: string
  /** Explicit proxy URL. Also sourced from NOCOWBOY_PROXY / HTTPS_PROXY / HTTP_PROXY. */
  proxy?: string
  /**
   * Opt-in to skip TLS certificate verification. NEVER the default: a request
   * built from a port without it carries no `tls` override (verification on).
   */
  insecureTLS?: boolean
}

export interface ProviderPort {
  readonly id: string
  readonly transport: ProviderTransportPolicy
}

export interface ProviderPortInput {
  id: string
  baseURL?: string
  proxy?: string
  insecureTLS?: boolean
  /** Environment source for proxy/TLS opt-in; defaults to `process.env`. */
  env?: Record<string, string | undefined>
}

/** Strip whitespace and trailing slashes; empty/absent becomes undefined. */
export function normalizeBaseURL(baseURL: string | undefined): string | undefined {
  if (!baseURL) return undefined
  const trimmed = baseURL.trim()
  if (trimmed.length === 0) return undefined
  return trimmed.replace(/\/+$/, "")
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const normalized = normalizeBaseURL(value)
    if (normalized) return normalized
  }
  return undefined
}

/** The explicit opt-in env var for skipping TLS verification. */
export const INSECURE_TLS_ENV = "NOCOWBOY_INSECURE_TLS"

/**
 * Resolve a ProviderPort from explicit input and the environment.
 *
 * Proxy precedence: explicit `proxy` → NOCOWBOY_PROXY → HTTPS_PROXY/`https_proxy`
 * → HTTP_PROXY/`http_proxy`. TLS is insecure ONLY when `insecureTLS === true` or
 * the explicit opt-in `NOCOWBOY_INSECURE_TLS=1` is set.
 */
export function resolveProviderPort(input: ProviderPortInput): ProviderPort {
  const env = input.env ?? process.env
  const proxy = firstNonEmpty(
    input.proxy,
    env.NOCOWBOY_PROXY,
    env.HTTPS_PROXY,
    env.https_proxy,
    env.HTTP_PROXY,
    env.http_proxy,
  )
  const insecureTLS = input.insecureTLS === true || env[INSECURE_TLS_ENV] === "1"
  return {
    id: input.id,
    transport: {
      baseURL: normalizeBaseURL(input.baseURL),
      ...(proxy ? { proxy } : {}),
      ...(insecureTLS ? { insecureTLS: true } : {}),
    },
  }
}

/** Fetch init carrying the Bun/native TLS + proxy options the port decides. */
export interface ProviderRequestInit extends RequestInit {
  /** Present ONLY when the port explicitly opted into insecure TLS. */
  tls?: { rejectUnauthorized: boolean }
  /** Present ONLY when a proxy was configured. */
  proxy?: string
}

/**
 * Build the `fetch` init for a provider request.
 *
 * `tls.rejectUnauthorized: false` is attached ONLY when the port opted in
 * (`insecureTLS: true`); a default port produces an init with no `tls` key at
 * all, so certificate verification stays on.
 */
export function requestInit(port: ProviderPort, headers: Record<string, string>): ProviderRequestInit {
  const init: ProviderRequestInit = { headers }
  if (port.transport.insecureTLS) init.tls = { rejectUnauthorized: false }
  if (port.transport.proxy) init.proxy = port.transport.proxy
  return init
}

/** Join a base URL (from the port) with a path, tolerating an unset base. */
export function joinURL(baseURL: string | undefined, fallbackHost: string, path: string): string {
  const base = normalizeBaseURL(baseURL) ?? normalizeBaseURL(fallbackHost) ?? fallbackHost
  const suffix = path.startsWith("/") ? path : `/${path}`
  return `${base}${suffix}`
}

// ---------------------------------------------------------------------------
// Domain boundary — the shared model schema is converted here, not passed on
// ---------------------------------------------------------------------------

/** Booleans a model advertises. Separated from billing and protocol. */
export interface CapabilityMetadata {
  toolCall: boolean
  reasoning: boolean
  attachment: boolean
  temperature: boolean
}

/** How a provider is spoken to on the wire. Separated from capabilities/billing. */
export type GenerationProtocol = "openai" | "anthropic" | "google" | "unknown"

/** Billing identity: currency and availability, separate from capabilities. */
export interface BillingInfo {
  currency: string
  status: "ok" | "unknown"
  amount?: number
  reason?: string
}

export function generationProtocolOf(api: string | undefined): GenerationProtocol {
  const value = (api ?? "").toLowerCase()
  if (value.includes("anthropic")) return "anthropic"
  if (value.includes("google") || value.includes("gemini") || value.includes("vertex")) return "google"
  if (value.includes("openai") || value.includes("compatible") || value.includes("openrouter")) return "openai"
  return "unknown"
}

/** A model in the domain: no shared `Record<string, unknown>` shape survives. */
export interface ModelDescriptor {
  id: string
  name: string
  family?: string
  capabilities: CapabilityMetadata
  protocol: GenerationProtocol
  billing: BillingInfo
  contextLimit?: number
  outputLimit?: number
}

function requiredText(value: unknown, name: string): string {
  if (typeof value === "string" && value.length > 0) return value
  throw new Error(`${name} must be a non-empty string`)
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function optionalFinite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

/**
 * Extract billing identity from a shared model entry's `cost` block.
 *
 * The cost is denominated in the model's currency (USD when unspecified); a
 * model with no numeric input cost is `unknown`, never a fabricated 0.
 */
export function billingInfoOf(raw: Record<string, unknown>): BillingInfo {
  const currency = optionalText(raw.currency) ?? "USD"
  const cost = raw.cost as { input?: unknown } | undefined
  const amount = optionalFinite(cost?.input)
  if (amount === undefined) return { currency, status: "unknown", reason: "no cost in shared schema" }
  return { currency, status: "ok", amount }
}

/**
 * Convert one model from the shared models.dev schema into a domain descriptor.
 *
 * Validates at the boundary (throws on a malformed entry) so callers never
 * carry untyped shared fields, and separates the entry's capabilities, billing
 * identity and generation protocol into distinct domain types.
 */
export function toModelDescriptor(raw: Record<string, unknown>, api?: string): ModelDescriptor {
  const limit = raw.limit as { context?: unknown; output?: unknown } | undefined
  const descriptor: ModelDescriptor = {
    id: requiredText(raw.id, "model.id"),
    name: requiredText(raw.name, "model.name"),
    capabilities: {
      toolCall: raw.tool_call === true,
      reasoning: raw.reasoning === true,
      attachment: raw.attachment === true,
      temperature: raw.temperature === true,
    },
    protocol: generationProtocolOf(api),
    billing: billingInfoOf(raw),
  }
  const family = optionalText(raw.family)
  if (family) descriptor.family = family
  const context = optionalFinite(limit?.context)
  if (context !== undefined) descriptor.contextLimit = context
  const output = optionalFinite(limit?.output)
  if (output !== undefined) descriptor.outputLimit = output
  return descriptor
}

/**
 * Convert a whole shared snapshot (`{ providerID: { api, models } }`) into
 * domain descriptors. Invalid entries are skipped rather than failing the load:
 * the snapshot is a best-effort offline fallback.
 */
export function toModelDescriptors(snapshot: Record<string, unknown>): ModelDescriptor[] {
  const out: ModelDescriptor[] = []
  for (const provider of Object.values(snapshot)) {
    if (typeof provider !== "object" || provider === null) continue
    const record = provider as Record<string, unknown>
    const api = optionalText(record.api)
    const models = record.models
    if (typeof models !== "object" || models === null) continue
    for (const model of Object.values(models as Record<string, unknown>)) {
      if (typeof model !== "object" || model === null) continue
      try {
        out.push(toModelDescriptor(model as Record<string, unknown>, api))
      } catch {
        // Skip a malformed entry instead of failing the whole snapshot.
      }
    }
  }
  return out
}
