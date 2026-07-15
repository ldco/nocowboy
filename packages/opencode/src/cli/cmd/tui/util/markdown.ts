/**
 * Markdown utilities for TUI: table formatting, link handling, and code highlighting.
 *
 * - {@link formatMarkdownTables} — aligns table columns to fixed widths for cleaner display.
 * - {@link linkifyMarkdown} — adds OSC 8 hyperlink escape sequences for clickable URLs.
 * - {@link highlightCodeBlock} — syntax-highlights a code block using simple tokenisation.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Table formatting (retained from original, exported for use)
// ─────────────────────────────────────────────────────────────────────────────

type TableRow = string[]

interface Table {
  startIndex: number
  endIndex: number
  rows: TableRow[]
  alignments: ("left" | "center" | "right" | "none")[]
}

function parseRow(line: string): TableRow | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null
  const cells = trimmed.split("|").slice(1, -1)
  return cells.map((cell) => cell.trim())
}

function isSeparatorRow(cells: TableRow): boolean {
  return cells.every((cell) => /^:?-+:?$/.test(cell))
}

function getAlignment(cell: string): "left" | "center" | "right" | "none" {
  const left = cell.startsWith(":")
  const right = cell.endsWith(":")
  if (left && right) return "center"
  if (right) return "right"
  if (left) return "left"
  return "none"
}

function getDisplayWidth(str: string): number {
  let width = 0
  for (const char of str) {
    const code = char.codePointAt(0)!
    if (
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0x9fff) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe1f) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x20000 && code <= 0x2fffd) ||
      (code >= 0x30000 && code <= 0x3fffd)
    ) {
      width += 2
    } else {
      width += 1
    }
  }
  return width
}

function padToWidth(str: string, width: number, align: "left" | "center" | "right" | "none"): string {
  const currentWidth = getDisplayWidth(str)
  const padding = width - currentWidth
  if (padding <= 0) return str
  switch (align) {
    case "center": {
      const left = Math.floor(padding / 2)
      const right = padding - left
      return " ".repeat(left) + str + " ".repeat(right)
    }
    case "right":
      return " ".repeat(padding) + str
    default:
      return str + " ".repeat(padding)
  }
}

function findTables(lines: string[]): Table[] {
  const tables: Table[] = []
  let i = 0
  while (i < lines.length) {
    const headerCells = parseRow(lines[i])
    if (!headerCells || headerCells.length === 0) {
      i++
      continue
    }
    if (i + 1 >= lines.length) {
      i++
      continue
    }
    const separatorCells = parseRow(lines[i + 1])
    if (!separatorCells || !isSeparatorRow(separatorCells)) {
      i++
      continue
    }
    const table: Table = {
      startIndex: i,
      endIndex: i + 1,
      rows: [headerCells, separatorCells],
      alignments: separatorCells.map(getAlignment),
    }
    let j = i + 2
    while (j < lines.length) {
      const rowCells = parseRow(lines[j])
      if (!rowCells) break
      table.rows.push(rowCells)
      table.endIndex = j
      j++
    }
    tables.push(table)
    i = j
  }
  return tables
}

function formatTable(table: Table): string[] {
  const columnCount = Math.max(...table.rows.map((row) => row.length))
  const columnWidths: number[] = Array(columnCount).fill(0)
  for (const row of table.rows) {
    for (let col = 0; col < columnCount; col++) {
      const cell = row[col] ?? ""
      if (isSeparatorRow(row)) {
        columnWidths[col] = Math.max(columnWidths[col], 3)
      } else {
        columnWidths[col] = Math.max(columnWidths[col], getDisplayWidth(cell))
      }
    }
  }
  return table.rows.map((row, rowIndex) => {
    const cells: string[] = []
    for (let col = 0; col < columnCount; col++) {
      const cell = row[col] ?? ""
      const width = columnWidths[col]
      const align = table.alignments[col] ?? "none"
      if (rowIndex === 1) {
        const hasLeft = align === "left" || align === "center"
        const hasRight = align === "right" || align === "center"
        const dashCount = width - (hasLeft ? 1 : 0) - (hasRight ? 1 : 0)
        const dashes = "-".repeat(Math.max(dashCount, 1))
        cells.push((hasLeft ? ":" : "") + dashes + (hasRight ? ":" : ""))
      } else {
        cells.push(padToWidth(cell, width, align))
      }
    }
    return "| " + cells.join(" | ") + " |"
  })
}

/**
 * Formats all markdown tables in the content with fixed-width columns.
 * Tables that don't follow standard markdown table syntax are left unchanged.
 */
