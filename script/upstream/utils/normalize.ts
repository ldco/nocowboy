#!/usr/bin/env bun
/**
 * Comparison-time normalization for the NoCowboy merge profile.
 *
 * The legacy Kilo pipeline *rewrites* files (opencode → @kilocode) before
 * merging. The NoCowboy profile does the opposite: upstream is a read-only
 * reference, so the only place package names and paths are reconciled is the
 * *comparison*. Normalizing both trees to a common vocabulary lets us diff the
 * upstream reference against the local tree without touching either on disk.
 *
 * Pure and deterministic: no filesystem, no git, no engine.
 */

export interface PackageMapping {
  from: string
  to: string
}

/** One entry in a tree being compared (path is repo-relative, posix). */
export interface TreeEntry {
  path: string
  content: string
}

/**
 * The canonical vocabulary for NoCowboy comparison: upstream (Kilo) names →
 * NoCowboy names. This is the *reverse* of the legacy pre-merge rewrite, and it
 * is applied to both sides at comparison time only — never written to a file.
 */
export const NOCOWBOY_NORMALIZATION: PackageMapping[] = [
  { from: "@kilocode/cli", to: "@nocowboy/cli" },
  { from: "@kilocode/sdk", to: "@nocowboy/sdk" },
  { from: "@kilocode/plugin", to: "@nocowboy/plugin" },
  { from: "opencode-ai", to: "@nocowboy/cli" },
  { from: "@opencode-ai/cli", to: "@nocowboy/cli" },
  { from: "@opencode-ai/sdk", to: "@nocowboy/sdk" },
  { from: "@opencode-ai/plugin", to: "@nocowboy/plugin" },
]

/** Normalize a repo-relative path to posix form for stable comparison. */
export function normalizeTreePath(input: string): string {
  return input
    .replaceAll("\\", "/")
    .split("/")
    .filter((segment) => segment.length > 0 && segment !== ".")
    .join("/")
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Replace every mapped package name in `text` with its canonical form. The
 * match boundary leaves a trailing `/subpath` intact (`@kilocode/sdk/v2` →
 * `@nocowboy/sdk/v2`) but never edits a longer sibling (`@kilocode/cli-extra`).
 */
export function normalizePackageNames(text: string, mappings: PackageMapping[] = NOCOWBOY_NORMALIZATION): string {
  let out = text
  for (const { from, to } of mappings) {
    if (!from) continue
    out = out.replace(new RegExp(`${escapeRegExp(from)}(?![A-Za-z0-9_-])`, "g"), to)
  }
  return out
}

export interface TreeDiff {
  /** Paths present only on the left (upstream reference). */
  onlyLeft: string[]
  /** Paths present only on the right (local tree). */
  onlyRight: string[]
  /** Paths present on both sides whose normalized content differs. */
  differing: string[]
  /** Paths present on both sides with identical normalized content. */
  same: string[]
}

/**
 * Compare two trees after normalizing paths and package names on both sides.
 * The result is sorted and deterministic; content is normalized before the
 * equality check so a rename in the fork namespace is not reported as drift.
 */
export function compareTrees(
  left: ReadonlyArray<TreeEntry>,
  right: ReadonlyArray<TreeEntry>,
  mappings: PackageMapping[] = NOCOWBOY_NORMALIZATION,
): TreeDiff {
  const leftMap = new Map<string, string>()
  for (const entry of left) leftMap.set(normalizeTreePath(entry.path), normalizePackageNames(entry.content, mappings))
  const rightMap = new Map<string, string>()
  for (const entry of right) rightMap.set(normalizeTreePath(entry.path), normalizePackageNames(entry.content, mappings))

  const onlyLeft: string[] = []
  const onlyRight: string[] = []
  const differing: string[] = []
  const same: string[] = []

  for (const [path, content] of leftMap) {
    const other = rightMap.get(path)
    if (other === undefined) onlyLeft.push(path)
    else if (other === content) same.push(path)
    else differing.push(path)
  }
  for (const path of rightMap.keys()) {
    if (!leftMap.has(path)) onlyRight.push(path)
  }

  return {
    onlyLeft: onlyLeft.sort(),
    onlyRight: onlyRight.sort(),
    differing: differing.sort(),
    same: same.sort(),
  }
}
