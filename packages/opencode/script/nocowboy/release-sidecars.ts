import fs from "fs/promises"
import path from "path"

// Runtime sidecars the compiled binary loads from `path.dirname(process.execPath)`:
// the tree-sitter WASMs (code indexing, shell parsing), the offline models
// snapshot and the MCP proxy. They must travel with the binary: a release that
// copies only the executable starts with broken code indexing and MCP proxies.
export const RELEASE_SIDECARS = ["tree-sitter", "models-snapshot.json", "proxy-standalone.mjs"] as const

/**
 * Name of the manifest written into release archives. `install.sh` reads the
 * sidecar list from it instead of re-typing the names, so a sidecar added to
 * `RELEASE_SIDECARS` cannot be silently skipped by the installer.
 */
export const SIDECARS_MANIFEST = "sidecars.manifest"

export async function writeSidecarManifest(toDir: string) {
  await fs.mkdir(toDir, { recursive: true })
  await fs.writeFile(path.join(toDir, SIDECARS_MANIFEST), `${RELEASE_SIDECARS.join("\n")}\n`)
}

/**
 * Replace `dest` atomically: stage next to it, move the previous copy aside,
 * rename the staged copy into place, then delete the backup. A crash or ENOSPC
 * leaves either the old or the new artifact, never a half-written one — the
 * installed CLI must not be left without its tree-sitter WASMs.
 */
async function replaceAtomically(src: string, dest: string) {
  const suffix = `.new-${process.pid}`
  const staged = `${dest}${suffix}`
  const backup = `${dest}.old-${process.pid}`
  await fs.rm(staged, { recursive: true, force: true })
  try {
    await fs.cp(src, staged, { recursive: true })
    await fs.rm(backup, { recursive: true, force: true })
    const existed = await fs.stat(dest).then(
      () => true,
      () => false,
    )
    if (existed) await fs.rename(dest, backup)
    try {
      await fs.rename(staged, dest)
    } catch (err) {
      if (existed) await fs.rename(backup, dest)
      throw err
    }
    if (existed) await fs.rm(backup, { recursive: true, force: true })
  } catch (err) {
    await fs.rm(staged, { recursive: true, force: true })
    throw err
  }
}

export async function copyReleaseSidecars(fromBinDir: string, toDir: string) {
  // Validate the complete set before touching the destination: a release must
  // not replace half of the sidecars and then abort on a missing one.
  const sources = await Promise.all(
    RELEASE_SIDECARS.map(async (name) => {
      const src = path.join(fromBinDir, name)
      const stats = await fs.stat(src).catch(() => undefined)
      if (!stats) throw new Error(`Missing release sidecar: ${src}`)
      return { name, src }
    }),
  )
  await fs.mkdir(toDir, { recursive: true })
  for (const { name, src } of sources) {
    await replaceAtomically(src, path.join(toDir, name))
  }
}
