/**
 * Structured AST extraction — definitions and call edges from tree-sitter.
 *
 * `parseSourceCodeDefinitionsForFile` (this package) already proves tree-sitter
 * parsing works under bun, but it returns a human-readable text blob. Graph
 * consumers (the knowledge-graph engine in `@nocowboy/opencode`) need structure:
 * `{name, kind, line}[]` definitions and `from -> callee` call edges. This module
 * runs the *same* per-language definition queries and maps their captures to that
 * shape, plus a small call query for the same languages.
 *
 * Scope is TS/JS (and tsx) — the languages the acceptance criteria require. An
 * unsupported extension, a missing/unloadable language WASM, an unreadable file,
 * or a parse failure yields `[]`; this module never throws.
 *
 * Runtime note: web-tree-sitter ships separate ESM and CJS builds with independent
 * WASM module state. `languageParser` initializes the CJS build via `require`, so
 * the call `Query` must come from `require` too — importing the ESM build here
 * would construct a Query against an uninitialized module and throw.
 */

import * as fs from "fs/promises"
import * as path from "path"
import type { Language as LanguageT, Node as NodeT, Parser as ParserT, Query as QueryT } from "web-tree-sitter"
import { loadRequiredLanguageParsers } from "./languageParser"

/** A structured source definition: a named symbol and where it starts. */
export interface AstDefinition {
  name: string
  kind: string
  /** 1-based line of the definition. */
  line: number
}

/** A call edge: the enclosing definition (or module scope) calls `to`. */
export interface AstCallEdge {
  /** Nearest enclosing named definition, or `MODULE_SCOPE` at file top level. */
  from: string
  /** The called callee's simple name (identifier or member property). */
  to: string
  /** 1-based line of the call site. */
  line: number
}

/** `from` sentinel for a call not enclosed by any named definition. */
export const MODULE_SCOPE = "<module>"

const NAME_DEFINITION_PREFIX = "name.definition."
const DEFINITION_PREFIX = "definition."
const NAME_CAPTURE = "name"

/**
 * Call patterns shared by the TS/JS/TSX grammars: a plain callee (`foo()`) and a
 * member callee (`obj.foo()`). Both capture the callee as `@callee`.
 */
const CALL_QUERY = `(call_expression function: (identifier) @callee)
(call_expression function: (member_expression property: (property_identifier) @callee))`

interface FileParser {
  parser: ParserT
  query: QueryT
  language: LanguageT
}

type QueryCtor = new (language: LanguageT, source: string) => QueryT

/** Construct a Query from the CJS build so it shares the Parser's WASM state. */
function queryConstructor(): QueryCtor {
  return (require("web-tree-sitter") as { Query: QueryCtor }).Query
}

/**
 * Load the language parser for a file's extension. Returns `null` for an
 * unsupported extension or an unavailable WASM — callers treat that as no AST.
 */
async function loadFileParser(filePath: string): Promise<FileParser | null> {
  const ext = path.extname(filePath).toLowerCase().slice(1)
  if (!ext) return null
  try {
    const parsers = await loadRequiredLanguageParsers([filePath])
    const entry = parsers[ext]
    if (!entry || !entry.parser.language) return null
    return { parser: entry.parser, query: entry.query, language: entry.parser.language }
  } catch {
    // Unsupported language or missing/unloadable WASM: no structured AST.
    return null
  }
}

/**
 * Map definition-query captures to structured definitions and, alongside, record
 * which syntax node each name belongs to so a call site can find its enclosing
 * definition by walking ancestors. Two capture conventions are supported:
 *   - TS: `@name.definition.<kind>` carries the name; `@definition.<kind>` the node.
 *   - JS/TSX: `@name` carries the name next to a `@definition.<kind>` container.
 * A container with neither an explicit name nor a `name` field is skipped rather
 * than fabricating a definition.
 */
function extractDefinitions(
  root: NodeT,
  query: QueryT,
): { list: AstDefinition[]; byNodeId: Map<number, string> } {
  const list: AstDefinition[] = []
  const byNodeId = new Map<number, string>()
  const seen = new Set<string>()

  const emit = (name: string, kind: string, line: number): void => {
    if (!name) return
    const key = `${kind}|${name}|${line}`
    if (seen.has(key)) return
    seen.add(key)
    list.push({ name, kind, line })
  }

  for (const match of query.matches(root)) {
    let name: string | undefined
    let kind: string | undefined
    let line: number | undefined
    const containers: NodeT[] = []

    for (const capture of match.captures) {
      if (capture.name.startsWith(NAME_DEFINITION_PREFIX)) {
        name = capture.node.text
        kind = capture.name.slice(NAME_DEFINITION_PREFIX.length)
        line = capture.node.startPosition.row + 1
      } else if (capture.name.startsWith(DEFINITION_PREFIX)) {
        containers.push(capture.node)
        kind ??= capture.name.slice(DEFINITION_PREFIX.length)
        line ??= capture.node.startPosition.row + 1
      } else if (capture.name === NAME_CAPTURE) {
        name = capture.node.text
        line ??= capture.node.startPosition.row + 1
      }
    }

    if (name === undefined) {
      const container = containers[0]
      const field = container?.childForFieldName("name")?.text
      if (!container || !field || kind === undefined) continue
      name = field
      line ??= container.startPosition.row + 1
    }

    if (kind === undefined || line === undefined) continue
    emit(name, kind, line)
    for (const container of containers) byNodeId.set(container.id, name)
  }

  return { list, byNodeId }
}

function compareDefinitions(a: AstDefinition, b: AstDefinition): number {
  return a.line - b.line || a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)
}

/**
 * Structured definitions for a TS/JS/TSX file, sorted by line. `[]` for anything
 * unsupported/unreadable/unparseable — never throws.
 */
export async function parseDefinitionsForFile(filePath: string): Promise<AstDefinition[]> {
  try {
    const source = await fs.readFile(filePath, "utf8")
    const parsed = await loadFileParser(filePath)
    if (!parsed) return []
    const tree = parsed.parser.parse(source)
    if (!tree) return []
    return extractDefinitions(tree.rootNode, parsed.query).list.sort(compareDefinitions)
  } catch {
    return []
  }
}

/** Walk ancestors from a call site to the nearest mapped named definition. */
function enclosingDefinition(node: NodeT, byNodeId: Map<number, string>): string {
  let current = node.parent
  while (current) {
    const name = byNodeId.get(current.id)
    if (name) return name
    current = current.parent
  }
  return MODULE_SCOPE
}

/**
 * Call edges for a TS/JS/TSX file: which enclosing definition calls which callee,
 * in source order. `[]` for anything unsupported/unreadable/unparseable — never
 * throws.
 */
export async function parseCallEdgesForFile(filePath: string): Promise<AstCallEdge[]> {
  try {
    const source = await fs.readFile(filePath, "utf8")
    const parsed = await loadFileParser(filePath)
    if (!parsed) return []
    const tree = parsed.parser.parse(source)
    if (!tree) return []
    const { byNodeId } = extractDefinitions(tree.rootNode, parsed.query)
    const Query = queryConstructor()
    const callQuery = new Query(parsed.language, CALL_QUERY)
    const edges: AstCallEdge[] = []
    for (const capture of callQuery.captures(tree.rootNode)) {
      const callee = capture.node.text
      if (!callee) continue
      edges.push({
        from: enclosingDefinition(capture.node, byNodeId),
        to: callee,
        line: capture.node.startPosition.row + 1,
      })
    }
    return edges
  } catch {
    return []
  }
}
