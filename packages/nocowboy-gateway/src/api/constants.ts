/**
 * Kilo Gateway Configuration Constants
 * Centralized configuration for all API endpoints, headers, and settings
 */

/** Environment variable for custom Kilo API URL */
export const ENV_NOCOWBOY_API_URL = "NOCOWBOY_API_URL"

/** Default Kilo API URL */
export const DEFAULT_NOCOWBOY_API_URL = "https://api.kilo.ai"

/** Base URL for Kilo API - can be overridden by NOCOWBOY_API_URL env var */
export const NOCOWBOY_API_BASE = process.env[ENV_NOCOWBOY_API_URL] || DEFAULT_NOCOWBOY_API_URL

/** Environment variable for custom Kilo Chat URL */
export const NOCOWBOY_CHAT_URL_ENV = "NOCOWBOY_CHAT_URL"

/** Default Kilo Chat URL (REST endpoint for messages, conversations, etc.) */
export const NOCOWBOY_DEFAULT_CHAT_URL = "https://chat.kiloapps.io"

/** Base URL for Kilo Chat - can be overridden by NOCOWBOY_CHAT_URL env var */
export const NOCOWBOY_CHAT_URL = process.env[NOCOWBOY_CHAT_URL_ENV] || NOCOWBOY_DEFAULT_CHAT_URL

/** Environment variable for custom Event Service URL */
export const NOCOWBOY_EVENT_SERVICE_URL_ENV = "EVENT_SERVICE_URL"

/** Default Event Service URL (WebSocket endpoint for kilo-chat events) */
export const NOCOWBOY_DEFAULT_EVENT_SERVICE_URL = "wss://events.kiloapps.io"

/** Base URL for Event Service - can be overridden by EVENT_SERVICE_URL env var */
export const NOCOWBOY_EVENT_SERVICE_URL = process.env[NOCOWBOY_EVENT_SERVICE_URL_ENV] || NOCOWBOY_DEFAULT_EVENT_SERVICE_URL

/** Default base URL for OpenRouter-compatible endpoint */
export const NOCOWBOY_OPENROUTER_BASE = `${NOCOWBOY_API_BASE}/api/openrouter`

/** Device auth polling interval in milliseconds */
export const NOCOWBOY_POLL_INTERVAL_MS = 3000

/** Default model for authenticated users */
export const NOCOWBOY_DEFAULT_MODEL = "nocowboy-auto/free"

/** Default model for anonymous/free usage */
export const NOCOWBOY_DEFAULT_FREE_MODEL = "nocowboy-auto/free"

/** Token expiration duration in milliseconds (1 year) */
export const NOCOWBOY_TOKEN_EXPIRATION_MS = 365 * 24 * 60 * 60 * 1000

/** User-Agent header base value for requests */
export const NOCOWBOY_USER_AGENT_BASE = "nocowboy-provider"

/** Content-Type header value for requests */
export const NOCOWBOY_CONTENT_TYPE = "application/json"

/** Default provider name */
export const NOCOWBOY_DEFAULT_PROVIDER_NAME = "kilo"

/** Default API key for anonymous requests */
export const NOCOWBOY_ANONYMOUS_API_KEY = "anonymous"

/** Fetch timeout for model requests in milliseconds (10 seconds) */
export const NOCOWBOY_MODELS_FETCH_TIMEOUT_MS = 10 * 1000

/**
 * Header constants for NoCowboy API requests
 */
export const HEADER_NOCOWBOY_ORGANIZATIONID = "X-NOCOWBOY-ORGANIZATIONID"
export const HEADER_TASKID = "X-NOCOWBOY-TASKID"
export const HEADER_PARENT_TASKID = "X-NOCOWBOY-PARENT-TASKID"
export const HEADER_PROJECTID = "X-NOCOWBOY-PROJECTID"
export const HEADER_TESTER = "X-NOCOWBOY-TESTER"
export const HEADER_EDITORNAME = "X-NOCOWBOY-EDITORNAME"
export const HEADER_MACHINEID = "X-NOCOWBOY-MACHINEID"

/** Default editor name value */
export const NOCOWBOY_DEFAULT_EDITOR_NAME = "NoCowboy CLI"

/** Environment variable name for custom editor name */
export const ENV_EDITOR_NAME = "NOCOWBOY_EDITOR_NAME"

/** Environment variable name for version (set by CLI at startup) */
export const ENV_VERSION = "NOCOWBOY_VERSION"

/** Tester header value for suppressing warnings */
export const TESTER_SUPPRESS_VALUE = "SUPPRESS"

/** Header name for feature tracking */
export const HEADER_FEATURE = "X-NOCOWBOY-FEATURE"

/** Environment variable name for feature override */
export const ENV_FEATURE = "NOCOWBOY_FEATURE"

export const PROMPTS = [
  "codex",
  "gemini",
  "beast",
  "anthropic",
  "trinity",
  "anthropic_without_todo",
  "ling",
  "gpt55",
] as const

export const AI_SDK_PROVIDERS = [
  "alibaba",
  "anthropic",
  "mistral",
  "openai",
  "openai-compatible",
  "openrouter",
] as const
