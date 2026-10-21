import * as path from "path"
import { existsSync } from "fs"
import type { Parser as ParserT, Language as LanguageT, Query as QueryT } from "web-tree-sitter"
import {
  javascriptQuery,
  typescriptQuery,
  tsxQuery,
  pythonQuery,
  rustQuery,
  goQuery,
  cppQuery,
  cQuery,
  csharpQuery,
  rubyQuery,
  javaQuery,
  phpQuery,
  htmlQuery,
  swiftQuery,
  kotlinQuery,
  cssQuery,
  ocamlQuery,
  solidityQuery,
  tomlQuery,
  vueQuery,
  luaQuery,
  systemrdlQuery,
  tlaPlusQuery,
  zigQuery,
  embeddedTemplateQuery,
  elispQuery,
  elixirQuery,
} from "./queries"
import { Log } from "../util/log"

const log = Log.create({ service: "tree-sitter-parser" })

export interface LanguageParser {
  [key: string]: {
    parser: ParserT
    query: QueryT
  }
}

interface ExtensionEntry {
  languageName: string
  parserKey: string
  query: string
}

const EXTENSION_MAP: Record<string, ExtensionEntry> = {
  js: { languageName: "javascript", parserKey: "js", query: javascriptQuery },
  jsx: { languageName: "javascript", parserKey: "jsx", query: javascriptQuery },
  json: { languageName: "javascript", parserKey: "json", query: javascriptQuery },
  ts: { languageName: "typescript", parserKey: "ts", query: typescriptQuery },
  tsx: { languageName: "tsx", parserKey: "tsx", query: tsxQuery },
  py: { languageName: "python", parserKey: "py", query: pythonQuery },
  rs: { languageName: "rust", parserKey: "rs", query: rustQuery },
  go: { languageName: "go", parserKey: "go", query: goQuery },
  cpp: { languageName: "cpp", parserKey: "cpp", query: cppQuery },
  hpp: { languageName: "cpp", parserKey: "hpp", query: cppQuery },
  c: { languageName: "c", parserKey: "c", query: cQuery },
  h: { languageName: "c", parserKey: "h", query: cQuery },
  cs: { languageName: "c_sharp", parserKey: "cs", query: csharpQuery },
  rb: { languageName: "ruby", parserKey: "rb", query: rubyQuery },
  java: { languageName: "java", parserKey: "java", query: javaQuery },
  php: { languageName: "php", parserKey: "php", query: phpQuery },
  html: { languageName: "html", parserKey: "html", query: htmlQuery },
  swift: { languageName: "swift", parserKey: "swift", query: swiftQuery },
  kt: { languageName: "kotlin", parserKey: "kt", query: kotlinQuery },
  kts: { languageName: "kotlin", parserKey: "kts", query: kotlinQuery },
  css: { languageName: "css", parserKey: "css", query: cssQuery },
  ml: { languageName: "ocaml", parserKey: "ml", query: ocamlQuery },
  mli: { languageName: "ocaml", parserKey: "mli", query: ocamlQuery },
  scala: { languageName: "scala", parserKey: "scala", query: luaQuery },
  sol: { languageName: "solidity", parserKey: "sol", query: solidityQuery },
  toml: { languageName: "toml", parserKey: "toml", query: tomlQuery },
  vue: { languageName: "vue", parserKey: "vue", query: vueQuery },
  lua: { languageName: "lua", parserKey: "lua", query: luaQuery },
  rdl: { languageName: "systemrdl", parserKey: "rdl", query: systemrdlQuery },
  tla: { languageName: "tlaplus", parserKey: "tla", query: tlaPlusQuery },
  zig: { languageName: "zig", parserKey: "zig", query: zigQuery },
  ejs: { languageName: "embedded_template", parserKey: "embedded_template", query: embeddedTemplateQuery },
  erb: { languageName: "embedded_template", parserKey: "embedded_template", query: embeddedTemplateQuery },
  el: { languageName: "elisp", parserKey: "el", query: elispQuery },
  ex: { languageName: "elixir", parserKey: "ex", query: elixirQuery },
  exs: { languageName: "elixir", parserKey: "exs", query: elixirQuery },
}

function extToLanguageName(ext: string): string | undefined {
  return EXTENSION_MAP[ext]?.languageName
}

function extToEntry(ext: string): ExtensionEntry | undefined {
  return EXTENSION_MAP[ext]
}

