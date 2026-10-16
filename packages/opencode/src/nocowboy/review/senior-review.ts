/**
 * Senior Review — the "paged senior dev" half of the review subsystem.
 *
 * `/ponytail-review` (see `over-engineering.ts`) answers "what should we
 * REMOVE?". That is only one reading of a change. A senior engineer paged at
 * 3am reads the code the change *touches* — not just the diff — and asks:
 * what does it do, what breaks, how do we fix it, what happens if we don't.
 * This module is that second reading, kept pure so it can be unit-tested
 * without a provider, an engine or a filesystem.
 *
 * Two things live here:
 *   - a finding model that keeps the canonical line from `over-engineering.ts`
 *     but may carry a priority: `- [<priority>:<category>] <target> — <suggestion>`
 *     (a bare `- [<category>] ...` still parses; its priority is inferred);
 *   - a `shortcut:` ledger for `/ponytail-debt`, so "later" does not silently
 *     become "never" (the marker convention `lazy-senior.md` already names).
 *
 * Safety: over-engineering findings that touch a safety invariant are filtered
 * by `splitFindings` in `over-engineering.ts`. A *senior* finding with a
 * `security` category is the opposite — it is a bug to FIX, so it is never
 * run through that filter; see `SAFETY_SEMANTICS` below.
 */

import { OVER_ENGINEERING_CATEGORIES, parseFindings, type Finding } from "./over-engineering"
import { selectDeepContext, DEFAULT_MAX_DEEP_CONTEXT_FILES } from "@/nocowboy/session/deep-context-selection"
import type { GraphProvider, ImpactedFile } from "@/nocowboy/knowledge-graph"

/**
 * Categories a senior review may raise on top of the over-engineering set.
 * `bug`/`security` are correctness/safety; the rest are the "senior dev"
 * dimensions — load, slow paths, untested risk.
 */
export const SENIOR_REVIEW_CATEGORIES = [
  "bug",
  "security",
  "correctness",
  "performance",
  "slow-path",
  "missing-test",
  "risk",
  ...OVER_ENGINEERING_CATEGORIES,
] as const
export type SeniorReviewCategory = (typeof SENIOR_REVIEW_CATEGORIES)[number]

/** How urgent a finding is. */
export const FINDING_PRIORITIES = ["must-fix", "should-fix", "nit"] as const
export type FindingPriority = (typeof FINDING_PRIORITIES)[number]

export interface SeniorFinding extends Finding {
  /** The part after `:` in `[priority:category]`, or an inferred default. */
  priority: FindingPriority
}

const PRIORITY_BY_CATEGORY: Record<string, FindingPriority> = {
  bug: "must-fix",
  security: "must-fix",
  correctness: "must-fix",
  performance: "should-fix",
  "slow-path": "should-fix",
  "missing-test": "should-fix",
  risk: "should-fix",
  duplication: "nit",
  "unnecessary-abstraction": "nit",
  "dead-code": "nit",
  "premature-generalization": "nit",
  "unneeded-dependency": "nit",
  "over-configuration": "nit",
  "over-engineering": "nit",
  // A bare priority tag (`- [nit] ...`) is also accepted as a category.
  "must-fix": "must-fix",
  "should-fix": "should-fix",
  nit: "nit",
}

const PRIORITY_RANK: Record<FindingPriority, number> = { "must-fix": 0, "should-fix": 1, nit: 2 }

/** The priority a category implies when the line does not state one. */
export function priorityForCategory(category: string): FindingPriority {
  return PRIORITY_BY_CATEGORY[category] ?? "should-fix"
}

/** True when `category` is one this review understands (informational only). */
export function isSeniorCategory(category: string): boolean {
  return (SENIOR_REVIEW_CATEGORIES as readonly string[]).includes(category)
}

/**
 * Parse a senior review. Reuses the proven canonical parser from
 * `over-engineering.ts`, then splits an optional `priority:category` tag.
 * A line without a priority infers one from its category.
 */
