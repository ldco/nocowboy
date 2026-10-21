import { afterEach, describe, expect, test } from "bun:test"
import { existsSync } from "fs"
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import {
  resolveCoreRuntimeWasmPath,
  resolveLanguageWasmPath,
  resolveModulePath,
} from "../../../src/tree-sitter/languageParser"

const env = "KILO_TREE_SITTER_WASM_DIR"
const prev = process.env[env]

describe("tree-sitter WASM resolution", () => {
  afterEach(() => {
    if (prev === undefined) delete process.env[env]
    if (prev !== undefined) process.env[env] = prev
  })

  test("prefers installed CLI tree-sitter resources over module resolution", async () => {
    const root = await mkdtemp(join(tmpdir(), "kilo-tree-sitter-wasm-"))
    try {
      const dir = join(root, "bin", "tree-sitter")
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, "tree-sitter.wasm"), "runtime")
      await writeFile(join(dir, "tree-sitter-typescript.wasm"), "language")

      process.env[env] = dir

      expect(resolveCoreRuntimeWasmPath()).toBe(join(dir, "tree-sitter.wasm"))
      expect(resolveLanguageWasmPath("typescript").wasmPath).toBe(join(dir, "tree-sitter-typescript.wasm"))
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test("resolves runtime and language WASMs from a sidecar tree-sitter directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "kilo-tree-sitter-sidecar-"))
    try {
      const dir = join(root, "tree-sitter")
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, "tree-sitter.wasm"), "runtime")
      await writeFile(join(dir, "tree-sitter-go.wasm"), "language")

      // This is the layout the release archive ships next to the binary:
      // <install dir>/nocowboy + <install dir>/tree-sitter/*.wasm
      expect(resolveCoreRuntimeWasmPath(root)).toBe(join(dir, "tree-sitter.wasm"))
      expect(resolveLanguageWasmPath("go", root).wasmPath).toBe(join(dir, "tree-sitter-go.wasm"))
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test("never hands out a module path that does not exist on disk", () => {
    // `require.resolve` inside a compiled Bun binary reports build-time paths,
    // which survive a moved/deleted source tree. Such a path must be rejected
    // instead of being passed to Parser.init() and failing with ENOENT.
    expect(resolveModulePath("web-tree-sitter/no-such-asset.wasm")).toBeUndefined()

    const resolved = resolveModulePath("web-tree-sitter/tree-sitter.wasm")
    expect(resolved === undefined || existsSync(resolved)).toBe(true)
  })

  test("missing language WASM yields no path but reports searched directories", () => {
    const result = resolveLanguageWasmPath("definitely-not-a-language")
    expect(result.wasmPath).toBeUndefined()
    expect(result.searchedPaths.length).toBeGreaterThan(0)
  })
})
