#!/usr/bin/env bun
/**
 * check-runtime-boundary.ts — enforce the @nocowboy/runtime dependency boundary.
 *
 * The runtime port core must not import engine internals (`@/session`, `@tui`,
 * provider services, or any `../` path that escapes the runtime directory). It
 * may import only `effect`/`zod` and other files inside `runtime/`.
 *
 * Usage:
 *   bun run scripts/check-runtime-boundary.ts          # check (default)
 *   bun run scripts/check-runtime-boundary.ts --check   # explicit
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const RUNTIME_DIR = join(ROOT, "packages", "opencode", "src", "nocowboy", "runtime")

/** Bare modules the port core is allowed to depend on. */
export const ALLOWED_BARE = new Set(["effect", "zod"])

export interface Violation {
  file: string
  spec: string
  reason: string
}

function listTs(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...listTs(full))
    else if (entry.endsWith(".ts")) out.push(full)
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

export function findViolations(runtimeDir = RUNTIME_DIR): Violation[] {
  const violations: Violation[] = []
  for (const file of listTs(runtimeDir)) {
    const source = readFileSync(file, "utf-8")
    for (const spec of specifiers(source)) {
      const rel = relative(ROOT, file)
      if (spec.startsWith(".")) {
        const target = resolve(dirname(file), spec)
        const inside = !relative(runtimeDir, target).startsWith("..")
        if (!inside) {
          violations.push({ file: rel, spec, reason: "relative import escapes the runtime directory" })
        }
        continue
      }
      if (!ALLOWED_BARE.has(spec)) {
        violations.push({ file: rel, spec, reason: "bare import is not in the runtime allowlist (effect, zod)" })
      }
    }
  }
  return violations
}

function main() {
  const violations = findViolations()
  if (violations.length > 0) {
    console.error("❌ @nocowboy/runtime boundary violated:")
    for (const v of violations) console.error(`  ${v.file}: '${v.spec}' — ${v.reason}`)
    process.exit(1)
  }
  console.log("✅ @nocowboy/runtime imports only effect/zod and its own files")
}

if (import.meta.main) main()
