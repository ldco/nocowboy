export const DIRECT_EDIT_ENV: Record<string, string[]> = {}
export type EditTarget = string
export interface EditUpstreamResponse {}
export function resolveEditTarget(): EditTarget | undefined { return undefined }
export function extractFencedBody(): string | undefined { return undefined }
