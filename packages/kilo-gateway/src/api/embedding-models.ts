export const EMPTY_KILO_EMBEDDING_MODEL_CATALOG = { models: [], issues: [], aliases: {} as Record<string, string>, defaultModel: undefined as string | undefined }
export async function fetchKiloEmbeddingModelCatalog() { return EMPTY_KILO_EMBEDDING_MODEL_CATALOG }
