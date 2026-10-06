#!/usr/bin/env bun
/**
 * ownership-manifest.ts — classify every file as owned / adapted / generated /
 * inherited, and enforce that new shared-core changes are classified.
 *
 * The point (from the fork-management audit): ownership is NOT "anything under
 * src/nocowboy". The real adaptation lives in shared-core call sites —
 * `session/prompt.ts`, `tool/task.ts`, `permission/*` — which stay in the
 * upstream path but call into NoCowboy modules. Those must be classified too.
 *
 * Rules (in precedence order):
 *   generated  — files produced by generators (docs/ROADMAP.md, engine-manifest.json, …)
 *   owned      — NoCowboy-authored or NoCowboy-maintained roots/packages
 *   adapted    — a file outside the owned roots that either carries a
 *                `nocowboy_change`/`kilocode_change` marker or imports a
 *                NoCowboy module (`@/nocowboy/*` or `@nocowboy/*`), plus a small
 *                curated list of known marker-less adaptations
 *   inherited  — every other file (unmodified upstream core)
 *
 * Usage:
 *   bun run scripts/ownership-manifest.ts          # (re)write ownership-manifest.json
 *   bun run scripts/ownership-manifest.ts --check   # fail if the committed file is stale
 */
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const MANIFEST_PATH = join(ROOT, "ownership-manifest.json")

/** Files produced by generators — never hand-edited, excluded from ownership. */
const GENERATED = [
  "docs/ROADMAP.md",
  "docs/CHANGELOG.md",
  "docs/BACKLOG.md",
  "engine-manifest.json",
  "ownership-manifest.json",
  "docs/features/",
]

/** NoCowboy-authored / NoCowboy-maintained roots. A path here is `owned`. */
const OWNED_PREFIXES = [
  "packages/opencode/src/nocowboy/",
  "packages/opencode/test/nocowboy/",
  "packages/core/src/nocowboy/",
  "packages/opencode/src/nocowboy-sessions/",
  "packages/nocowboy-", // nocowboy-cli, -gateway, -indexing, -telemetry, -vscode
  "script/nocowboy/",
  ".nocowboy/",
  "scripts/",
  "packaging/",
  "docs/",
]

/** Our additions inside an otherwise-inherited upstream tree. */
const CURATED_OWNED = [
  "script/upstream/utils/compare-trees.ts",
  "script/upstream/utils/compare-trees.test.ts",
]

/**
 * Known adaptations that neither carry a marker nor import a NoCowboy module.
 * Kept explicit so the check documents them instead of silently missing them.
 */
const CURATED_ADAPTED = [
  // The plugin API gained the turn-level `session.stop` hook (NoCowboy addition).
  "packages/plugin/src/index.ts",
]

const MARKER = /nocowboy_change|kilocode_change/
const NOCOWBOY_IMPORT = /(?:from|require\()\s*["'](?:@\/nocowboy\/|@nocowboy\/|@nocowboy["'])/

export interface OwnershipManifest {
  schemaVersion: number
  rules: {
    generated: string[]
    owned_prefixes: string[]
    curated_owned: string[]
    adapted: string
    curated_adapted: string[]
    inherited: string
  }
  adapted: string[]
}

/** All tracked + untracked-but-not-ignored files. */
export function listFiles(root = ROOT): string[] {
  const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: root,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  })
  return out.split("\n").filter(Boolean).sort()
}

function isGenerated(file: string): boolean {
  return GENERATED.some((g) => (g.endsWith("/") ? file.startsWith(g) : file === g))
}

function isOwned(file: string, curatedOwned: Set<string>): boolean {
  return curatedOwned.has(file) || OWNED_PREFIXES.some((prefix) => file.startsWith(prefix))
}

/**
 * Read a file as UTF-8. Every text file is scanned with no size cap; only
 * binary files (a NUL byte in the first 8 KB) are skipped — they cannot carry a
 * marker or import meaningfully, and the rules state this explicitly.
 */
function readText(root: string, file: string): string | undefined {
  try {
    const abs = join(root, file)
    if (!statSync(abs).isFile()) return undefined
    const buffer = readFileSync(abs)
    if (buffer.subarray(0, 8192).includes(0)) return undefined
    return buffer.toString("utf-8")
  } catch {
    return undefined
  }
}

export function buildManifest(root = ROOT): OwnershipManifest {
  const files = listFiles(root)
  const curatedOwned = new Set(CURATED_OWNED.filter((f) => existsSync(join(root, f))))
  const curatedAdapted = CURATED_ADAPTED.filter((f) => existsSync(join(root, f)))
  const adapted = new Set<string>(curatedAdapted)

  for (const file of files) {
    if (isGenerated(file) || isOwned(file, curatedOwned)) continue
    const text = readText(root, file)
    if (text && (MARKER.test(text) || NOCOWBOY_IMPORT.test(text))) adapted.add(file)
  }

  return {
    schemaVersion: 1,
    rules: {
      generated: GENERATED,
      owned_prefixes: OWNED_PREFIXES,
      curated_owned: [...curatedOwned].sort(),
      adapted:
        "outside owned roots AND (contains a nocowboy_change/kilocode_change marker OR imports @/nocowboy/* or @nocowboy/*). Every text file is scanned regardless of extension and with no size cap; binary files (a NUL byte in the first 8 KB) are skipped. Plus curated_adapted.",
      curated_adapted: [...curatedAdapted].sort(),
      inherited: "every other file (unmodified upstream core)",
    },
    adapted: [...adapted].sort(),
  }
}

function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n"
}

function main() {
  const check = process.argv.includes("--check")
  const next = buildManifest()

  if (!check) {
    writeFileSync(MANIFEST_PATH, stringify(next), "utf-8")
    console.log(`✅ wrote ownership-manifest.json (${next.adapted.length} adapted)`)
    return
  }

  if (!existsSync(MANIFEST_PATH)) {
    console.error("❌ ownership-manifest.json is missing — run `bun run scripts/ownership-manifest.ts`")
    process.exit(1)
  }

  const committed = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as OwnershipManifest
  const nextAdapted = new Set(next.adapted)
  const committedAdapted = new Set(committed.adapted)
  const missing = next.adapted.filter((f) => !committedAdapted.has(f))
  const removed = committed.adapted.filter((f) => !nextAdapted.has(f))

  if (missing.length || removed.length) {
    console.error("❌ ownership-manifest.json is stale — run `bun run scripts/ownership-manifest.ts`")
    for (const f of missing) console.error(`  unclassified shared-core change: ${f}`)
    for (const f of removed) console.error(`  no longer adapted (marker/import gone): ${f}`)
    process.exit(1)
  }

  if (stringify(next.rules) !== stringify(committed.rules)) {
    console.error("❌ ownership-manifest.json rules are stale — run `bun run scripts/ownership-manifest.ts`")
    process.exit(1)
  }

  console.log(`✅ ownership-manifest.json is in sync (${next.adapted.length} adapted)`)
}

if (import.meta.main) main()
