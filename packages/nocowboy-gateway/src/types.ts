export interface Organization { id: string; name: string; role?: string }
export interface NoCowboyProfile { id: string; email?: string; name?: string; organizations?: Organization[] }
export interface NoCowboyBalance { credits?: number; usage?: number; balance?: number }
export interface NoCowboyProviderOptions { apiKey?: string; model?: string; baseUrl?: string }
export interface NoCowboyMetadata { [key: string]: unknown }
export type LanguageModelV3 = { id: string; name: string; provider: string; capabilities?: string[] }
export type DeviceAuthInitiateResponse = { deviceCode: string; userCode: string; verificationUri: string; interval: number }
export type DeviceAuthPollResponse = { status: string; token?: string }
export type PollOptions = { interval: number; timeout: number }
export type PollResult = { status: string; token?: string }
export type NoCowboyProvider = { id: string }
export type CustomLoaderResult = { models?: LanguageModelV3[]; defaultModel?: string }
export type ProviderInfo = { id: string; name: string }
export type OrganizationMode = { id: string; name: string; description?: string }
export type OrganizationModeConfig = { modes: OrganizationMode[] }
