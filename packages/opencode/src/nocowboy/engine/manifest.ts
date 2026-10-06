/**
 * Engine manifest — the measurable provenance baseline of the NoCowboy engine.
 *
 * A fork of a fast-moving upstream needs a fixed, checkable record of where it
 * came from: the NoCowboy root commit, the declared upstream tag/SHA, how much
 * that provenance can be trusted (an imported snapshot whose byte-for-byte match
 * was never established is *declared*, not *verified*), the versions of the
 * engine-shaping dependencies (OpenTUI, AI SDK, MCP SDK), and the local upstream
 * backports. This module is the pure validator; `scripts/engine-manifest.ts`
 * derives the facts (git + package.json + backport ledger) and writes/checks the
 * file.
 *
 * Pure and deterministic: no engine, no network, no filesystem.
 */

export const ENGINE_MANIFEST_SCHEMA_VERSION = 1

/** How much the fork provenance can be trusted. */
export const PROVENANCE_CONFIDENCES = ["verified", "declared", "unknown"] as const
export type ProvenanceConfidence = (typeof PROVENANCE_CONFIDENCES)[number]

export interface EngineManifest {
  schemaVersion: number
  engine: {
    name: string
    /** NoCowboy root commit — the immutable fork point. */
    rootCommit: string
    /** Author date (YYYY-MM-DD) of the root commit. */
    rootCommitDate: string
  }
  upstream: {
    project: string
    /** The upstream repository URL the fork declares. */
    url: string
    /** The upstream version the fork declares it came from (e.g. "v7.3.46"). */
    declaredVersion: string
    /** The upstream git tag/SHA the declared version resolves to. */
    declaredTagSha: string
    /** Whether a byte-for-byte match with the declared tag/SHA was established. */
    byteMatchEstablished: boolean
  }
  provenance: {
    /** How the snapshot entered the repo, e.g. "imported-snapshot". */
    kind: string
    confidence: ProvenanceConfidence
    notes: string
  }
  /** Engine-shaping dependency versions (name -> version). */
  dependencies: Record<string, string>
  backports: {
    ledger: string
    count: number
    byStatus: Record<string, number>
  }
}

const SHA_RE = /^[0-9a-f]{7,40}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function requireString(value: unknown, field: string, errors: string[]): void {
  if (typeof value !== "string" || value.trim().length === 0) errors.push(`missing ${field}`)
}

/**
 * Validate the whole manifest. Returns one human-readable problem per violation
 * (empty array = valid).
 */
export function validateEngineManifest(manifest: EngineManifest): string[] {
  const errors: string[] = []
  if (!manifest || typeof manifest !== "object") return ["manifest is not an object"]
  if (manifest.schemaVersion !== ENGINE_MANIFEST_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${ENGINE_MANIFEST_SCHEMA_VERSION}`)
  }

  const engine = manifest.engine
  if (!engine || typeof engine !== "object") errors.push("missing engine")
  else {
    requireString(engine.name, "engine.name", errors)
    if (!SHA_RE.test(engine.rootCommit ?? "")) errors.push("engine.rootCommit must be a git SHA")
    if (!DATE_RE.test(engine.rootCommitDate ?? "")) errors.push("engine.rootCommitDate must be YYYY-MM-DD")
  }

  const upstream = manifest.upstream
  if (!upstream || typeof upstream !== "object") errors.push("missing upstream")
  else {
    requireString(upstream.project, "upstream.project", errors)
    requireString(upstream.url, "upstream.url", errors)
    requireString(upstream.declaredVersion, "upstream.declaredVersion", errors)
    if (!SHA_RE.test(upstream.declaredTagSha ?? "")) errors.push("upstream.declaredTagSha must be a git SHA")
    if (typeof upstream.byteMatchEstablished !== "boolean") {
      errors.push("upstream.byteMatchEstablished must be a boolean")
    }
  }

  const provenance = manifest.provenance
  if (!provenance || typeof provenance !== "object") errors.push("missing provenance")
  else {
    requireString(provenance.kind, "provenance.kind", errors)
    if (!PROVENANCE_CONFIDENCES.includes(provenance.confidence)) {
      errors.push(`provenance.confidence must be one of ${PROVENANCE_CONFIDENCES.join(", ")}`)
    }
    requireString(provenance.notes, "provenance.notes", errors)
    // The two fields are one claim and must agree in BOTH directions: a byte
    // match cannot exist without a "verified" confidence, and a "verified"
    // confidence cannot exist without the byte match that justifies it.
    if (upstream?.byteMatchEstablished === true && provenance.confidence !== "verified") {
      errors.push('provenance.confidence must be "verified" when upstream.byteMatchEstablished is true')
    }
    if (provenance.confidence === "verified" && upstream?.byteMatchEstablished !== true) {
      errors.push('provenance.confidence "verified" requires upstream.byteMatchEstablished to be true')
    }
  }

  const dependencies = manifest.dependencies
  if (!dependencies || typeof dependencies !== "object" || Array.isArray(dependencies)) {
    errors.push("missing dependencies")
  } else if (Object.keys(dependencies).length === 0) {
    errors.push("dependencies must not be empty")
  } else {
    for (const [name, version] of Object.entries(dependencies)) {
      requireString(name, "dependency name", errors)
      if (typeof version !== "string" || version.trim().length === 0) {
        errors.push(`dependency ${name}: missing version`)
      }
    }
  }

  const backports = manifest.backports
  if (!backports || typeof backports !== "object") errors.push("missing backports")
  else {
    requireString(backports.ledger, "backports.ledger", errors)
    if (!Number.isInteger(backports.count) || backports.count < 0) errors.push("backports.count must be a non-negative integer")
    if (!backports.byStatus || typeof backports.byStatus !== "object") {
      errors.push("missing backports.byStatus")
    } else {
      const sum = Object.values(backports.byStatus).reduce((acc, n) => acc + (typeof n === "number" ? n : 0), 0)
      if (sum !== backports.count) {
        errors.push(`backports.byStatus sums to ${sum}, expected backports.count (${backports.count})`)
      }
    }
  }

  return errors
}
