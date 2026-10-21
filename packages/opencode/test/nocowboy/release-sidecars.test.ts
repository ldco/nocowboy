import { afterEach, describe, expect, test } from "bun:test"
import fs from "fs/promises"
import os from "os"
import path from "path"
import {
  RELEASE_SIDECARS,
  SIDECARS_MANIFEST,
  copyReleaseSidecars,
  writeSidecarManifest,
} from "../../script/nocowboy/release-sidecars"

const roots: string[] = []

async function tmp() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "nocowboy-release-sidecars-"))
  roots.push(dir)
  return dir
}

async function writeSidecars(binDir: string) {
  await fs.mkdir(path.join(binDir, "tree-sitter"), { recursive: true })
  await fs.writeFile(path.join(binDir, "tree-sitter", "tree-sitter.wasm"), "runtime")
  await fs.writeFile(path.join(binDir, "tree-sitter", "tree-sitter-typescript.wasm"), "typescript")
  await fs.writeFile(path.join(binDir, "models-snapshot.json"), "{}")
  await fs.writeFile(path.join(binDir, "proxy-standalone.mjs"), "// proxy")
}

describe("release sidecars", () => {
  afterEach(async () => {
    while (roots.length) await fs.rm(roots.pop()!, { recursive: true, force: true })
  })

  test("copies every sidecar the binary loads from its own directory", async () => {
    const root = await tmp()
    const binDir = path.join(root, "bin")
    const dest = path.join(root, "install")
    await writeSidecars(binDir)

    await copyReleaseSidecars(binDir, dest)

    expect(await fs.readFile(path.join(dest, "tree-sitter", "tree-sitter.wasm"), "utf8")).toBe("runtime")
    expect(await fs.readFile(path.join(dest, "tree-sitter", "tree-sitter-typescript.wasm"), "utf8")).toBe("typescript")
    expect(await fs.readFile(path.join(dest, "models-snapshot.json"), "utf8")).toBe("{}")
    expect(await fs.readFile(path.join(dest, "proxy-standalone.mjs"), "utf8")).toBe("// proxy")
  })

  test("replaces stale sidecars instead of merging into them", async () => {
    const root = await tmp()
    const binDir = path.join(root, "bin")
    const dest = path.join(root, "install")
    await writeSidecars(binDir)
    await fs.mkdir(path.join(dest, "tree-sitter"), { recursive: true })
    await fs.writeFile(path.join(dest, "tree-sitter", "tree-sitter-stale.wasm"), "stale")

    await copyReleaseSidecars(binDir, dest)

    expect(await fs.readdir(path.join(dest, "tree-sitter"))).not.toContain("tree-sitter-stale.wasm")
  })

  test("fails loudly when the build did not produce a sidecar", async () => {
    const root = await tmp()
    const binDir = path.join(root, "bin")
    const dest = path.join(root, "install")
    await writeSidecars(binDir)
    await fs.rm(path.join(binDir, RELEASE_SIDECARS[0]), { recursive: true, force: true })

    await expect(copyReleaseSidecars(binDir, dest)).rejects.toThrow("Missing release sidecar")
  })

  test("leaves an installed copy untouched when a sidecar is missing", async () => {
    const root = await tmp()
    const binDir = path.join(root, "bin")
    const dest = path.join(root, "install")
    await writeSidecars(binDir)
    await fs.mkdir(path.join(dest, "tree-sitter"), { recursive: true })
    await fs.writeFile(path.join(dest, "tree-sitter", "tree-sitter.wasm"), "previous")
    await fs.rm(path.join(binDir, "models-snapshot.json"))

    await expect(copyReleaseSidecars(binDir, dest)).rejects.toThrow("Missing release sidecar")
    expect(await fs.readFile(path.join(dest, "tree-sitter", "tree-sitter.wasm"), "utf8")).toBe("previous")
  })

  test("does not leave staging or backup artifacts behind", async () => {
    const root = await tmp()
    const binDir = path.join(root, "bin")
    const dest = path.join(root, "install")
    await writeSidecars(binDir)
    await fs.mkdir(path.join(dest, "tree-sitter"), { recursive: true })
    await fs.writeFile(path.join(dest, "tree-sitter", "tree-sitter.wasm"), "previous")

    await copyReleaseSidecars(binDir, dest)

    const entries = await fs.readdir(dest)
    expect(entries.some((entry) => entry.includes(".new-") || entry.includes(".old-"))).toBe(false)
    expect(entries.sort()).toEqual([...RELEASE_SIDECARS].sort())
  })

  test("writes the sidecar manifest install.sh reads", async () => {
    const root = await tmp()
    await writeSidecarManifest(root)

    expect(await fs.readFile(path.join(root, SIDECARS_MANIFEST), "utf8")).toBe(
      `${RELEASE_SIDECARS.join("\n")}\n`,
    )
  })
})
