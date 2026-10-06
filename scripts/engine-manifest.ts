#!/usr/bin/env bun
/**
 * engine-manifest.ts — derive and verify the NoCowboy engine manifest.
 *
 * `engine-manifest.json` is the measurable provenance baseline of the fork:
 * the NoCowboy root commit, the declared upstream tag/SHA and how far its
 * provenance can be trusted, the engine-shaping dependency versions (OpenTUI,
 * AI SDK, MCP SDK), and the local upstream backports. The values are *derived*
 * from git, package.json and backport-ledger.json — this script generates the
 * file, and `--check` re-derives it and fails on any drift (a dependency bump
 * or a new backport that was not reflected).
 *
 * Usage:
 *   bun run scripts/engine-manifest.ts           # (re)write engine-manifest.json
 *   bun run scripts/engine-manifest.ts --check    # exit 1 on drift/invalid
 */
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  ENGINE_MANIFEST_SCHEMA_VERSION,
  validateEngineManifest,
  type EngineManifest,
} from "../packages/opencode/src/nocowboy/engine/manifest"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const MANIFEST_PATH = join(ROOT, "engine-manifest.json")
const LEDGER_PATH = join(ROOT, "backport-ledger.json")

// The fork declares Kilo Code v7.3.46. The tag SHA is what GitHub's `v7.3.46`
// tag resolves to; no byte-for-byte match with the imported snapshot was
// established, so the provenance stays "declared".
const UPSTREAM_PROJECT = "Kilo Code"
const UPSTREAM_URL = "https://github.com/kilo-org/kilocode.git"
const UPSTREAM_VERSION = "v7.3.46"
const UPSTREAM_TAG_SHA = "f388b60ab579adef7cf1a6c022082100338d6450"

function git(args: string[]): { ok: boolean; out: string } {
  const proc = Bun.spawnSync(["git", ...args], { cwd: ROOT, stdout: "pipe", stderr: "pipe" })
  return { ok: proc.exitCode === 0, out: proc.stdout.toString().trim() }
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf-8"))
}

function deriveDependencies(): Record<string, string> {
  const root = readJson(join(ROOT, "package.json"))
  const opencode = readJson(join(ROOT, "packages/opencode/package.json"))
  const catalog: Record<string, string> = root?.workspaces?.catalog ?? {}
  const deps: Record<string, string> = { ...(opencode?.dependencies ?? {}) }

  const resolve = (name: string): string | undefined => {
    const value = deps[name]
    if (value && value !== "catalog:") return value
    return catalog[name]
  }

  const picked: Record<string, string> = {}
  for (const name of ["@opentui/core", "@opentui/solid", "ai", "@ai-sdk/provider", "@modelcontextprotocol/sdk"]) {
    const version = resolve(name)
    if (!version) throw new Error(`cannot resolve dependency version for ${name}`)
    picked[name] = version
  }
  return picked
}

function deriveBackports(): EngineManifest["backports"] {
  const ledger = readJson(LEDGER_PATH)
  const entries = Array.isArray(ledger?.entries) ? ledger.entries : []
  const byStatus: Record<string, number> = {}
  for (const entry of entries) {
    const status = String(entry?.status ?? "unknown")
    byStatus[status] = (byStatus[status] ?? 0) + 1
  }
  // Stable key order: sort statuses alphabetically.
  const sorted: Record<string, number> = {}
  for (const key of Object.keys(byStatus).sort()) sorted[key] = byStatus[key]
  return { ledger: "backport-ledger.json", count: entries.length, byStatus: sorted }
}

function buildManifest(): EngineManifest {
  const root = git(["rev-list", "--max-parents=0", "--max-count=1", "HEAD"])
  if (!root.ok || !root.out) throw new Error("cannot read the NoCowboy root commit (git rev-list)")
  const date = git(["show", "-s", "--format=%cs", root.out])
  if (!date.ok || !date.out) throw new Error("cannot read the root commit date (git show)")

  return {
    schemaVersion: ENGINE_MANIFEST_SCHEMA_VERSION,
    engine: { name: "NoCowboy", rootCommit: root.out, rootCommitDate: date.out },
    upstream: {
      project: UPSTREAM_PROJECT,
      url: UPSTREAM_URL,
      declaredVersion: UPSTREAM_VERSION,
      declaredTagSha: UPSTREAM_TAG_SHA,
      byteMatchEstablished: false,
    },
    provenance: {
      kind: "imported-snapshot",
      confidence: "declared",
      notes:
        "The fork was imported as a snapshot declaring Kilo Code v7.3.46. A byte-for-byte match " +
        "between the snapshot and the upstream tag/SHA was NOT established, and there is no " +
        ".opencode-version marker, so the origin is declared, not verified.",
    },
    dependencies: deriveDependencies(),
    backports: deriveBackports(),
  }
}

function serialize(manifest: EngineManifest): string {
  return JSON.stringify(manifest, null, 2) + "\n"
}

function main() {
  const check = process.argv.includes("--check")

  let fresh: EngineManifest
  try {
    fresh = buildManifest()
  } catch (error) {
    console.error(`❌ ${(error as Error).message}`)
    process.exit(1)
  }

  const validation = validateEngineManifest(fresh)
  if (validation.length > 0) {
    console.error(`❌ derived manifest is invalid (${validation.length} problem(s)):`)
    for (const problem of validation) console.error(`   - ${problem}`)
    process.exit(1)
  }

  const serialized = serialize(fresh)

  if (check) {
    let existing: string
    try {
      existing = readFileSync(MANIFEST_PATH, "utf-8")
    } catch (error) {
      console.error(`❌ cannot read engine-manifest.json: ${(error as Error).message}`)
      process.exit(1)
    }
    let parsed: EngineManifest
    try {
      parsed = JSON.parse(existing) as EngineManifest
    } catch (error) {
      console.error(`❌ engine-manifest.json is not valid JSON: ${(error as Error).message}`)
      process.exit(1)
    }
    const fileProblems = validateEngineManifest(parsed)
    if (fileProblems.length > 0) {
      console.error(`❌ engine-manifest.json has ${fileProblems.length} problem(s):`)
      for (const problem of fileProblems) console.error(`   - ${problem}`)
      process.exit(1)
    }
    if (existing !== serialized) {
      console.error("❌ engine-manifest.json is out of date (drift vs git/package.json/backport ledger).")
      console.error("   Regenerate: bun run scripts/engine-manifest.ts")
      process.exit(1)
    }
    console.log(
      `✅ engine manifest in sync: root ${fresh.engine.rootCommit.slice(0, 10)} (${fresh.engine.rootCommitDate}), ` +
        `upstream ${fresh.upstream.project} ${fresh.upstream.declaredVersion} (${fresh.provenance.confidence}), ` +
        `${fresh.backports.count} backports`,
    )
    return
  }

  writeFileSync(MANIFEST_PATH, serialized, "utf-8")
  console.log(
    `✅ engine-manifest.json written: root ${fresh.engine.rootCommit.slice(0, 10)}, ` +
      `${Object.keys(fresh.dependencies).length} deps, ${fresh.backports.count} backports`,
  )
}

main()
