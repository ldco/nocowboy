export type KiloModelsResult = { models: Array<{id: string; name:string; provider:string}> }
export async function fetchKiloModels(): Promise<KiloModelsResult> { return { models: [] } }
