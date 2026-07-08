#!/usr/bin/env bun
/**
 * verify-roadmap.ts — Verify all DONE features against code.
 *
 * Reads docs/roadmap.json (single source of truth).
 * For each feature with status="done" and verify directives, runs all checks.
 * Blocks commit if any verify directive fails.
 *
 * Runs in pre-commit, AFTER scripts/generate-docs.ts.
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execSync } from "node:child_process";

// Project root detection: works for both NoCowboy and generic projects
const SCRIPT_DIR = import.meta.dir;
const PROJECT_ROOT = join(SCRIPT_DIR, "..");

// Paths relative to project root
const DATA_PATH = join(PROJECT_ROOT, "docs", "roadmap.json");
const ATTESTATIONS_DIR = join(PROJECT_ROOT, "docs", "attestations");
const PACKAGES_ROOT = join(PROJECT_ROOT, "packages");

// Auto-detect source root: prefer packages/opencode/src (NoCowboy), fallback to src/ (generic)
let SOURCE_BASE: string;
if (existsSync(join(PROJECT_ROOT, "packages", "opencode", "src"))) {
  SOURCE_BASE = join(PROJECT_ROOT, "packages", "opencode", "src");
} else {
  SOURCE_BASE = join(PROJECT_ROOT, "src");
}

let PACKAGES_OPENCODE = join(PROJECT_ROOT, "packages", "opencode");
if (!existsSync(PACKAGES_OPENCODE)) {
  // Generic project: test runner is at project root
  PACKAGES_OPENCODE = PROJECT_ROOT;
}

interface VerifyDef {
  type: string;
  path?: string;
  pattern?: string;
  command?: string;
}

interface Feature {
  id: string;
  title: string;
  status: string;
  version?: string;
  verify?: VerifyDef[];
}

interface Data {
  features: Feature[];
}

function resolvePath(ref: string): string {
  if (ref.startsWith("src/")) return join(SOURCE_BASE, ref.slice(4));
  if (ref.startsWith("packages/")) return join(PROJECT_ROOT, ref);
  if (ref.startsWith("scripts/")) return join(PROJECT_ROOT, ref);
  if (ref.startsWith("docs/")) return join(PROJECT_ROOT, ref);
  return join(PROJECT_ROOT, ref);
}

function runCmd(cmd: string, cwd?: string): { ok: boolean; out: string } {
  try {
    const out = execSync(cmd, {
      cwd: cwd ?? PROJECT_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
    });
    return { ok: true, out: out.trim() };
  } catch (e: any) {
    return { ok: false, out: e.stderr?.trim() ?? e.message ?? String(e) };
  }
}

function checkFile(path: string): string | null {
  const resolved = resolvePath(path);
  return existsSync(resolved) ? null : `file not found: ${resolved}`;
}

function checkGrep(path: string, pattern: string): string | null {
  let target = resolvePath(path);
  if (!existsSync(target)) {
    const withTs = target + ".ts";
    if (existsSync(withTs)) target = withTs;
  }
  if (!existsSync(target)) return `not found: ${target}`;
  const isDir = existsSync(target) && statSync(target).isDirectory();
  const cmd = isDir
    ? `grep -rl '${pattern.replace(/'/g, "'\\''")}' "${target}" 2>/dev/null | head -3`
    : `grep -l '${pattern.replace(/'/g, "'\\''")}' "${target}" 2>/dev/null | head -3`;
  const result = runCmd(cmd, PROJECT_ROOT);
  if (!result.ok || !result.out) return `pattern "${pattern}" not found in ${target}`;
  return null;
}

function checkTest(path: string): string | null {
  const resolved = resolvePath(path);
  if (!existsSync(resolved)) return `test not found: ${resolved}`;
  const rel = relative(PACKAGES_OPENCODE, resolved);
  const result = runCmd(`bun test "${rel}" 2>&1 | tail -10`, PACKAGES_OPENCODE);
  return result.ok ? null : `test failed:\n${result.out}`;
}

function checkTypecheck(): string | null {
  const result = runCmd("bun run typecheck 2>&1 | tail -10", PACKAGES_OPENCODE);
  return result.ok ? null : result.out;
}

function checkCmd(cmd: string): string | null {
  const result = runCmd(cmd);
  return result.ok ? null : `command failed:\n${result.out}`;
}

function checkAgent(version: string, name: string): string | null {
  const file = join(ATTESTATIONS_DIR, version, `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`);
  return existsSync(file) ? null : `attestation not found: ${file}`;
}

function runVerify(v: VerifyDef, feat: Feature): string | null {
  switch (v.type) {
    case "file": return checkFile(v.path ?? "");
    case "grep": return checkGrep(v.path ?? v.pattern ?? "", v.pattern ?? "");
    case "test": return checkTest(v.path ?? "");
    case "typecheck": return checkTypecheck();
    case "cmd": return checkCmd(v.command ?? v.path ?? "");
    case "agent": return checkAgent(feat.version ?? "unknown", feat.title);
    default: return `unknown verify type: ${v.type}`;
  }
}

function main(): number {
  if (!existsSync(DATA_PATH)) {
    console.error(`roadmap.json not found at ${DATA_PATH}`);
    return 1;
  }

  const raw = readFileSync(DATA_PATH, "utf-8");
  const data: Data = JSON.parse(raw);
  const doneFeatures = data.features.filter(f => f.status === "done" && f.verify && f.verify.length > 0);

  if (doneFeatures.length === 0) {
    console.log("No done features with verify directives to check.");
    return 0;
  }

  console.log(`\n📋 Verifying ${doneFeatures.length} done features against code\n`);

  let passed = 0;
  let failed = 0;
  let totalDirs = 0;
  let passedDirs = 0;

  for (const feat of doneFeatures) {
    console.log(`  📌 ${feat.title} [${feat.version ?? "?"}]`);
    let featOk = true;

    for (const v of feat.verify!) {
      totalDirs++;
      const label = `${v.type} ${v.path ?? v.pattern ?? v.command ?? ""}`;
      const err = runVerify(v, feat);
      if (err) {
        console.error(`    ❌ ${label}`);
        console.error(`       ${err}`);
        featOk = false;
      } else {
        console.log(`    ✅ ${label}`);
        passedDirs++;
      }
    }

    if (featOk) passed++; else failed++;
  }

  console.log(`\n📊 ${passed}/${doneFeatures.length} features passed (${passedDirs}/${totalDirs} directives)`);

  if (failed > 0) {
    console.error(`\n❌ ${failed} feature(s) FAILED verification. Commit blocked.\n`);
    return 1;
  }

  console.log(`\n✅ All ${passed} done features verified.\n`);
  return 0;
}

process.exit(main());
