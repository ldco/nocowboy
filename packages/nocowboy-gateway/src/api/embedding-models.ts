type KiloEmbeddingModel = { id: string; name: string; dimension: number; scoreThreshold: number }
type KiloEmbeddingModelCatalog = {
  defaultModel: string | undefined
  models: KiloEmbeddingModel[]
  aliases: Record<string, string>
  issues: never[]
}

export const EMPTY_KILO_EMBEDDING_MODEL_CATALOG: KiloEmbeddingModelCatalog = { models: [], issues: [], aliases: {}, defaultModel: "" }

const MAX_ATTEMPTS = 3

export async function fetchNoCowboyEmbeddingModelCatalog(opts?: { baseURL?: string; token?: string; attempts?: number; onError?: (issue: { code: string; message: string; status: number }) => void }): Promise<KiloEmbeddingModelCatalog> {
  if (!opts?.baseURL) return EMPTY_KILO_EMBEDDING_MODEL_CATALOG

  const base = opts.baseURL.endsWith("/") ? opts.baseURL : `${opts.baseURL}/`
  const url = new URL("api/gateway/embedding-models", base)
  const maxAttempts = Math.min(opts.attempts ?? MAX_ATTEMPTS, MAX_ATTEMPTS)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url.href, {
        headers: opts.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
        redirect: "error",
      })
      if (!res.ok) {
        opts.onError?.({ code: "http", message: `Unable to load Kilo embedding models (HTTP ${res.status}).`, status: res.status })
        if (attempt < maxAttempts - 1) continue
        return EMPTY_KILO_EMBEDDING_MODEL_CATALOG
      }
      return await res.json() as KiloEmbeddingModelCatalog
    } catch {
      if (attempt < maxAttempts - 1) continue
      return EMPTY_KILO_EMBEDDING_MODEL_CATALOG
    }
  }

  return EMPTY_KILO_EMBEDDING_MODEL_CATALOG
}
