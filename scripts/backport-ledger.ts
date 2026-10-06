#!/usr/bin/env bun
/**
 * backport-ledger.ts — validate the upstream backport ledger.
 *
 * `backport-ledger.json` records each selective upstream port (upstream SHA →
 * local need → affected contract → adaptation → verify) so a later port cannot
 * silently reintroduce semantics we already fixed, and a hand port cannot drift
 * unnoticed. The ledger is curated, so this script validates rather than
 * generates: it enforces the five-part record per entry and fails on a
 * duplicated upstream SHA.
 *
 * Usage:
 *   bun run scripts/backport-ledger.ts          # print a summary
 *   bun run scripts/backport-ledger.ts --check   # exit 1 on any violation
 */
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  duplicateUpstreamShas,
  validateBackportLedger,
  type BackportLedger,
} from "../packages/opencode/src/nocowboy/backport/ledger"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const LEDGER_PATH = join(ROOT, "backport-ledger.json")

function main() {
  const check = process.argv.includes("--check")
  let ledger: BackportLedger
  try {
    ledger = JSON.parse(readFileSync(LEDGER_PATH, "utf-8")) as BackportLedger
  } catch (error) {
    console.error(`❌ cannot read ${LEDGER_PATH}: ${(error as Error).message}`)
    process.exit(1)
  }

  const errors = validateBackportLedger(ledger)
  if (errors.length > 0) {
    console.error(`❌ backport-ledger.json has ${errors.length} problem(s):`)
    for (const problem of errors) console.error(`   - ${problem}`)
    process.exit(1)
  }

  const counts = ledger.entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.status] = (acc[entry.status] ?? 0) + 1
    return acc
  }, {})
  const summary = Object.entries(counts)
    .map(([status, n]) => `${n} ${status}`)
    .join(", ")
  console.log(`✅ backport ledger valid: ${ledger.entries.length} entries (${summary}), no duplicate upstream SHA`)

  if (check) return
  const duplicates = duplicateUpstreamShas(ledger)
  if (duplicates.length > 0) console.log("duplicate upstream SHAs:", duplicates)
}

main()
