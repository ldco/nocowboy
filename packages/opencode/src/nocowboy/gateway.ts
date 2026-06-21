// Kilo gateway removed. These stubs exist for import compatibility only.
// All real gateway functionality (api.kilo.ai) is dead.

export const ENV_KILO_API_URL = "KILO_API_URL"
export const KILO_API_BASE = ""
export const KILO_OPENROUTER_BASE = ""
export const ENV_FEATURE = "KILOCODE_FEATURE"
export const ENV_VERSION = "KILOCODE_VERSION"
export const HEADER_FEATURE = "X-KILOCODE-FEATURE"
export const HEADER_ORGANIZATIONID = "X-KILOCODE-ORGANIZATIONID"
export const HEADER_EDITORNAME = "X-KILOCODE-EDITORNAME"
export const HEADER_MACHINEID = "X-KILOCODE-MACHINEID"
export const HEADER_PROJECTID = "X-KILOCODE-PROJECTID"
export const HEADER_TESTER = "X-KILOCODE-TESTER"
export const HEADER_TASKID = "X-KILOCODE-TASKID"
export const HEADER_PARENT_TASKID = "X-KILOCODE-PARENT-TASKID"
export const AI_SDK_PROVIDERS = [
  "alibaba", "anthropic", "mistral", "openai",
  "openai-compatible", "openrouter",
] as const
export const PROMPTS = [
  "codex", "gemini", "beast", "anthropic",
  "trinity", "anthropic_without_todo", "ling", "gpt55",
] as const

export type Organization = { id: string; name: string; role?: string }
export type KilocodeProfile = { id: string; email?: string; name?: string; organizations?: Organization[] }
export type KilocodeBalance = { credits?: number; usage?: number; balance?: number }
export type OrganizationMode = { id: string; name: string; description?: string }
export type OrganizationModeConfig = { modes: OrganizationMode[] }
export type KiloProvider = { id: string }
export type KiloModelsResult = { models: Record<string, any>; error?: string }

export const resolveKiloGatewayBaseUrl = () => undefined as string | undefined

// All func returns null/undefined — the backend is gone.
export const fetchProfile = async (_opts?: any) => null
export const fetchBalance = async (_opts?: any) => null
export const fetchProfileWithBalance = async (_opts?: any) => null
export const fetchDefaultModel = async (_opts?: any) => null
export const getKiloProfile = () => null
export const getKiloBalance = () => null
export const getKiloDefaultModel = () => null
export const fetchKiloModels = async (_sessionID?: string, _opts?: any) => [{ models: {} as Record<string, any> }, null] as const
export const fetchOrganizationModes = async (_opts1?: any, _opts2?: any) => [] as { id: string; name: string }[]
export const createKilo = (_opts?: any) => ({ models: [] })
export const fetchKiloEmbeddingModelCatalog = async (_opts?: any) => ({ models: [], defaultModel: "", aliases: [] }) as { models: any[]; defaultModel: string; aliases: string[] }
export const promptOrganizationSelection = async () => null
export const migrateLegacyKiloAuth = () => {}
