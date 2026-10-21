import fs from "fs/promises"
import path from "path"

// Runtime sidecars the compiled binary loads from `path.dirname(process.execPath)`:
// the tree-sitter WASMs (code indexing, shell parsing), the offline models
// snapshot and the MCP proxy. They must travel with the binary: a release that
// copies only the executable starts with broken code indexing and MCP proxies.
export const RELEASE_SIDECARS = ["tree-sitter", "models-snapshot.json", "proxy-standalone.mjs"] as const

export async function copyReleaseSidecars(fromBinDir: string, toDir: string) {
  await fs.mkdir(toDir, { recursive: true })
  for (const name of RELEASE_SIDECARS) {
    const src = path.join(fromBinDir, name)
    const stats = await fs.stat(src).catch(() => undefined)
    if (!stats) throw new Error(`Missing release sidecar: ${src}`)
    const dest = path.join(toDir, name)
    await fs.rm(dest, { recursive: true, force: true })
    await fs.cp(src, dest, { recursive: true })
  }
}
