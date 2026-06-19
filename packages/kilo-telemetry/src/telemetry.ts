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
  export function trackIndexingStarted() {}
  export function trackIndexingCompleted() {}
  export function trackIndexingFileCount() {}
  export function trackIndexingBatchRetry() {}
  export function trackIndexingError() {}
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
