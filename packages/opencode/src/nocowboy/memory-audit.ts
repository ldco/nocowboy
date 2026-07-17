/**
 * Memory Audit — проверка дубликатов перед добавлением памяти.
 *
 * Сканирует существующие записи NUTAUSIK memory на предмет дубликатов
 * по заголовку и содержимому. Интегрирован как проверка перед вызовом
 * nutausik_memory_add.
 */

interface MemoryEntry {
  id: number
  title: string
  content: string
  type: string
}

/**
 * Загрузить все записи памяти из SQLite.
 */
function loadAllMemory(): MemoryEntry[] {
  try {
    const { homedir } = require("os") as typeof import("os")
    const { join } = require("path") as typeof import("path")
    const { Database } = require("bun:sqlite") as typeof import("bun:sqlite")
    const dbPath = join(homedir(), ".local/share/nocowboy/storage/nocowboy.db")
    const db = new Database(dbPath)
    try {
      const rows = db.query("SELECT id, title, content, type FROM memory").all() as MemoryEntry[]
      return rows
    } finally {
      db.close()
    }
  } catch {
    return []
  }
}

/**
 * Проверить новую запись на дубликаты.
 * Возвращает найденные дубликаты, отсортированные по релевантности.
 */
export function findDuplicates(title: string, content: string): MemoryEntry[] {
  const all = loadAllMemory()
  const results: MemoryEntry[] = []

  const titleNorm = title.toLowerCase().trim()
  const contentNorm = content.toLowerCase().trim()

  for (const entry of all) {
    const entryTitle = entry.title.toLowerCase().trim()
    const entryContent = entry.content.toLowerCase().trim()

    // Точное совпадение заголовка
    if (entryTitle === titleNorm) {
      results.push(entry)
      continue
    }

    // Заголовок содержит существующий (или наоборот)
    if (entryTitle.includes(titleNorm) || titleNorm.includes(entryTitle)) {
      // Проверяем что содержимое тоже похоже
      if (entryContent.includes(contentNorm.slice(0, 50)) || contentNorm.includes(entryContent.slice(0, 50))) {
        results.push(entry)
        continue
      }
    }

    // Похожее содержимое (>60% совпадение первых 100 символов)
    const contentPrefix = contentNorm.slice(0, 100)
    const entryPrefix = entryContent.slice(0, 100)
    if (contentPrefix.length > 20 && entryPrefix.length > 20) {
      let matches = 0
      for (let i = 0; i < Math.min(contentPrefix.length, entryPrefix.length); i++) {
        if (contentPrefix[i] === entryPrefix[i]) matches++
      }
      const ratio = matches / Math.max(contentPrefix.length, entryPrefix.length)
      if (ratio > 0.6) {
        // Only include if not already in results
        if (!results.some((r) => r.id === entry.id)) {
          results.push(entry)
        }
      }
    }
  }

  return results
}

/**
 * Форматировать предупреждение о дубликатах.
 */
export function formatDuplicateWarning(duplicates: MemoryEntry[]): string {
  if (duplicates.length === 0) return ""

  const lines: string[] = [
    "⚠️  Memory audit: found similar existing entries:",
  ]

  for (const d of duplicates.slice(0, 5)) {
    lines.push(`  - #${d.id} [${d.type}] ${d.title}`)
  }
  if (duplicates.length > 5) {
    lines.push(`  ... and ${duplicates.length - 5} more`)
  }

  lines.push("")
  lines.push("Consider updating the existing entry instead of creating a duplicate.")

  return lines.join("\n")
}
