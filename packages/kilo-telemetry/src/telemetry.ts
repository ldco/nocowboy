export interface TelemetryProperties { [key: string]: unknown }
export type ReviewCommand = string

export namespace Telemetry {
  export async function init() {}
  export function setEnabled() {}
  export function isEnabled(): boolean { return false }
  export async function updateIdentity() {}
  export function track(_event: string, _props?: TelemetryProperties) {}
  export function trackCliStart() {}
  export function trackCliExit() {}
  export function trackSessionStart() {}
  export function trackSessionEnd() {}
  export function trackSessionMessage() {}
  export function trackLlmCompletion() {}
  export function trackCommandUsed() {}
  export function trackToolUsed() {}
  export function trackAgentUsed() {}
  export function trackPlanFollowup() {}
  export function trackSuggestionAccepted() {}
  export function trackSuggestionShown() {}
  export function trackIndexingStarted(_data: { trigger: string; source: string; mode?: string; provider: string; vectorStore: string; modelId?: string }) {}
  export function trackIndexingCompleted(_data: { trigger: string; source: string; mode: string; provider: string; vectorStore: string; modelId?: string; filesIndexed: number; filesDiscovered: number; totalBlocks: number; batchErrors: number }) {}
  export function trackIndexingFileCount(_data: { source: string; mode: string; provider: string; vectorStore: string; modelId?: string; discovered: number; candidate: number }) {}
  export function trackIndexingBatchRetry(_data: { source: string; mode: string; provider: string; vectorStore: string; modelId?: string; attempt: number; maxRetries: number; batchSize: number; error: string }) {}
  export function trackIndexingError(_data: { source: string; trigger?: string; mode?: string; provider: string; vectorStore: string; modelId?: string; location: string; error: string; retryCount?: number; maxRetries?: number }) {}
  export function trackShareCreated() {}
  export function trackShareDeleted() {}
  export function trackMcpServerConnected() {}
  export function trackMcpServerError() {}
  export function trackRemoteConnectionOpened() {}
  export function trackAuthSuccess() {}
  export function trackAuthLogout() {}
  export function trackError() {}
  export function trackFeedback() {}
  export async function shutdown() {}
}
