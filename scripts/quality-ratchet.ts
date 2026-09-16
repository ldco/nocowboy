#!/usr/bin/env bun
/**
 * Quality ratchet.
 *
 * Two metrics that the audit flagged, guarded so they can only go down:
 *
 *  1. `empty-catch-uncommented` — an empty `catch {}` hides a failure. It is
 *     allowed only when the block carries a comment explaining why swallowing is
 *     correct (or a trailing comment on the same line). This count must be 0.
 *  2. `as-any` — a type escape hatch. The count is compared against a baseline
 *     and may not grow.
 *
 * Usage:
 *   bun scripts/quality-ratchet.ts            # verify (exit 1 on regression)
 *   bun scripts/quality-ratchet.ts --update   # accept the current numbers
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs"
import { join, dirname, relative } from "node:path"

const ROOT = join(import.meta.dir, "..")
const BASELINE_PATH = join(ROOT, "scripts", "quality-baseline.json")
const SCAN_DIRS = ["packages/opencode/src", "packages/core/src", "packages/llm/src"]
const EXTENSIONS = [".ts", ".tsx"]

interface Baseline {
  "empty-catch-uncommented": number
  "as-any": number
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue
    const full = join(dir, entry)
    // Broken symlinks (e.g. vendored AGENTS.md) make stat throw; skip them.
    let stat
    try {
      stat = statSync(full)
    } catch {
      continue
    }
    if (stat.isDirectory()) out.push(...walk(full))
    else if (EXTENSIONS.some((ext) => entry.endsWith(ext))) out.push(full)
  }
  return out
}

/** Find empty catch blocks and report the ones with no explanation. */
function scanEmptyCatches(files: string[]): { total: number; uncommented: { file: string; line: number }[] } {
  const uncommented: { file: string; line: number }[] = []
  let total = 0
  for (const file of files) {
    const lines = readFileSync(file, "utf-8").split("\n")
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? ""
      const match = line.match(/catch\s*(\([^)]*\))?\s*\{/)
      if (!match) continue
      // How much of the block is on this line after `{`, and is it closed here?
      const afterBrace = line.slice((match.index ?? 0) + match[0].length)
      const closesHere = afterBrace.includes("}")
      const inlineBody = closesHere ? afterBrace.slice(0, afterBrace.indexOf("}")) : afterBrace
      const blockLines = [line]
      if (!closesHere) {
        for (let j = i + 1; j < lines.length; j++) {
          blockLines.push(lines[j] ?? "")
          if ((lines[j] ?? "").includes("}")) break
        }
      }
      const body = closesHere ? inlineBody : blockLines.slice(1).join("\n").replace(/\}\s*$/, "")
      const isEmpty = body.trim().length === 0
      if (!isEmpty) continue
      total++
      const hasComment = /\/\/|\/\*/.test(line) || /\/\/|\/\*/.test(blockLines.join("\n"))
      if (!hasComment) uncommented.push({ file: relative(ROOT, file), line: i + 1 })
    }
  }
  return { total, uncommented }
}

function countAsAny(files: string[]): { file: string; line: number }[] {
  const hits: { file: string; line: number }[] = []
  for (const file of files) {
    const lines = readFileSync(file, "utf-8").split("\n")
    lines.forEach((line, index) => {
      if (/\bas\s+any\b/.test(line)) hits.push({ file: relative(ROOT, file), line: index + 1 })
    })
  }
  return hits
}

const files = SCAN_DIRS.flatMap((dir) => walk(join(ROOT, dir)))
const catches = scanEmptyCatches(files)
const anyHits = countAsAny(files)

const current: Baseline = {
  "empty-catch-uncommented": catches.uncommented.length,
  "as-any": anyHits.length,
}

const update = process.argv.includes("--update")
if (update) {
  writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + "\n", "utf-8")
  console.log(`Baseline written: ${JSON.stringify(current)}`)
  process.exit(0)
}

const baseline: Baseline = existsSync(BASELINE_PATH)
  ? (JSON.parse(readFileSync(BASELINE_PATH, "utf-8")) as Baseline)
  : { "empty-catch-uncommented": 0, "as-any": 0 }

const problems: string[] = []

if (catches.uncommented.length > 0) {
  problems.push(
    `${catches.uncommented.length} empty catch block(s) without an explanation:\n` +
      catches.uncommented.map((hit) => `  ${hit.file}:${hit.line}`).join("\n"),
  )
}
if (current["as-any"] > baseline["as-any"]) {
  problems.push(`as-any grew from ${baseline["as-any"]} to ${current["as-any"]}`)
}

console.log(`empty catch blocks: ${catches.uncommented.length} without an explanation (scanned ${catches.total})`)
console.log(`as-any: ${current["as-any"]} (baseline ${baseline["as-any"]})`)

if (problems.length > 0) {
  console.error("\n❌ quality ratchet failed:\n" + problems.join("\n\n"))
  process.exit(1)
}
console.log("✅ quality ratchet passed")