export function formatMarkdownTables(content: string): string {
  const lines = content.split("\n")
  const tables = findTables(lines)
  if (tables.length === 0) return content
  for (let i = tables.length - 1; i >= 0; i--) {
    const table = tables[i]
    const formatted = formatTable(table)
    lines.splice(table.startIndex, table.endIndex - table.startIndex + 1, ...formatted)
  }
  return lines.join("\n")
}

// ─────────────────────────────────────────────────────────────────────────────
// Link handling — OSC 8 hyperlinks for clickable URLs in terminal emulators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Markdown link regex: [text](url) or [text](url "title")
 */
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g

/**
 * Adds OSC 8 hyperlink escape sequences to markdown links so they become
 * clickable in terminal emulators that support the feature (kitty, iTerm2,
 * WezTerm, foot, etc.). Falls back to showing `text (url)` if no match.
 */
export function linkifyMarkdown(content: string): string {
  return content.replace(MARKDOWN_LINK_RE, (_match, text: string, url: string) => {
    // Strip trailing punctuation from URL (common markdown edge case)
    const cleanUrl = url.replace(/[.,;:!?]+$/, "")
    // OSC 8 hyperlink: ESC ]8 ; params ; URI ST text ESC ]8 ; ; ST
    return `\x1b]8;;${cleanUrl}\x1b\\${text}\x1b]8;;\x1b\\`
  })
}

/**
 * Extracts all URLs from markdown content (for tooltip / preview purposes).
 */
export function extractUrls(content: string): Array<{ text: string; url: string }> {
  const urls: Array<{ text: string; url: string }> = []
  let match: RegExpExecArray | null
  const localRe = new RegExp(MARKDOWN_LINK_RE.source, "g")
  while ((match = localRe.exec(content)) !== null) {
    urls.push({ text: match[1], url: match[2].replace(/[.,;:!?]+$/, "") })
  }
  return urls
}

// ─────────────────────────────────────────────────────────────────────────────
// Code highlighting — lightweight keyword-based highlighter
// ─────────────────────────────────────────────────────────────────────────────

/** Language-specific keyword maps for simple tokenisation. */
const KEYWORDS: Record<string, string[]> = {
  typescript: [
    "abstract", "any", "as", "async", "await", "boolean", "break", "case", "catch",
    "class", "const", "constructor", "continue", "debugger", "declare", "default",
    "delete", "do", "else", "enum", "export", "extends", "false", "finally", "for",
    "from", "function", "get", "if", "implements", "import", "in", "infer", "instanceof",
    "interface", "is", "keyof", "let", "module", "namespace", "never", "new", "null",
    "number", "of", "operator", "override", "package", "private", "protected", "public",
    "readonly", "record", "return", "satisfies", "set", "static", "string", "super",
    "switch", "symbol", "this", "throw", "true", "try", "type", "typeof", "undefined",
    "unique", "unknown", "var", "void", "while", "with", "yield",
  ],
  javascript: [
    "async", "await", "break", "case", "catch", "class", "const", "continue",
    "debugger", "default", "delete", "do", "else", "export", "extends", "false",
    "finally", "for", "function", "if", "import", "in", "instanceof", "let",
    "new", "null", "of", "return", "static", "super", "switch", "this", "throw",
    "true", "try", "typeof", "var", "void", "while", "with", "yield",
  ],
  python: [
    "and", "as", "assert", "async", "await", "break", "class", "continue", "def",
    "del", "elif", "else", "except", "False", "finally", "for", "from", "global",
    "if", "import", "in", "is", "lambda", "None", "nonlocal", "not", "or", "pass",
    "raise", "return", "True", "try", "while", "with", "yield",
  ],
  go: [
    "break", "case", "chan", "const", "continue", "default", "defer", "else",
    "fallthrough", "for", "func", "go", "goto", "if", "import", "interface", "map",
    "package", "range", "return", "select", "struct", "switch", "type", "var",
  ],
  rust: [
    "as", "break", "const", "continue", "crate", "else", "enum", "extern", "false",
    "fn", "for", "if", "impl", "in", "let", "loop", "match", "mod", "move", "mut",
    "pub", "ref", "return", "self", "Self", "static", "struct", "super", "trait",
    "true", "type", "unsafe", "use", "where", "while",
  ],
  bash: [
    "if", "then", "else", "elif", "fi", "for", "while", "do", "done", "case",
    "esac", "function", "return", "local", "export", "source", "exit",
  ],
  json: [],
  yaml: [],
  markdown: [],
  text: [],
}

