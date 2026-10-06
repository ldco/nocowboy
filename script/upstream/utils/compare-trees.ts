#!/usr/bin/env bun
/**
 * compare-trees.ts — compare upstream and NoCowboy trees *after normalization*.
 *
 * The NoCowboy tree is an imported snapshot of Kilo Code (see
 * engine-manifest.json), so it shares no Git ancestry with upstream. That makes
 * a line-by-line diff meaningless: the two trees differ first by branding
 * (`nocowboy` vs `kilocode` vs `opencode`, `@nocowboy/*` vs `@kilocode/*`).
 * This module normalizes package names and paths before any comparison, and
 * emits the dry-run report for the NoCowboy merge profile.
 *
 * Usage:
 *   bun run script/upstream/utils/compare-trees.ts --dry-run
 */
import { assertNoLegacyRewrite, nocowboyConfig, type MergeConfig } from "./config"

/** Package scopes that are pure branding differences between the two trees. */
const BRAND_SCOPES = ["@nocowboy/", "@kilocode/", "@opencode-ai/"]
/** Bare single-segment package names that are branding only. */
const BRAND_BARE = /^(?:opencode-ai|kilo-ai|kilocode|nocowboy)$/
/** Path segments that are branding only. */
const BRAND_SEGMENTS = new Set(["nocowboy", "kilocode", "opencode", "opencode-ai", "kilo"])

/** Canonical form of a package name, independent of which tree it came from. */
export function normalizePackageName(name: string): string {
  let out = name
  for (const scope of BRAND_SCOPES) out = out.split(scope).join("@engine/")
  return out.replace(BRAND_BARE, "engine")
}

/** Canonical form of a repo path, independent of which tree it came from. */
export function normalizePath(input: string): string {
  return input
    .split("/")
    .map((segment) => (BRAND_SEGMENTS.has(segment) ? "engine" : segment))
    .join("/")
}

export interface TreeDiff {
  /** Normalized paths present only in our tree. */
  onlyOurs: string[]
  /** Normalized paths present only upstream. */
  onlyTheirs: string[]
  /** Normalized paths present on both sides. */
  common: string[]
}

/**
 * Compare two path lists after normalization. Normalization runs first, so a
 * renamed package/path does not show up as a spurious add/remove.
 */
export function compareTrees(ours: string[], theirs: string[]): TreeDiff {
  const a = new Set(ours.map(normalizePath))
  const b = new Set(theirs.map(normalizePath))
  return {
    onlyOurs: [...a].filter((p) => !b.has(p)).sort(),
    onlyTheirs: [...b].filter((p) => !a.has(p)).sort(),
    common: [...a].filter((p) => b.has(p)).sort(),
  }
}

/**
 * Dry-run report for a merge profile. It states the read-only posture of the
 * upstream checkout and lists the inbound-only package mappings and the
 * preserved NoCowboy directories — the plan, with no files touched.
 */
export function buildMergeDryRunReport(profile: MergeConfig = nocowboyConfig): string {
  assertNoLegacyRewrite(profile)
  return [
    "# NoCowboy merge profile — dry run",
    "",
    `upstream remote: ${profile.upstreamRemote} (read-only reference)`,
    `upstream checkout: read-only — never injected into the working paths`,
    `origin remote: ${profile.originRemote}`,
    `base branch: ${profile.baseBranch}`,
    `branch prefix: ${profile.branchPrefix}`,
    "",
    "## Package mappings (inbound only, @kilocode/* → @nocowboy/*)",
    ...(profile.packageMappings.length > 0
      ? profile.packageMappings.map((m) => `- ${m.from} → ${m.to}`)
      : ["- (none)"]),
    "",
    "## Preserved NoCowboy directories",
    ...profile.kiloDirectories.map((d) => `- ${d}`),
    "",
    "No files were modified (dry run).",
  ].join("\n")
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  if (args.includes("--dry-run")) {
    console.log(buildMergeDryRunReport())
  } else {
    console.log("usage: bun run script/upstream/utils/compare-trees.ts --dry-run")
    process.exit(1)
  }
}
