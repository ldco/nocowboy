/**
 * Over-Engineering Review — /ponytail-review findings parser.
 *
 * The 7-rung ladder (`.nocowboy/rules/lazy-senior.md`) says what NOT to write;
 * /ponytail-review says what to REMOVE from what is already written. Its output
 * uses one canonical line per finding:
 *
 *   - [<category>] <target> — <suggestion>
 *
 * Parsing is deliberately strict so a review is machine-readable, but safety
 * invariants are never actionable: a finding that would remove trust-boundary
 * validation, data-loss handling, security, error handling or accessibility is
 * separated out (protected), not returned as something to cut.
 *
 * Pure: no engine, no filesystem.
 */

export const OVER_ENGINEERING_CATEGORIES = [
  "duplication",
  "unnecessary-abstraction",
  "dead-code",
  "premature-generalization",
  "unneeded-dependency",
  "over-configuration",
  "over-engineering",
] as const
export type OverEngineeringCategory = (typeof OVER_ENGINEERING_CATEGORIES)[number]

export interface Finding {
  /** Free-form category tag from the line, e.g. "duplication". */
  category: string
  /** The code/thing to change. */
  target: string
  /** What to do about it. */
  suggestion: string
  /** The original line, for traceability. */
  raw: string
}

// `- [category] target — suggestion` (em dash or hyphen, surrounded by spaces).
const FINDING_LINE = /^\s*-\s*\[([^\]]+)\]\s*(.+?)\s+[—–-]\s+(.+?)\s*$/

/**
 * Words that mark a safety invariant. A finding that touches one of these is
 * never actionable by this review — safety is not over-engineering.
 */
export const SAFETY_INVARIANTS = [
  "trust-boundary",
  "trust boundary",
  "validation",
  "validate",
  "data-loss",
  "data loss",
  "security",
  "auth",
  "authorization",
  "authentication",
  "sanitization",
  "sanitize",
  "csrf",
  "xss",
  "injection",
  "escape",
  "error-handling",
  "error handling",
  "accessibility",
  "a11y",
  "atomic",
  "rollback",
  "stale-read",
  "boundary",
] as const

/** Parse canonical `- [category] target — suggestion` lines; ignore the rest. */
export function parseFindings(text: string): Finding[] {
  const findings: Finding[] = []
  for (const line of text.split("\n")) {
    const match = FINDING_LINE.exec(line)
    if (!match) continue
    findings.push({
      category: match[1]!.trim(),
      target: match[2]!.trim(),
      suggestion: match[3]!.trim(),
      raw: line.trim(),
    })
  }
  return findings
}

/** True when a finding touches a safety invariant (must not be cut). */
export function isSafetyInvariant(finding: Finding): boolean {
  const haystack = `${finding.target} ${finding.suggestion}`.toLowerCase()
  return SAFETY_INVARIANTS.some((word) => haystack.includes(word))
}

/**
 * Split parsed findings into the actionable ones and the protected safety
 * invariants. `/ponytail-review` only acts on `actionable`.
 */
export function splitFindings(findings: ReadonlyArray<Finding>): {
  actionable: Finding[]
  protected: Finding[]
} {
  const actionable: Finding[] = []
  const protectedFindings: Finding[] = []
  for (const finding of findings) {
    ;(isSafetyInvariant(finding) ? protectedFindings : actionable).push(finding)
  }
  return { actionable, protected: protectedFindings }
}

/** Convenience: parse then split. */
export function reviewOverEngineering(text: string): {
  actionable: Finding[]
  protected: Finding[]
} {
  return splitFindings(parseFindings(text))
}
