import { pathToFileURL } from "url"

export const INDEXING_PLUGIN = "@nocowboy/indexing"

type ConfigLike = {
  indexing?: { enabled?: boolean }
}

type Req = {
  resolve: (id: string) => string
}

type LogLike = {
  debug: (msg: string, data?: Record<string, unknown>) => void
}

export function indexingEnabled(config?: ConfigLike | null): boolean {
  return config?.indexing?.enabled === true
}

export function resolveIndexingPlugin(req: Req, log?: LogLike): string {
  try {
    const file = req.resolve(INDEXING_PLUGIN)
    return pathToFileURL(file).href
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    log?.debug("failed to resolve indexing plugin package, using package marker", { error })
    return INDEXING_PLUGIN
  }
}