/** Mapping from common extensions/aliases to canonical language names. */
const LANG_ALIAS: Record<string, string> = {
  ts: "typescript",
  js: "javascript",
  py: "python",
  rb: "ruby",
  rs: "rust",
  go: "go",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  json: "json",
  yml: "yaml",
  yaml: "yaml",
  md: "markdown",
  text: "text",
  txt: "text",
}

/**
 * Highlight patterns used for simple tokenisation.
 * Order matters — comments before strings before keywords.
 */
interface HighlightToken {
  type: "comment" | "string" | "number" | "keyword" | "punctuation" | "plain"
  text: string
}

/**
 * Simple syntax highlighting for code blocks.
 * Returns an array of tokens with type annotations.
 * OpenTUI will apply syntaxStyle colours based on these types.
 */
export function highlightTokens(code: string, lang: string): HighlightToken[] {
  const canonical = LANG_ALIAS[lang] ?? lang
  const keywords = KEYWORDS[canonical] ?? []
  const tokens: HighlightToken[] = []
  const lines = code.split("\n")

  for (const line of lines) {
    let i = 0
    while (i < line.length) {
      // Comments (single-line)
      const singleComment = line.indexOf("//", i)
      const hashComment = line.indexOf("#", i)
      if ((singleComment === i || (hashComment === i && canonical === "python")) && (singleComment === i || hashComment === i)) {
        tokens.push({ type: "comment", text: line.slice(i) })
        i = line.length
        continue
      }

      // Strings (double-quoted)
      if (line[i] === '"') {
        const end = line.indexOf('"', i + 1)
        if (end !== -1) {
          tokens.push({ type: "string", text: line.slice(i, end + 1) })
          i = end + 1
          continue
        }
      }

      // Strings (single-quoted)
      if (line[i] === "'") {
        const end = line.indexOf("'", i + 1)
        if (end !== -1) {
          tokens.push({ type: "string", text: line.slice(i, end + 1) })
          i = end + 1
          continue
        }
      }

      // Template literals
      if (line[i] === "`") {
        const end = line.indexOf("`", i + 1)
        if (end !== -1) {
          tokens.push({ type: "string", text: line.slice(i, end + 1) })
          i = end + 1
          continue
        }
      }

      // Numbers
      if (/\d/.test(line[i]) && (i === 0 || /[\s([,=+\-*/%&|^~<>!:;]/.test(line[i - 1]))) {
        let end = i + 1
        while (end < line.length && /[\d.eExXoObBfFa-f_]/.test(line[end])) end++
        tokens.push({ type: "number", text: line.slice(i, end) })
        i = end
        continue
      }

      // Words (potential keywords)
      if (/[a-zA-Z_$]/.test(line[i])) {
        let end = i + 1
        while (end < line.length && /[a-zA-Z0-9_$]/.test(line[end])) end++
        const word = line.slice(i, end)
        if (keywords.includes(word)) {
          tokens.push({ type: "keyword", text: word })
        } else {
          tokens.push({ type: "plain", text: word })
        }
        i = end
        continue
      }

      // Punctuation
      if (/[{}()[\];,:.<>+\-*/%&|^~!?=@#`]/.test(line[i])) {
        tokens.push({ type: "punctuation", text: line[i] })
        i++
        continue
      }

      // Whitespace and other
      tokens.push({ type: "plain", text: line[i] })
      i++
    }
    tokens.push({ type: "plain", text: "\n" })
  }

  return tokens
}

/**
 * Converts highlighted tokens to ANSI-coloured text using a simple colour map.
 * This is a fallback when tree-sitter is not available.
 */
export function highlightCodeBlock(code: string, lang: string): string {
  const tokens = highlightTokens(code, lang)
  const colourMap: Record<string, string> = {
    comment: "\x1b[90m",     // bright black (gray)
    string: "\x1b[32m",      // green
    number: "\x1b[33m",      // yellow
    keyword: "\x1b[35m",     // magenta
    punctuation: "\x1b[37m", // white
    plain: "\x1b[0m",        // reset
  }
  const reset = "\x1b[0m"
  let result = ""
  for (const token of tokens) {
    if (token.text === "\n") {
      result += "\n"
    } else {
      result += (colourMap[token.type] ?? reset) + token.text + reset
    }
  }
  return result
}
