#!/usr/bin/env bun
/**
 * perf-check.ts — cold-start and peak-RSS benchmark for the CLI.
 *
 * `rc-performance-test` gates the release on a cold start < 500ms and RSS
 * < 200MB. This script measures the CLI bootstrap (`--version`, the module
 * graph load path) over N runs and the peak resident set size of the child
 * process, then prints the numbers. It is a repeatable proxy for the CLI cold
 * start; the interactive TUI path is not measured headlessly.
 *
 * Usage:
 *   bun run scripts/perf-check.ts            # human summary
 *   bun run scripts/perf-check.ts --json      # machine output
 *   bun run scripts/perf-check.ts --assert    # exit 1 if a threshold is exceeded
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

const RUNS = 5
const COLD_START_MS = 500
const RSS_MB = 200

const ROOT = join(import.meta.dir, "..")
const ENTRY = join(ROOT, "packages/opencode/src/index.ts")

function peakRssKb(pid: number): number {
  try {
    const status = readFileSync(`/proc/${pid}/status`, "utf-8")
    const match = status.match(/VmHWM:\s+(\d+)\s+kB/)
    return match ? Number(match[1]) : 0
  } catch {
    return 0
  }
}

async function runOnce(): Promise<{ ms: number; rssKb: number }> {
  const started = performance.now()
  const proc = Bun.spawn(
    ["bun", "run", "--conditions=browser", ENTRY, "--version"],
    { stdout: "ignore", stderr: "ignore" },
  )
  let rssKb = 0
  const poll = setInterval(() => {
    const rss = peakRssKb(proc.pid)
    if (rss > rssKb) rssKb = rss
  }, 2)
  await proc.exited
  clearInterval(poll)
  const last = peakRssKb(proc.pid)
  if (last > rssKb) rssKb = last
  return { ms: performance.now() - started, rssKb }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

async function main() {
  const times: number[] = []
  let rssKb = 0
  for (let i = 0; i < RUNS; i++) {
    const result = await runOnce()
    times.push(result.ms)
    rssKb = Math.max(rssKb, result.rssKb)
  }
  const result = {
    runs: RUNS,
    coldStartMs: { min: Math.round(Math.min(...times)), median: Math.round(median(times)), max: Math.round(Math.max(...times)) },
    peakRssMb: Math.round((rssKb / 1024) * 10) / 10,
    thresholds: { coldStartMs: COLD_START_MS, peakRssMb: RSS_MB },
    pass: median(times) < COLD_START_MS && rssKb / 1024 < RSS_MB,
  }

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(
      `cold start: min ${result.coldStartMs.min}ms / median ${result.coldStartMs.median}ms / max ${result.coldStartMs.max}ms (limit ${COLD_START_MS}ms)`,
    )
    console.log(`peak RSS: ${result.peakRssMb} MB (limit ${RSS_MB} MB)`)
    console.log(result.pass ? "✅ within thresholds" : "❌ threshold exceeded")
  }

  if (process.argv.includes("--assert") && !result.pass) process.exit(1)
}

await main()
