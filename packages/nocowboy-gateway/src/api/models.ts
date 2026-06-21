export type ModelsOptions = {
  kilocodeToken?: string
  kilocodeOrganizationId?: string
}

export type ModelsError = {
  kind: string
  status?: number
}

export type NoCowboyModelsResult = {
  models: Record<string, any>
  error?: ModelsError
}

export async function fetchNoCowboyModels(opts?: ModelsOptions): Promise<NoCowboyModelsResult> {
  return { models: {} }
}
