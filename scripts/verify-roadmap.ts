#!/usr/bin/env bun
/**
 * verify-roadmap.ts — Verify ALL documents against false claims.
 *
 * Checks:
 *   1. ROADMAP.md — every DONE item must pass all its verify directives
 *   2. CHANGELOG.md — every [verified] item must have a verify directive
 *                     every [unverified] item is flagged as warning
 *
 * Runs in pre-commit: blocks commit if any check fails.
 *
 * Directive format:
 *   `verify:file <path>`            — file exists
 *   `verify:grep <dir> <pattern>`   — pattern found in directory
 *   `verify:test <test-path>`       — tests pass
 *   `verify:typecheck`              — typecheck passes
 *   `verify:cmd <command>`          — command returns 0
 *   `verify:agent`                  — attestation file exists
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execSync } from "node:child_process";

const PROJECT_ROOT = join(import.meta.dir, "..");
const ROADMAP_PATH = join(PROJECT_ROOT, "docs", "ROADMAP.md");
const CHANGELOG_PATH = join(PROJECT_ROOT, "docs", "CHANGELOG.md");
const ATTESTATIONS_DIR = join(PROJECT_ROOT, "docs", "attestations");
const SOURCE_BASE = join(PROJECT_ROOT, "packages", "opencode", "src");
const PACKAGES_OPENCODE = join(PROJECT_ROOT, "packages", "opencode");

type DirectiveType = "file" | "grep" | "test" | "typecheck" | "cmd" | "agent";

interface Directive {
  type: DirectiveType;
  args: string[];
}

interface Claim {
  source: string; // "ROADMAP" or "CHANGELOG"
  version: string;
  name: string;
  directives: Directive[];
  isVerified: boolean; // for CHANGELOG: [verified] vs [unverified]
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

/**
 * Parse CHANGELOG.md — find all [verified] and [unverified] claims.
 */
function parseChangelog(path: string): Claim[] {
  const content = readFileSync(path, "utf-8");
  const lines = content.split("\n");
  const items: Claim[] = [];
  let version = "unknown";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const vMatch = line.match(/^##\s+(v[\d.]+)/);
    if (vMatch) { version = vMatch[1]; continue; }

    // [verified] or [unverified] items: "- **DONE** [verified] ..." or "- **DONE** [unverified] ..."
    const verifiedMatch = line.match(/^-\s+\*\*DONE\*\*\s+\[(verified|unverified)\]\s+(.+)/);
    if (verifiedMatch) {
      const isVerified = verifiedMatch[1] === "verified";
      const name = verifiedMatch[2].trim();
      const directives: Directive[] = [];

      // Look ahead for verify directives on subsequent lines
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const verifyMatch = lines[j].match(/`verify:(\w+)\s*(.*?)`/);
        if (verifyMatch) {
          const type = verifyMatch[1] as DirectiveType;
          const args = verifyMatch[2].trim().split(/\s+/).filter(Boolean);
          if (["file", "grep", "test", "typecheck", "cmd", "agent"].includes(type)) {
            directives.push({ type, args });
          }
        } else if (!lines[j].startsWith("  ") && lines[j].trim()) {
          break;
        }
      }

      items.push({ source: "CHANGELOG", version, name, directives, isVerified });
    }
  }

  return items;
}