// Reverse index: language name → all parserKeys for that language.
const LANGUAGE_PARSER_KEYS: Record<string, string[]> = {}
for (const entry of Object.values(EXTENSION_MAP)) {
  (LANGUAGE_PARSER_KEYS[entry.languageName] ??= []).push(entry.parserKey)
}

export const TOP_5_LANGUAGES = ["javascript", "typescript", "python", "rust", "go"]

/**
 * Scan a project directory for supported file extensions and return a
 * deduplicated list of tree-sitter language names to load. Falls back to
 * TOP_5_LANGUAGES when the scan yields fewer than that many results (ensuring
 * common languages are always available for one-off file requests even in
 * non-standard projects).
 */
const SUPPORTED_GLOB_PATTERN = (() => {
  const exts = Object.keys(EXTENSION_MAP)
  return `**/*.{${exts.join(",")}}`
})()

export async function detectProjectLanguages(dir: string): Promise<string[]> {
  const { glob } = require("glob")
  let files: string[]
  try {
    files = await glob(SUPPORTED_GLOB_PATTERN, {
      cwd: dir,
      nodir: true,
      dot: false,
      ignore: "**/node_modules/**",
    })
  } catch {
    return [...TOP_5_LANGUAGES]
  }
  const langs = new Set<string>()
  for (const file of files) {
    const ext = path.extname(file).toLowerCase().slice(1)
    const lang = extToLanguageName(ext)
    if (lang) langs.add(lang)
  }
  if (langs.size < TOP_5_LANGUAGES.length) {
    for (const lang of TOP_5_LANGUAGES) langs.add(lang)
  }
  return [...langs]
}

/**
 * Load tree-sitter parsers for every language detected in `dir` (via
 * detectProjectLanguages). Returns the loaded parsers keyed by parserKey.
 * The core tree-sitter runtime is initialized once and reused.
 */
