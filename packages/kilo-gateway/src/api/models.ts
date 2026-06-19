export type KiloModelsOptions = {
  kilocodeToken?: string
  kilocodeOrganizationId?: string
}

export type KiloModelsError = {
  kind: string
  status?: number
}

export type KiloModelsResult = {
  models: Record<string, any>
  error?: KiloModelsError
}

export async function fetchKiloModels(opts?: KiloModelsOptions): Promise<KiloModelsResult> {
  return { models: {} }
}
