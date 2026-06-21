export class GatewayError extends Error { constructor(msg: string) { super(msg); this.name = "GatewayError" } }
export class UnauthorizedError extends Error { constructor(msg?: string) { super(msg); this.name = "UnauthorizedError" } }
export async function getOrganizationId() { return undefined }
export async function getClawChatCredentials() { return {} }
export async function getClawStatus() { return {} }
export async function getCloudSessions() { return { data: [] } }
export async function getNotifications() { return [] }
export async function getProfile() { return {} }
export async function getToken() { return undefined }
export async function setOrganization() { return {} }
