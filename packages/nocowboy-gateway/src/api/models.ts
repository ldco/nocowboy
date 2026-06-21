export type KiloModelsOptions = {
  kilocodeToken?: string
  kilocodeOrganizationId?: string
}

export type KiloModelsError = {
  kind: string
  status?: number
}

export type NoCowboyModelsResult = {
  models: Record<string, any>
  error?: KiloModelsError
}

export async function fetchNoCowboyModels(opts?: KiloModelsOptions): Promise<NoCowboyModelsResult> {
  return { models: {} }
}
