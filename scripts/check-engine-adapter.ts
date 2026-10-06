#!/usr/bin/env bun
/**
 * check-engine-adapter.ts — enforce a single engine entry point.
 *
 * The `@nocowboy/engine-adapter` binds the runtime ports to the engine and is
 * the only module (besides tests) allowed to import the concrete port
 * implementations. Consumers — the worker + task + permissions vertical — must
 * go through it, so there is one wiring point and no parallel paths.
 *
 * Checks:
 *   1. `nocowboy/agent/catalog` (a concrete port impl) is imported only from
 *      inside `nocowboy/engine-adapter/`.
 *   2. The migrated vertical (`tool/task.ts`, `tool/registry.ts`) imports the
 *      engine adapter.
 *
 * Usage:
 *   bun run scripts/check-engine-adapter.ts          # check (default)
 *   bun run scripts/check-engine-adapter.ts --check   # explicit
 */
import { readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SRC = join(ROOT, "packages", "opencode", "src")
const GATEWAY_DIR = join(SRC, "nocowboy", "engine-adapter")

/** Concrete port implementations that must be reached only via the gateway. */
const GUARDED = [join(SRC, "nocowboy", "agent", "catalog")]
/** Vertical consumers that must import the gateway. */
const CONSUMERS = [join(SRC, "tool", "task.ts"), join(SRC, "tool", "registry.ts")]

export interface Violation {
  file: string
  reason: string
}

function listTs(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listTs(full))
    else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) out.push(full)
  }
  return out
}

function specifiers(source: string): string[] {
  const specs: string[] = []
  const staticImport = /(?:import|export)\s+(?:type\s+)?(?:[^"'`]*?\sfrom\s+)?["']([^"']+)["']/g
  const dynamicImport = /\bimport\(\s*["']([^"']+)["']\s*\)/g
  for (const re of [staticImport, dynamicImport]) {
    let match: RegExpExecArray | null
    while ((match = re.exec(source)) !== null) specs.push(match[1]!)
  }
  return specs
}

function resolveSpec(fromFile: string, spec: string): string | undefined {
  if (spec.startsWith("@/")) return join(SRC, spec.slice(2))
  if (spec.startsWith(".")) return resolve(dirname(fromFile), spec)
  return undefined
}

const norm = (p: string) => p.replace(/\.(tsx?|jsx?)$/, "")

export function findViolations(src = SRC): Violation[] {
  const violations: Violation[] = []
  for (const file of listTs(src)) {
    const inGateway = file.startsWith(GATEWAY_DIR + "/")
    const source = readFileSync(file, "utf-8")
    for (const spec of specifiers(source)) {
      const target = resolveSpec(file, spec)
      if (!target) continue
      if (GUARDED.some((g) => norm(target) === norm(g)) && !inGateway) {
        violations.push({
          file: relative(ROOT, file),
          reason: `imports a guarded port implementation (${spec}) outside nocowboy/engine-adapter`,
        })
      }
    }
  }
  for (const consumer of CONSUMERS) {
    const source = readFileSync(consumer, "utf-8")
    const imports = specifiers(source).some((spec) => {
      const target = resolveSpec(consumer, spec)
      return target ? norm(target).startsWith(GATEWAY_DIR) || norm(target) === join(SRC, "nocowboy", "engine-adapter") : false
    })
    if (!imports) {
      violations.push({ file: relative(ROOT, consumer), reason: "does not import the engine adapter (single entry point)" })
    }
  }
  return violations
}

function main() {
  const violations = findViolations()
  if (violations.length > 0) {
    console.error("❌ engine-adapter single-entry-point violated:")
    for (const v of violations) console.error(`  ${v.file}: ${v.reason}`)
    process.exit(1)
  }
  console.log("✅ ports are reached only through @nocowboy/engine-adapter")
}

if (import.meta.main) main()
