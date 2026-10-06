/**
 * Over-engineering review — structure the findings of a `/ponytail-review`.
 *
 * A fresh pass over the current diff asks "what can we delete or simplify?"
 * and answers in prose. This module turns that prose into a typed list so the
 * result is countable, renderable and machine-checkable, and keeps the review a
 * *discipline* rather than a vibe. Inspired by Ponytail.
 *
 * Pure: parse/render/summarize are deterministic and engine-free.
 */

export const OE_CATEGORIES = [
  "duplication",
  "unnecessary-abstraction",
  "dead-code",
  "premature-generalization",
  "unneeded-dependency",
  "over-configuration",
  "other",
] as const
export type OverEngineeringCategory = (typeof OE_CATEGORIES)[number]

export interface OverEngineeringFinding {
  category: OverEngineeringCategory
  /** What to change (file:line, symbol, or feature). */
  target: string
  /** What to do — remove, inline, delete, drop the dependency. */
  suggestion: string
}

const ALIASES: Record<string, OverEngineeringCategory> = {
  dup: "duplication",
  duplicate: "duplication",
  duplication: "duplication",
  "unnecessary-abstraction": "unnecessary-abstraction",
  abstraction: "unnecessary-abstraction",
  "over-abstraction": "unnecessary-abstraction",
  "dead-code": "dead-code",
  deadcode: "dead-code",
  dead: "dead-code",
  "premature-generalization": "premature-generalization",
  generalization: "premature-generalization",
  "unneeded-dependency": "unneeded-dependency",
  dependency: "unneeded-dependency",
  "over-configuration": "over-configuration",
  config: "over-configuration",
  configuration: "over-configuration",
}

/** Map a free-text category to a known one (unknown → "other"). */
export function normalizeCategory(value: string): OverEngineeringCategory {
  const key = value.trim().toLowerCase().replace(/[\s_]+/g, "-")
  return ALIASES[key] ?? "other"
}

function normalizeFinding(raw: unknown): OverEngineeringFinding | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const record = raw as Record<string, unknown>
  const target = typeof record.target === "string" ? record.target.trim() : ""
  const suggestion = typeof record.suggestion === "string" ? record.suggestion.trim() : ""
  if (!target || !suggestion) return undefined
  return {
    category: normalizeCategory(typeof record.category === "string" ? record.category : ""),
    target,
    suggestion,
  }
}

/**
 * Parse a `/ponytail-review` report. Accepts either a fenced JSON array of
 * `{category,target,suggestion}` or the canonical bullet lines
 * `- [<category>] <target> — <suggestion>`. Unknown categories become "other";
 * a line that is not a finding is ignored. Returns [] when nothing is found.
 */
export function parseFindings(text: string): OverEngineeringFinding[] {
  const fenced = text.match(/```(?:json|overengineering)?\s*\n([\s\S]*?)```/)
  if (fenced) {
    try {
      const parsed = JSON.parse(fenced[1])
      if (Array.isArray(parsed)) {
        const findings = parsed.map(normalizeFinding).filter((f): f is OverEngineeringFinding => f !== undefined)
        if (findings.length > 0) return findings
      }
    } catch {
      // fall through to the bullet format
    }
  }

  const findings: OverEngineeringFinding[] = []
  for (const line of text.split("\n")) {
    // separator: em dash, en dash, or a spaced hyphen
    const match = line.match(/^\s*[-*]\s*\[([^\]]+)\]\s*(.+?)\s*(?:—|–|\s-\s)\s*(.+)$/)
    if (!match) continue
    findings.push({
      category: normalizeCategory(match[1]),
      target: match[2].trim(),
      suggestion: match[3].trim(),
    })
  }
  return findings
}

/** True when the text carries at least one finding. */
export function hasFindings(text: string): boolean {
  return parseFindings(text).length > 0
}

/** Render findings as the canonical bullet list. */
export function renderFindings(findings: OverEngineeringFinding[]): string {
  return findings.map((f) => `- [${f.category}] ${f.target} — ${f.suggestion}`).join("\n")
}

/** Counts by category — how much over-engineering of each kind was found. */
export function summarizeFindings(findings: OverEngineeringFinding[]): {
  total: number
  byCategory: Partial<Record<OverEngineeringCategory, number>>
} {
  const byCategory: Partial<Record<OverEngineeringCategory, number>> = {}
  for (const finding of findings) byCategory[finding.category] = (byCategory[finding.category] ?? 0) + 1
  return { total: findings.length, byCategory }
}
