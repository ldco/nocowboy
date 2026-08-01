import * as fs from "node:fs"
import * as path from "node:path"

export interface FileEntry {
  file: string
  lines: number
  size: number
  imports: string[]
  exports: string[]
}

export interface ModuleDescriptor {
  directory: string
  files: FileEntry[]
  responsibility: string
}

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".turbo", "__pycache__", ".next", "target", "build", ".output", ".cache"])
const SKIP_FILES = new Set([".DS_Store", "package-lock.json", "bun.lockb", "yarn.lock", "pnpm-lock.yaml"])
const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".rs", ".go", ".java", ".kt", ".swift",
  ".c", ".cpp", ".h", ".hpp", ".cs", ".rb",
  ".vue", ".svelte", ".astro", ".css", ".scss",
  ".sql", ".graphql", ".proto", ".yaml", ".yml",
  ".toml", ".json", ".md", ".sh", ".bash", ".zsh",
  ".html", ".xml", ".svg",
])

const MAX_FILES = 500

function isSourceFile(name: string): boolean {
  const ext = path.extname(name).toLowerCase()
  return CODE_EXTENSIONS.has(ext)
}

function shouldSkipDir(name: string): boolean {
  return SKIP_DIRS.has(name) || name.startsWith(".")
}

export function scanDir(root: string): FileEntry[] {
  const entries: FileEntry[] = []

  function walk(dir: string) {
    if (entries.length >= MAX_FILES) return
    let items: fs.Dirent[]
    try { items = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }

    for (const item of items) {
      if (entries.length >= MAX_FILES) return
      if (item.isDirectory() && !shouldSkipDir(item.name)) {
        walk(path.join(dir, item.name))
      } else if (item.isFile() && isSourceFile(item.name) && !SKIP_FILES.has(item.name)) {
        try {
          const filePath = path.join(dir, item.name)
          const content = fs.readFileSync(filePath, "utf-8")
          const lines = content.split("\n").length

          const importRegex = /(?:^|\n)(?:import\s+.*?from\s+["']([^"']+)["']|require\s*\(\s*["']([^"']+)["']\s*\)|from\s+["']([^"']+)["']\s+import|use\s+([^;\n]+))/g
          const imports: string[] = []
          let m
          while ((m = importRegex.exec(content)) !== null) {
            const imp = (m[1] || m[2] || m[3] || m[4] || "").trim().split("/").pop()?.split(".")[0] || ""
            if (imp && !imports.includes(imp)) imports.push(imp)
          }

          const exportRegex = /(?:^|\n)(?:export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum|async\s+function)\s+(\w+)|module\.exports\s*=\s*(\w+)|pub\s+(?:fn|struct|enum|trait|mod)\s+(\w+))/g
          const exports: string[] = []
          while ((m = exportRegex.exec(content)) !== null) {
            const exp = m[1] || m[2] || m[3]
            if (exp && !exports.includes(exp)) exports.push(exp)
          }

          entries.push({
            file: path.relative(root, filePath),
            lines,
            size: content.length,
            imports: imports.slice(0, 5),
            exports: exports.slice(0, 10),
          })
        } catch { /* skip unreadable */ }
      }
    }
  }

  walk(root)
  return entries.sort((a, b) => b.lines - a.lines)
}

export function getFileList(root: string, query?: string): string[] {
  const entries = scanDir(root)
  const files = entries.map((e) => e.file)
  if (query && query.trim()) {
    return filterFiles(files, query)
  }
  return files
}

export function filterFiles(files: string[], query: string): string[] {
  const matched = files.filter((f) => f.includes(query))
  // Сортировка: сначала совпадения по началу пути, потом по глубине, потом алфавит
  matched.sort((a, b) => {
    const aStartsWith = a.startsWith(query)
    const bStartsWith = b.startsWith(query)
    if (aStartsWith !== bStartsWith) return aStartsWith ? -1 : 1
    const aDepth = a.split("/").length
    const bDepth = b.split("/").length
    if (aDepth !== bDepth) return aDepth - bDepth
    return a.localeCompare(b)
  })
  return matched
}

function groupByDirectory(entries: FileEntry[]): ModuleDescriptor[] {
  const groups = new Map<string, FileEntry[]>()
  for (const entry of entries) {
    const dir = path.dirname(entry.file)
    if (!groups.has(dir)) groups.set(dir, [])
    groups.get(dir)!.push(entry)
  }
  return [...groups.entries()]
    .sort((a, b) => b[1].reduce((s, f) => s + f.lines, 0) - a[1].reduce((s, f) => s + f.lines, 0))
    .map(([dir, files]) => ({
      directory: dir,
      files,
      responsibility: describeResponsibility(dir, files),
    }))
}

function describeResponsibility(dir: string, files: FileEntry[]): string {
  const baseName = path.basename(dir)
  const hints: Record<string, string> = {
    "api": "API routes/endpoints",
    "auth": "Authentication & authorization",
    "db": "Database access & schema",
    "config": "Configuration & settings",
    "util": "Shared utilities",
    "component": "UI components",
    "route": "Routing & navigation",
    "middleware": "Request middleware",
    "service": "Business logic services",
    "test": "Tests",
    "script": "Build / deployment scripts",
    "cli": "CLI commands",
    "server": "Server entry point",
    "agent": "AI agent logic",
    "tool": "Tool definitions",
    "mcp": "MCP server implementations",
    "provider": "LLM provider integrations",
    "session": "Session management",
    "indexing": "Codebase indexing",
  }
  return hints[baseName] || baseName
}

// Cache keyed by root directory — TTL-based, not mtime-based
// This prevents repomap regeneration on every git add/commit/status
// which was breaking DeepSeek prefix caching.
const cache = new Map<string, { map: string; timestamp: number }>()
const CACHE_MAX = 10
const CACHE_TTL_MS = 5 * 60 * 1000

export namespace RepoMap {
  export function generate(root: string, maxLines: number = 50): string {
    const now = Date.now()
    const cached = cache.get(root)
    if (cached && now - cached.timestamp < CACHE_TTL_MS) return cached.map

    const entries = scanDir(root)
    const modules = groupByDirectory(entries)
    const totalLines = entries.reduce((s, f) => s + f.lines, 0)
    const totalFiles = entries.length

    const lines: string[] = []
    lines.push("## Repository Map\n")
    lines.push("| Directory | Files | Lines | Responsibility |")
    lines.push("|-----------|-------|-------|---------------|")

    for (const mod of modules.slice(0, maxLines)) {
      const dirFiles = mod.files.length
      const dirLines = mod.files.reduce((s, f) => s + f.lines, 0)
      const dirName = mod.directory === "." ? "(root)" : mod.directory
      lines.push(`| ${dirName} | ${dirFiles} | ${dirLines} | ${mod.responsibility} |`)
    }

    if (modules.length > maxLines) {
      lines.push(`| ... | ... | ... | (${modules.length - maxLines} more directories) |`)
    }

    lines.push("")
    lines.push(`**Total:** ${totalFiles} files, ${totalLines.toLocaleString()} lines across ${modules.length} directories.`)

    const result = lines.join("\n")
    if (cache.size >= CACHE_MAX) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined) cache.delete(oldest)
    }
    cache.set(root, { map: result, timestamp: now })
    return result
  }
}
