#!/usr/bin/env bun
/**
 * compare.ts — NoCowboy merge-profile report and normalized tree comparison.
 *
 * Two modes:
 *
 *   bun script/upstream/compare.ts --profile nocowboy --report
 *     Print the active profile and assert it does NOT run the legacy
 *     OpenCode→Kilo rewrites. Exits 1 if the profile would rewrite
 *     `@nocowboy/*` → `@kilocode/*` or otherwise write to upstream.
 *
 *   bun script/upstream/compare.ts --left <upstream-dir> --right <local-dir>
 *     Compare two trees after normalizing package names and paths on BOTH
 *     sides (comparison only — nothing on disk is modified). Read-only.
 *
 * This is the NoCowboy workflow: upstream is a read-only reference, reconciled
 * on comparison, never transformed in place.
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { canMergeInPlace, loadProfile, type MergeConfig, type ProfileName } from "./utils/config"
import { NOCOWBOY_NORMALIZATION, compareTrees, type TreeEntry } from "./utils/normalize"

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : undefined
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

const PROFILE_NAMES: ProfileName[] = ["kilocode", "nocowboy"]

function resolveConfig(): { name: ProfileName; config: MergeConfig } {
  const raw = (arg("profile") ?? "nocowboy") as ProfileName
  if (!PROFILE_NAMES.includes(raw)) {
    console.error(`❌ unknown profile "${raw}" (expected: ${PROFILE_NAMES.join(", ")})`)
    process.exit(2)
  }
  return { name: raw, config: loadProfile(raw) }
}

/** A profile violates the NoCowboy contract if it renames its own namespace away. */
function violations(name: ProfileName, config: MergeConfig): string[] {
  const problems: string[] = []
  const renamesOwn = config.packageMappings.filter(
    (m) => m.from.startsWith("@nocowboy") && m.to.startsWith("@kilocode"),
  )
  if (renamesOwn.length > 0) {
    problems.push(`packageMappings rewrites @nocowboy/* -> @kilocode/*: ${renamesOwn.map((m) => m.from).join(", ")}`)
  }
  if (name === "nocowboy" && !config.readOnlyUpstream) {
    problems.push("nocowboy profile must hold upstream as a read-only reference (readOnlyUpstream)")
  }
  return problems
}

function report(): void {
  const { name, config } = resolveConfig()
  const problems = violations(name, config)
  console.log(`Merge profile: ${name}`)
  console.log(`  upstream access: ${config.readOnlyUpstream ? "read-only reference" : "merge source (in-place)"}`)
  console.log(`  write-time package renames: ${config.packageMappings.length}`)
  console.log(`  branding take-theirs patterns: ${config.takeTheirsAndTransform.length}`)
  console.log(`  comparison normalization mappings: ${NOCOWBOY_NORMALIZATION.length}`)
  console.log(`  rewrites @nocowboy/* -> @kilocode/*: ${problems.length ? "YES" : "no"}`)
  console.log(`  in-place merge: ${canMergeInPlace(config) ? "allowed" : "refused (upstream read-only)"}`)
  if (problems.length > 0) {
    for (const problem of problems) console.error(`❌ ${problem}`)
    process.exit(1)
  }
  console.log(`✅ profile "${name}" keeps the NoCowboy namespace and treats upstream read-only`)
}

function readTree(root: string): TreeEntry[] {
  const out: TreeEntry[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === ".git" || name === "dist") continue
      const full = join(dir, name)
      const st = statSync(full)
      if (st.isDirectory()) walk(full)
      else if (st.isFile()) out.push({ path: relative(root, full).replaceAll("\\", "/"), content: readFileSync(full, "utf-8") })
    }
  }
  walk(root)
  return out
}

function compare(): void {
  const left = arg("left")
  const right = arg("right")
  if (!left || !right) {
    console.error("❌ compare mode needs --left <upstream-dir> --right <local-dir>")
    process.exit(2)
  }
  const diff = compareTrees(readTree(left), readTree(right))
  console.log("Normalized tree comparison (read-only; nothing modified):")
  console.log(`  same:      ${diff.same.length}`)
  console.log(`  differing: ${diff.differing.length}`)
  console.log(`  only upstream: ${diff.onlyLeft.length}`)
  console.log(`  only local:    ${diff.onlyRight.length}`)
  const limit = Number(arg("limit") ?? 40)
  for (const path of diff.differing.slice(0, limit)) console.log(`  ~ ${path}`)
}

if (flag("report") || flag("dry-run")) {
  report()
} else {
  compare()
}
