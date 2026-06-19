export namespace Identity {
  export function setDataPath() {}
  export async function getMachineId(): Promise<string> { return "nocowboy-dev" }
  export function getDistinctId(): string { return "nocowboy-dev" }
  export function getUserId(): string | undefined { return undefined }
  export function getOrganizationId(): string | undefined { return undefined }
  export function setOrganizationId() {}
  export async function updateFromKiloAuth() {}
  export function reset() {}
}