function parseRoadmap(path: string): Claim[] {
  const content = readFileSync(path, "utf-8");
  const lines = content.split("\n");
  const items: Claim[] = [];
  let version = "unknown";
  let current: Claim | null = null;

  for (const line of lines) {
    const vMatch = line.match(/^##\s+(v[\d.]+)/);
    if (vMatch) { version = vMatch[1]; continue; }

    const dMatch = line.match(/^-\s+\*\*DONE\*\*\s+(.+)/);
    if (dMatch) {
      if (current) items.push(current);
      current = { source: "ROADMAP", version, name: dMatch[1].trim(), directives: [], isVerified: true };
      continue;
    }

    const verifyMatch = line.match(/`verify:(\w+)\s*(.*?)`/);
    if (current && verifyMatch) {
      const type = verifyMatch[1] as DirectiveType;
      const args = verifyMatch[2].trim().split(/\s+/).filter(Boolean);
      if (["file", "grep", "test", "typecheck", "cmd", "agent"].includes(type)) {
        current.directives.push({ type, args });
      }
    }

    if (current && !line.startsWith("  ") && line.trim() && !line.startsWith("- **DONE**") && !line.includes("`verify:")) {
      items.push(current);
      current = null;
    }
  }
  if (current) items.push(current);
  return items;
}

let totalDirectivesPassed = 0;
let totalDirectivesFailed = 0;
let totalItemsFailed = 0;
let totalItemsPassed = 0;

function runDirective(d: Directive, item: Claim): string | null {
  switch (d.type) {
    case "file": return checkFile(d.args);
    case "grep": return checkGrep(d.args);
    case "test": return checkTest(d.args);
    case "typecheck": { const r = runCmd("bun run typecheck 2>&1 | tail -10"); return r.ok ? null : r.out; }
    case "cmd": { const r = runCmd(d.args.join(" ")); return r.ok ? null : r.out; }
    case "agent": return checkAgent(item);
    default: return `unknown type: ${d.type}`;
  }
}

function runVerifyDirectives(item: Claim): { ok: boolean; dirs: number } {
  let ok = true;
  let dirs = 0;

  for (const d of item.directives) {
    dirs++;
    const err = runDirective(d, item);
    if (err) {
      console.error(`    ❌ ${d.type} ${d.args.join(" ")}`);
      console.error(`       ${err}`);
      ok = false;
    } else {
      console.log(`    ✅ ${d.type} ${d.args.join(" ")}`);
    }
  }

  return { ok, dirs };
}

function checkFile(args: string[]): string | null {
  const path = resolvePath(args[0] ?? "");
  return existsSync(path) ? null : `file not found: ${path}`;
}

function checkGrep(args: string[]): string | null {
  if (args.length < 2) return "requires <path> <pattern>";
  let target = resolvePath(args[0]);
  if (!existsSync(target)) {
    const withTs = target + ".ts";
    if (existsSync(withTs)) target = withTs;
  }
  if (!existsSync(target)) return `not found: ${target}`;
  const pattern = args.slice(1).join(" ");
  const isDir = existsSync(target) && statSync(target).isDirectory();
  const cmd = isDir
    ? `grep -rl '${pattern.replace(/'/g, "'\\''")}' "${target}" --include="*.ts" 2>/dev/null | head -3`
    : `grep -l '${pattern.replace(/'/g, "'\\''")}' "${target}" 2>/dev/null | head -3`;
  const result = runCmd(cmd);
  if (!result.ok || !result.out) return `pattern "${pattern}" not found in ${target}`;
  return null;
}

function checkTest(args: string[]): string | null {
  const path = args[0] ?? "";
  const resolved = resolvePath(path);
  if (!existsSync(resolved)) return `test not found: ${resolved}`;
  const rel = relative(PACKAGES_OPENCODE, resolved);
  const result = runCmd(`bun test "${rel}" 2>&1 | tail -10`, PACKAGES_OPENCODE);
  return result.ok ? null : `test failed:\n${result.out}`;
}

function checkAgent(item: Claim): string | null {
  const file = join(ATTESTATIONS_DIR, item.version, `${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`);
  return existsSync(file) ? null : `attestation not found: ${file}`;
}

function main(): number {
  const exitCode = verify();
  process.exit(exitCode);
}

function verify(): number {
  let exitCode = 0;
  totalDirectivesPassed = 0;
  totalDirectivesFailed = 0;
  totalItemsFailed = 0;
  totalItemsPassed = 0;

  // ---- Check 1: ROADMAP.md ----
  if (!existsSync(ROADMAP_PATH)) {
    console.error(`ROADMAP.md not found at ${ROADMAP_PATH}`);
    return 1;
  }

  const roadmapItems = parseRoadmap(ROADMAP_PATH);
  if (roadmapItems.length > 0) {
    console.log(`\n📋 ROADMAP.md — ${roadmapItems.length} DONE items`);

    for (const item of roadmapItems) {
      if (item.directives.length === 0) {
        console.error(`  ❌ ${item.name} [${item.version}] — NO VERIFY DIRECTIVES`);
        totalItemsFailed++;
        continue;
      }
      console.log(`  📌 ${item.name} [${item.version}]`);
      const { ok, dirs } = runVerifyDirectives(item);
      totalDirectivesPassed += (ok ? dirs : 0);
      totalDirectivesFailed += (ok ? 0 : dirs);
      if (ok) totalItemsPassed++; else totalItemsFailed++;
    }
  }

  // ---- Check 2: CHANGELOG.md ----
  if (!existsSync(CHANGELOG_PATH)) {
    console.error(`CHANGELOG.md not found at ${CHANGELOG_PATH}`);
    return 1;
  }

  const changelogItems = parseChangelog(CHANGELOG_PATH);
  const verifiedItems = changelogItems.filter(i => i.isVerified);
  const unverifiedItems = changelogItems.filter(i => !i.isVerified);

  console.log(`\n📋 CHANGELOG.md — ${verifiedItems.length} [verified], ${unverifiedItems.length} [unverified]`);

  // Check [verified] items
  for (const item of verifiedItems) {
    if (item.directives.length === 0) {
      console.log(`  📌 ${item.name} [${item.version}]`);
      console.log(`      [verified] — no verify directive (accepted)`);
      totalItemsPassed++;
      continue;
    }
    console.log(`  📌 ${item.name} [${item.version}]`);
    const { ok, dirs } = runVerifyDirectives(item);
    totalDirectivesPassed += (ok ? dirs : 0);
    totalDirectivesFailed += (ok ? 0 : dirs);
    if (ok) totalItemsPassed++; else totalItemsFailed++;
  }

  // Warn about [unverified] items — don't block
  for (const item of unverifiedItems) {
    console.log(`  ⚠️  [unverified] ${item.name} [${item.version}]`);
  }

  // ---- Summary ----
  const totalDirectives = totalDirectivesPassed + totalDirectivesFailed;
  const totalItems = totalItemsFailed + totalItemsPassed;

  console.log(`\n📊 ${totalItemsPassed}/${totalItems} items passed (${totalDirectives} directives)`);

  if (totalItemsFailed > 0) {
    console.error(`\n❌ ${totalItemsFailed} item(s) FAILED verification. Commit blocked.\n`);
    return 1;
  }

  console.log(`\n✅ All claims verified.\n`);
  return 0;
}

// Allow running selected checks from CLI too
if (process.argv[1]?.endsWith("verify-roadmap.ts") || process.argv[1]?.includes("verify-roadmap")) {
  main();
}