export function parseSeniorFindings(text: string): SeniorFinding[] {
  return parseFindings(text).map((finding) => {
    const colon = finding.category.indexOf(":")
    if (colon === -1) return { ...finding, priority: priorityForCategory(finding.category) }
    const priority = finding.category.slice(0, colon).trim()
    const category = finding.category.slice(colon + 1).trim()
    return {
      ...finding,
      category,
      priority: (FINDING_PRIORITIES as readonly string[]).includes(priority)
        ? (priority as FindingPriority)
        : priorityForCategory(category),
    }
  })
}

/**
 * Order findings for a "fix this first" report: must-fix before should-fix
 * before nits, preserving the reviewer's original order within a priority.
 */
export function rankSeniorFindings(findings: readonly SeniorFinding[]): SeniorFinding[] {
  return findings
    .map((finding, index) => ({ finding, index }))
    .sort((a, b) => PRIORITY_RANK[a.finding.priority] - PRIORITY_RANK[b.finding.priority] || a.index - b.index)
    .map((entry) => entry.finding)
}

/** Parse then rank in one call. */
export function reviewAsSenior(text: string): SeniorFinding[] {
  return rankSeniorFindings(parseSeniorFindings(text))
}

/**
 * The review scope: the files a change touches, not just the diff. The changed
 * files plus their nearest importers (when a knowledge graph is supplied). A
 * thin, named seam over `selectDeepContext` with a review-sized default; the
 * graph stays optional — no provider degrades to diff-only.
 */
export function reviewScope(input: {
  changedFiles: readonly string[]
  provider?: GraphProvider | null
  depth?: number
  maxFiles?: number
}): { files: string[]; changed: string[]; impacted: ImpactedFile[]; usedGraph: boolean; truncated: boolean } {
  return selectDeepContext({
    changedFiles: input.changedFiles,
    provider: input.provider,
    depth: input.depth,
    maxFiles: input.maxFiles ?? DEFAULT_MAX_DEEP_CONTEXT_FILES,
  })
}

// --- shortcut: ledger (/ponytail-debt) -------------------------------------

export interface ShortcutEntry {
  file: string
  /** 1-based line number. */
  line: number
  /** The text after `shortcut:`, minus any trailing comment terminator. */
  note: string
}

// A comment marker directly followed by `shortcut:`. Deliberately strict so a
// prose mention (e.g. a rule file documenting the convention) is not a finding.
const SHORTCUT_LINE = /(?:\/\/|\/\*|<!--|#|\*)\s*shortcut:\s*(.+?)\s*(?:\*\/|-->)?\s*$/

/**
 * Extract `shortcut:` markers from one file's content. Pure: the caller reads
 * the file. Line numbers are 1-based; `note` is everything after the marker.
 */
export function extractShortcuts(file: string, content: string): ShortcutEntry[] {
  const entries: ShortcutEntry[] = []
  const lines = content.split("\n")
  for (let i = 0; i < lines.length; i++) {
    const match = SHORTCUT_LINE.exec(lines[i])
    if (!match) continue
    entries.push({ file, line: i + 1, note: match[1].trim() })
  }
  return entries
}

/** Render the ledger as a stable, file-grouped markdown report. */
export function formatDebtLedger(entries: readonly ShortcutEntry[]): string {
  if (entries.length === 0) return "No `shortcut:` markers found — the ledger is empty."
  const byFile = new Map<string, ShortcutEntry[]>()
  for (const entry of entries) {
    const list = byFile.get(entry.file)
    if (list) list.push(entry)
    else byFile.set(entry.file, [entry])
  }
  const out: string[] = [`# Shortcut debt — ${entries.length} marker(s)`, ""]
  for (const file of [...byFile.keys()].sort()) {
    out.push(`## ${file}`)
    for (const entry of byFile.get(file)!.sort((a, b) => a.line - b.line)) {
      out.push(`- L${entry.line}: ${entry.note}`)
    }
    out.push("")
  }
  return out.join("\n").trimEnd()
}
