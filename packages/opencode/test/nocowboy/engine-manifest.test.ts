import { describe, expect, it } from "bun:test"
import {
  ENGINE_MANIFEST_SCHEMA_VERSION,
  validateEngineManifest,
  type EngineManifest,
} from "@/nocowboy/engine/manifest"

function valid(): EngineManifest {
  return {
    schemaVersion: ENGINE_MANIFEST_SCHEMA_VERSION,
    engine: { name: "NoCowboy", rootCommit: "ca721a26f9942817652ee4cbc42bf76da7f5d638", rootCommitDate: "2026-06-19" },
    upstream: {
      project: "Kilo Code",
      url: "https://github.com/kilo-org/kilocode.git",
      declaredVersion: "v7.3.46",
      declaredTagSha: "f388b60ab579adef7cf1a6c022082100338d6450",
      byteMatchEstablished: false,
    },
    provenance: {
      kind: "imported-snapshot",
      confidence: "declared",
      notes: "snapshot import; byte match not established",
    },
    dependencies: { "@opentui/core": "0.4.1", ai: "6.0.168", "@modelcontextprotocol/sdk": "1.29.0" },
    backports: { ledger: "backport-ledger.json", count: 13, byStatus: { done: 8, "n/a": 4, abandoned: 1 } },
  }
}

describe("validateEngineManifest", () => {
  it("accepts a complete manifest", () => {
    expect(validateEngineManifest(valid())).toEqual([])
  })

  it("rejects a wrong schema version", () => {
    const m = valid()
    m.schemaVersion = 99
    expect(validateEngineManifest(m).some((e) => e.includes("schemaVersion"))).toBe(true)
  })

  it("requires a git SHA for the root commit", () => {
    const m = valid()
    m.engine.rootCommit = "not-a-sha"
    expect(validateEngineManifest(m)).toContain("engine.rootCommit must be a git SHA")
  })

  it("requires a YYYY-MM-DD root commit date", () => {
    const m = valid()
    m.engine.rootCommitDate = "19.06.2026"
    expect(validateEngineManifest(m)).toContain("engine.rootCommitDate must be YYYY-MM-DD")
  })

  it("rejects an unknown provenance confidence", () => {
    const m = valid()
    ;(m.provenance as { confidence: string }).confidence = "probably"
    expect(validateEngineManifest(m).some((e) => e.includes("provenance.confidence"))).toBe(true)
  })

  it("rejects a declared confidence when the byte match IS established", () => {
    const m = valid()
    m.upstream.byteMatchEstablished = true
    m.provenance.confidence = "declared"
    expect(validateEngineManifest(m).some((e) => e.includes("byteMatchEstablished"))).toBe(true)
  })

  it("rejects a verified confidence when the byte match was not established", () => {
    const m = valid()
    m.upstream.byteMatchEstablished = false
    m.provenance.confidence = "verified"
    expect(validateEngineManifest(m).some((e) => e.includes("verified"))).toBe(true)
  })

  it("rejects empty dependencies", () => {
    const m = valid()
    m.dependencies = {}
    expect(validateEngineManifest(m)).toContain("dependencies must not be empty")
  })

  it("rejects a backport status histogram that does not sum to count", () => {
    const m = valid()
    m.backports.count = 13
    m.backports.byStatus = { done: 8 }
    expect(validateEngineManifest(m).some((e) => e.includes("byStatus sums"))).toBe(true)
  })

  it("rejects a non-integer backport count", () => {
    const m = valid()
    ;(m.backports as { count: unknown }).count = 1.5
    expect(validateEngineManifest(m)).toContain("backports.count must be a non-negative integer")
  })
})
