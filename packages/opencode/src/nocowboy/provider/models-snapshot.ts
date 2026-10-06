import path from "path"
import { parseModelsSnapshot } from "./models-snapshot-shape"
import { toModelDescriptors, type ModelDescriptor } from "./port"

const NAME = "models-snapshot.json"
const FILE = path.resolve(import.meta.dir, "../../provider/models-snapshot.json")

/**
 * Parse a snapshot and convert it at this boundary into domain descriptors, so
 * the external `Record<string, unknown>` shape never reaches a consumer.
 */
function parse(text: string, source: string): ModelDescriptor[] | undefined {
  try {
    return toModelDescriptors(parseModelsSnapshot(text, source).data)
  } catch (err) {
    console.warn(`Failed to load models snapshot from ${source}`, err)
    return undefined
  }
}

async function load(file: string) {
  const local = Bun.file(file)
  if (!(await local.exists())) return undefined
  return parse(await local.text(), file)
}

export async function loadModelsSnapshotFrom(files: readonly string[]) {
  for (const file of files) {
    const found = await load(file)
    if (found) return found
  }
  return undefined
}

export async function loadModelsSnapshot() {
  return loadModelsSnapshotFrom([path.join(path.dirname(process.execPath), NAME), FILE])
}
