#!/usr/bin/env bun
/**
 * ownership-manifest.ts — generate and verify the file-ownership manifest.
 *
 * `ownership-manifest.json` classifies the tree into owned / adapted / generated.
 * `--check` verifies it is in sync with the defining module and structurally
 * valid. `--check-staged` is the pre-commit gate: every staged path must be
 * classified, so a new shared-core file cannot land without an ownership class.
 *
 * Usage:
 *   bun run scripts/ownership-manifest.ts                 # (re)write the manifest
 *   bun run scripts/ownership-manifest.ts --check          # sync + valid
 *   bun run scripts/ownership-manifest.ts --check-staged   # gate staged paths
 */
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  DEFAULT_OWNERSHIP_MANIFEST,
  unclassifiedPaths,
  validateOwnershipManifest,
} from "../packages/opencode/src/nocowboy/ownership/manifest"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const MANIFEST_PATH = join(ROOT, "ownership-manifest.json")

function serialize(): string {
  return JSON.stringify(DEFAULT_OWNERSHIP_MANIFEST, null, 2) + "\n"
}

function git(args: string[]): string {
  const proc = Bun.spawnSync(["git", ...args], { cwd: ROOT, stdout: "pipe", stderr: "pipe" })
  return proc.exitCode === 0 ? proc.stdout.toString().trim() : ""
}

function main() {
  const args = process.argv.slice(2)

  const problems = validateOwnershipManifest(DEFAULT_OWNERSHIP_MANIFEST)
  if (problems.length > 0) {
    console.error(`❌ ownership manifest is invalid (${problems.length} problem(s)):`)
    for (const p of problems) console.error(`   - ${p}`)
    process.exit(1)
  }

  if (args.includes("--check-staged")) {
    const staged = git(["diff", "--cached", "--name-only"]).split("\n").filter(Boolean)
    const missing = unclassifiedPaths(staged)
    if (missing.length > 0) {
      console.error(`❌ ${missing.length} staged path(s) have no ownership class:`)
      for (const path of missing) console.error(`   - ${path}`)
      console.error("   Add a class/pattern in packages/opencode/src/nocowboy/ownership/manifest.ts.")
      process.exit(1)
    }
    console.log(`✅ ${staged.length} staged path(s) all classified`)
    return
  }

  if (args.includes("--check")) {
    let existing: string
    try {
      existing = readFileSync(MANIFEST_PATH, "utf-8")
    } catch (error) {
      console.error(`❌ cannot read ownership-manifest.json: ${(error as Error).message}`)
      process.exit(1)
    }
    if (existing !== serialize()) {
      console.error("❌ ownership-manifest.json is out of date (drift vs the defining module).")
      console.error("   Regenerate: bun run scripts/ownership-manifest.ts")
      process.exit(1)
    }
    console.log(
      `✅ ownership manifest in sync: ${DEFAULT_OWNERSHIP_MANIFEST.classes.owned.length} owned, ` +
        `${DEFAULT_OWNERSHIP_MANIFEST.classes.adapted.length} adapted, ` +
        `${DEFAULT_OWNERSHIP_MANIFEST.classes.generated.length} generated patterns, ` +
        `${DEFAULT_OWNERSHIP_MANIFEST.callSites.length} call sites`,
    )
    return
  }

  writeFileSync(MANIFEST_PATH, serialize(), "utf-8")
  console.log("✅ ownership-manifest.json written")
}

main()
