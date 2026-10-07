/**
 * Deep-context selection — the pure "what goes into a deep context" signal.
 *
 * The content-assembly half of deep context (see `.nocowboy/specs/deep-context-2m.md`
 * §3) must not "dump the repository": it starts from the changelist and, when a
 * knowledge graph is available, adds the changed files' nearest importers. This
 * module is that decision, isolated from the engine — no clock, no filesystem, no
 * globals. Given the same changelist and provider it always returns the same
 * selection.
 *
 * The graph is optional and untrusted. A missing provider — or one that throws —
 * degrades to diff-only rather than failing the caller, so deep context still
 * works on a machine where no graph was ever built.
 */

import type { EdgeConfidence, GraphProvider, ImpactedFile } from "@/nocowboy/knowledge-graph"

/** How many files a deep-context selection may include by default. */
export const DEFAULT_MAX_DEEP_CONTEXT_FILES = 40

export interface DeepContextSelection {
  /** Selected files: changed first, then nearest importers; deduped and ordered. */
  files: string[]
  /** The usable changelist entries (trimmed, non-empty, deduped, input order). */
  changed: string[]
  /** Importers actually added to `files`, nearest first. */
  impacted: ImpactedFile[]
  /** True when a GraphProvider was consulted and did not throw. */
  usedGraph: boolean
  /** True when impacters were dropped to honour `maxFiles`. */
  truncated: boolean
}

export interface DeepContextSelectionInput {
  /** Raw changelist (diff files). Non-strings/blank entries are ignored. */
  changedFiles: readonly string[]
  /** Optional knowledge graph; `null`/absent → diff-only. */
  provider?: GraphProvider | null
  /** Import hops to traverse; forwarded to the provider (its default applies). */
  depth?: number
  /** Selection budget; all changed files are kept regardless. Default 40. */
  maxFiles?: number
}

/**
 * Select the files for a deep context: the changed files plus their nearest
 * importers (when a graph is supplied). Pure and total — it never throws, even
 * on garbage input or a misbehaving provider.
 */
export function selectDeepContext(input: DeepContextSelectionInput): DeepContextSelection {
  const changed = sanitizeChanged(input.changedFiles)
  const diffOnly: DeepContextSelection = {
    files: [...changed],
    changed,
    impacted: [],
    usedGraph: false,
    truncated: false,
  }

  // No changelist, or no graph to consult → diff-only.
  if (changed.length === 0 || !input.provider) return diffOnly

  let raw: readonly unknown[]
  try {
    raw = input.provider.impacted(changed, input.depth)
  } catch {
    // A provider that throws is a broken *optional* dependency, not a fatal
    // error: degrade to diff-only exactly as if no graph had been supplied.
    return diffOnly
  }

  const ordered = orderImpacted(raw, changed)
  const budget = Math.max(0, normalizeMaxFiles(input.maxFiles) - changed.length)
  const kept = ordered.slice(0, budget)

  return {
    files: [...changed, ...kept.map((entry) => entry.file)],
    changed,
    impacted: kept,
    usedGraph: true,
    truncated: kept.length < ordered.length,
  }
}

/** Keep only usable entries: strings, trimmed, non-empty, deduped, input order. */
function sanitizeChanged(files: readonly unknown[]): string[] {
  const out: string[] = []
  if (!Array.isArray(files)) return out
  const seen = new Set<string>()
  for (const raw of files) {
    if (typeof raw !== "string") continue
    const file = raw.trim()
    if (file.length === 0 || seen.has(file)) continue
    seen.add(file)
    out.push(file)
  }
  return out
}

/**
 * Validate, dedupe and order impacters: distance asc, then `exact` before
 * `heuristic`, then path asc. Entries already in `changed` are dropped, as are
 * malformed ones — a provider is untrusted and must not poison the selection.
 */
function orderImpacted(raw: readonly unknown[], changed: readonly string[]): ImpactedFile[] {
  const out: ImpactedFile[] = []
  if (!Array.isArray(raw)) return out
  const changedSet = new Set(changed)

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const record = entry as Record<string, unknown>
    const file = record.file
    if (typeof file !== "string" || file.length === 0 || changedSet.has(file)) continue
    out.push({
      file,
      distance: normalizeDistance(record.distance),
      confidence: normalizeConfidence(record.confidence),
    })
  }

  out.sort(
    (a, b) =>
      a.distance - b.distance ||
      confidenceRank(a.confidence) - confidenceRank(b.confidence) ||
      (a.file < b.file ? -1 : a.file > b.file ? 1 : 0),
  )

  // Dedupe after sorting so the first (nearest/best) occurrence wins.
  const seen = new Set<string>()
  const deduped: ImpactedFile[] = []
  for (const entry of out) {
    if (seen.has(entry.file)) continue
    seen.add(entry.file)
    deduped.push(entry)
  }
  return deduped
}

function normalizeDistance(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return Number.MAX_SAFE_INTEGER
  return Math.max(0, Math.floor(value))
}

/** Unknown confidence is treated as `heuristic` so it never jumps ahead of `exact`. */
function normalizeConfidence(value: unknown): EdgeConfidence {
  return value === "exact" ? "exact" : "heuristic"
}

function confidenceRank(confidence: EdgeConfidence): number {
  return confidence === "exact" ? 0 : 1
}

function normalizeMaxFiles(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_MAX_DEEP_CONTEXT_FILES
  return Math.max(0, Math.floor(value))
}
