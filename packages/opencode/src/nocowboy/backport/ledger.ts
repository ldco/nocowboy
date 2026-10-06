/**
 * Upstream backport ledger — structured record of every ported upstream change.
 *
 * A selective backport is only safe if we remember, for each one: which upstream
 * commit it came from, why we needed it, which contract it touched, where the
 * adaptation lives, and how it is verified. Without that record a later port can
 * silently reintroduce semantics we already fixed (or re-apply a patch by hand
 * and drift from it). This module is the pure validator for `backport-ledger.json`.
 *
 * Pure and deterministic: no engine, no network, no filesystem. The `--check`
 * CLI wraps it; the ledger is curated, so there is nothing to generate.
 */

export const BACKPORT_LEDGER_SCHEMA_VERSION = 1

export type BackportStatus = "done" | "planned" | "blocked" | "abandoned" | "n/a"

export const BACKPORT_STATUSES: readonly BackportStatus[] = ["done", "planned", "blocked", "abandoned", "n/a"]

export interface BackportLedgerEntry {
  /** Stable id (usually the roadmap item id or the audit ref, e.g. "T0.1"). */
  id: string
  /** Upstream commit SHA(s) the change was ported from. Empty for local-only / N/A. */
  upstream_shas: string[]
  /** Why we needed it locally (one sentence). */
  need: string
  /** The contract/files this port touches. */
  contracts: string[]
  /** Where the adaptation lives: local commit SHA(s) or file paths. */
  adaptation: string
  /** The command/check that verifies the port still holds. */
  verify: string
  status: BackportStatus
}

export interface BackportLedger {
  schemaVersion: number
  entries: BackportLedgerEntry[]
}

const NON_SHA = new Set(["local", "none", "n/a", "pending", "tbd"])

function isConcreteSha(sha: string): boolean {
  const value = sha.trim().toLowerCase()
  return value.length > 0 && !NON_SHA.has(value)
}

/** Upstream SHAs that appear in more than one entry — a repeated backport. */
export function duplicateUpstreamShas(ledger: BackportLedger): { sha: string; ids: string[] }[] {
  const bySha = new Map<string, string[]>()
  for (const entry of ledger.entries ?? []) {
    for (const sha of entry.upstream_shas ?? []) {
      if (!isConcreteSha(sha)) continue
      const key = sha.trim().toLowerCase()
      const ids = bySha.get(key) ?? []
      ids.push(entry.id)
      bySha.set(key, ids)
    }
  }
  return [...bySha.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([sha, ids]) => ({ sha, ids: [...new Set(ids)] }))
}

function required(value: unknown, field: string, where: string, errors: string[]): void {
  if (typeof value !== "string" || value.trim().length === 0) errors.push(`${where}: missing ${field}`)
}

/**
 * Validate the whole ledger. Returns one human-readable problem per violation
 * (empty array = valid). The five-part record — upstream SHA, need, contract,
 * adaptation, verify — is enforced per entry; a duplicated upstream SHA is a
 * violation (a port must be recorded once).
 */
export function validateBackportLedger(ledger: BackportLedger): string[] {
  const errors: string[] = []
  if (!ledger || typeof ledger !== "object") return ["ledger is not an object"]
  if (ledger.schemaVersion !== BACKPORT_LEDGER_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${BACKPORT_LEDGER_SCHEMA_VERSION}`)
  }
  const entries = ledger.entries
  if (!Array.isArray(entries) || entries.length === 0) {
    errors.push("entries must be a non-empty array")
    return errors
  }

  const seenIds = new Set<string>()
  for (const entry of entries) {
    const where = `entry ${entry?.id ?? "(missing id)"}`
    if (!entry || typeof entry !== "object") {
      errors.push(`${where}: not an object`)
      continue
    }
    if (typeof entry.id !== "string" || entry.id.trim().length === 0) errors.push("entry: missing id")
    else if (seenIds.has(entry.id)) errors.push(`${where}: duplicate entry id`)
    else seenIds.add(entry.id)

    required(entry.need, "need", where, errors)
    required(entry.adaptation, "adaptation", where, errors)
    required(entry.verify, "verify", where, errors)
    if (!Array.isArray(entry.contracts) || entry.contracts.length === 0) {
      errors.push(`${where}: missing contracts`)
    }
    if (!Array.isArray(entry.upstream_shas)) {
      errors.push(`${where}: upstream_shas must be an array`)
    }
    if (!BACKPORT_STATUSES.includes(entry.status)) {
      errors.push(`${where}: invalid status "${entry.status}"`)
    }
    // A port that claims to be done must name an upstream SHA (concrete, or an
    // explicit local/none sentinel) — an empty array on a done port is incomplete.
    if (entry.status === "done" && Array.isArray(entry.upstream_shas) && entry.upstream_shas.length === 0) {
      errors.push(`${where}: a done port must record upstream_shas (use "local" for NoCowboy-only work)`)
    }
  }

  for (const dup of duplicateUpstreamShas(ledger)) {
    errors.push(`duplicate upstream SHA ${dup.sha} across entries: ${dup.ids.join(", ")}`)
  }
  return errors
}