export async function loadProjectLanguageParsers(
  dir: string,
  sourceDirectory?: string,
): Promise<LanguageParser> {
  const { Parser, Query } = require("web-tree-sitter")
  if (!isParserInitialized) {
    try {
      const runtimeWasmPath = resolveCoreRuntimeWasmPath(sourceDirectory)
      if (!runtimeWasmPath) {
        const searchedPaths = wasmDirectories(sourceDirectory)
        log.error("Failed to resolve tree-sitter runtime WASM", { searchedPaths })
        throw new Error(`Missing tree-sitter runtime WASM: tree-sitter.wasm (searched: ${searchedPaths.join(", ")})`)
      }
      await Parser.init({
        locateFile() {
          return runtimeWasmPath
        },
      })
      isParserInitialized = true
    } catch (error) {
      log.error("Failed to initialize tree-sitter parser", {
        err: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }
  const languageNames = await detectProjectLanguages(dir)
  const parsers: LanguageParser = {}
  const loaded = new Set<string>()
  const loadResults = await Promise.allSettled(
    [...new Set(languageNames)].map(async (lang) => {
      const queryText = extToQueryForLanguageName(lang)
      if (!queryText) return null
      const language = await loadLanguage(lang, sourceDirectory)
      const query = new Query(language, queryText)
      const parser = new Parser()
      parser.setLanguage(language)
      return { lang, parser, query }
    }),
  )
  for (const result of loadResults) {
    if (result.status === "rejected" || !result.value) {
      if (result.status === "rejected") log.warn("failed to load project language parser", { err: result.reason })
      continue
    }
    const { lang, parser, query } = result.value
    const keys = LANGUAGE_PARSER_KEYS[lang]
    if (keys) {
      for (const key of keys) parsers[key] = { parser, query }
    }
  }
  return parsers
}

function extToQueryForLanguageName(langName: string): string | undefined {
  for (const entry of Object.values(EXTENSION_MAP)) {
    if (entry.languageName === langName) return entry.query
  }
}

/**
 * Resolve a module file to an absolute path that actually exists on disk.
 *
 * `require.resolve` inside a compiled Bun binary is not a filesystem probe: it
 * returns the absolute path recorded when the binary was built, even after the
 * source tree has been moved or deleted. Returning such a dead path here made
 * tree-sitter resolve its runtime WASM to a directory that no longer existed and
 * fail with an opaque ENOENT. Every candidate we hand out must exist.
 */
export function resolveModulePath(specifier: string): string | undefined {
  try {
    const resolved = require.resolve(specifier)
    if (!resolved || !existsSync(resolved)) return
    return resolved
  } catch {
    return
  }
}

function uniquePaths(paths: Array<string | undefined>): string[] {
  return [...new Set(paths.filter((item): item is string => !!item))]
}

export function wasmDirectories(sourceDirectory?: string): string[] {
  const baseDir = sourceDirectory || __dirname
  const execDir = path.dirname(process.execPath)
  const envDir = process.env.KILO_TREE_SITTER_WASM_DIR
  const wasmPkg = resolveModulePath("tree-sitter-wasms/package.json")
  const wasmOutDir = wasmPkg ? path.join(path.dirname(wasmPkg), "out") : undefined

  return uniquePaths([
    baseDir,
    path.join(baseDir, "tree-sitter"),
    execDir,
    path.join(execDir, "tree-sitter"),
    envDir,
    wasmOutDir,
  ])
}

function resolveFromDirectories(file: string, dirs: string[]): string | undefined {
  for (const dir of dirs) {
    const candidate = path.join(dir, file)
    if (!existsSync(candidate)) {
      continue
    }
    return candidate
  }
}

export function resolveCoreRuntimeWasmPath(sourceDirectory?: string): string | undefined {
  const dirs = wasmDirectories(sourceDirectory)
  const localPath = resolveFromDirectories("tree-sitter.wasm", dirs)
  if (localPath) {
    return localPath
  }
  return resolveModulePath("web-tree-sitter/tree-sitter.wasm")
}

export function resolveLanguageWasmPath(langName: string, sourceDirectory?: string) {
  const dirs = wasmDirectories(sourceDirectory)
  const fileName = `tree-sitter-${langName}.wasm`
  const wasmPath = resolveFromDirectories(fileName, dirs)
  const searchedPaths = dirs.map((dir) => path.join(dir, fileName))

  return {
    wasmPath,
    searchedPaths,
  }
}

async function loadLanguage(langName: string, sourceDirectory?: string) {
  const { Language } = require("web-tree-sitter")
  const resolved = resolveLanguageWasmPath(langName, sourceDirectory)

  if (!resolved.wasmPath) {
    log.error(`Failed to resolve language WASM: ${langName}`, {
      searchedPaths: resolved.searchedPaths,
    })
    throw new Error(`Missing tree-sitter language WASM: ${langName}`)
  }

  try {
    return await Language.load(resolved.wasmPath)
  } catch (error) {
    log.warn(`language WASM unavailable: ${langName}`, {
      wasmPath: resolved.wasmPath,
      err: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

let isParserInitialized = false

/*
RATIONALE: Uses web-tree-sitter WASM modules instead of native node bindings
to avoid architecture-specific build issues. Each language's grammar is loaded
from a .wasm file on demand based on the file extensions being parsed.

Sources:
- https://github.com/tree-sitter/tree-sitter/blob/master/lib/binding_web/README.md
- https://github.com/Gregoor/tree-sitter-wasms/blob/main/README.md
*/
export async function loadRequiredLanguageParsers(filesToParse: string[], sourceDirectory?: string) {
  const { Parser, Query } = require("web-tree-sitter")

  if (!isParserInitialized) {
    try {
      const runtimeWasmPath = resolveCoreRuntimeWasmPath(sourceDirectory)
      if (!runtimeWasmPath) {
        const searchedPaths = wasmDirectories(sourceDirectory)
        log.error("Failed to resolve tree-sitter runtime WASM", { searchedPaths })
        throw new Error(`Missing tree-sitter runtime WASM: tree-sitter.wasm (searched: ${searchedPaths.join(", ")})`)
      }
      await Parser.init({
        locateFile() {
          return runtimeWasmPath
        },
      })
      isParserInitialized = true
    } catch (error) {
      log.error("Failed to initialize tree-sitter parser", {
        err: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  const extensionsToLoad = new Set(filesToParse.map((file) => path.extname(file).toLowerCase().slice(1)))
  const parsers: LanguageParser = {}

  for (const ext of extensionsToLoad) {
    const entry = extToEntry(ext)
    if (!entry) throw new Error(`Unsupported language: ${ext}`)

    const language = await loadLanguage(entry.languageName, sourceDirectory)
    const query = new Query(language, entry.query)
    const parser = new Parser()
    parser.setLanguage(language)
    parsers[entry.parserKey] = { parser, query }
  }

  return parsers
}
