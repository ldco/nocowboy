#!/usr/bin/env bun
/**
 * verify-roadmap.ts — Verify all DONE items in ROADMAP.md against their verify directives.
 *
 * Pre-commit hook: blocks commit if any DONE item fails.
 *
 * Directive format in ROADMAP.md:
 *   `verify:file <path>`            — file exists
 *   `verify:grep <dir> <pattern>`   — pattern found in directory
 *   `verify:test <test-path>`       — tests pass
 *   `verify:typecheck`              — typecheck passes
 *   `verify:cmd <command>`          — command returns 0
 *   `verify:agent`                  — attestation file exists
 */

import { readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { execSync } from "node:child_process";

const PROJECT_ROOT = join(import.meta.dir, "..");
const ROADMAP_PATH = join(PROJECT_ROOT, "docs", "ROADMAP.md");
const ATTESTATIONS_DIR = join(PROJECT_ROOT, "docs", "attestations");
const SOURCE_BASE = join(PROJECT_ROOT, "packages", "opencode", "src");
const PACKAGES_OPENCODE = join(PROJECT_ROOT, "packages", "opencode");

type DirectiveType = "file" | "grep" | "test" | "typecheck" | "cmd" | "agent";

interface Directive {
  type: DirectiveType;
  args: string[];
}

interface RoadmapItem {
  version: string;
  name: string;
  directives: Directive[];
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

function parseRoadmap(path: string): RoadmapItem[] {
  const content = readFileSync(path, "utf-8");
  const lines = content.split("\n");
  const items: RoadmapItem[] = [];
  let version = "unknown";
  let current: RoadmapItem | null = null;

  for (const line of lines) {
    const vMatch = line.match(/^##\s+(v[\d.]+)/);
    if (vMatch) { version = vMatch[1]; continue; }

    const dMatch = line.match(/^-\s+\*\*DONE\*\*\s+(.+)/);
    if (dMatch) {
      if (current) items.push(current);
      current = { version, name: dMatch[1].trim(), directives: [] };
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

function checkFile(path: string): string | null {
  const resolved = resolvePath(path);
  return existsSync(resolved) ? null : `file not found: ${resolved}`;
}

function checkGrep(args: string[]): string | null {
  if (args.length < 2) return "requires <path> <pattern>";
  let target = resolvePath(args[0]);
  // Try appending .ts if the file exists that way (for paths without extension)
  if (!existsSync(target)) {
    const withTs = target + ".ts";
    if (existsSync(withTs)) target = withTs;
  }
  if (!existsSync(target)) return `not found: ${target} (.ts fallback tried)`;
  const pattern = args.slice(1).join(" ");
  const isDir = existsSync(target) && require("node:fs").statSync(target).isDirectory();
  const cmd = isDir
    ? `grep -rl '${pattern.replace(/'/g, "'\\''")}' "${target}" --include="*.ts" 2>/dev/null | head -3`
    : `grep -l '${pattern.replace(/'/g, "'\\''")}' "${target}" 2>/dev/null | head -3`;
  const result = runCmd(cmd);
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
  return result.ok ? null : `typecheck failed:\n${result.out}`;
}

function checkCmd(cmd: string): string | null {
  const result = runCmd(cmd);
  return result.ok ? null : `command failed:\n${result.out}`;
}

function checkAgent(dir: string, item: RoadmapItem): string | null {
  const file = join(dir, item.version, `${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`);
  return existsSync(file) ? null : `attestation not found: ${file}`;
}

function main(): number {
  if (!existsSync(ROADMAP_PATH)) {
    console.error(`ROADMAP.md not found at ${ROADMAP_PATH}`);
    return 1;
  }

  const items = parseRoadmap(ROADMAP_PATH);
  if (items.length === 0) {
    console.log("No DONE items to verify.");
    return 0;
  }

  console.log(`\n📋 Roadmap Verification: ${items.length} DONE items\n`);

  let totalDirs = 0;
  let passed = 0;
  let failed = 0;

  for (const item of items) {
    if (item.directives.length === 0) {
      console.error(`  ❌ ${item.name} [${item.version}] — ZERO verify directives`);
      failed++;
      continue;
    }

    console.log(`  📌 ${item.name} [${item.version}]`);
    let itemOk = true;

    for (const d of item.directives) {
      totalDirs++;
      let err: string | null = null;

      switch (d.type) {
        case "file":   err = checkFile(d.args[0] ?? ""); break;
        case "grep":   err = checkGrep(d.args); break;
        case "test":   err = checkTest(d.args[0] ?? ""); break;
        case "typecheck": err = checkTypecheck(); break;
        case "cmd":    err = checkCmd(d.args.join(" ")); break;
        case "agent":  err = checkAgent(ATTESTATIONS_DIR, item); break;
        default:       err = `unknown type: ${d.type}`;
      }

      const label = `verify:${d.type} ${d.args.join(" ")}`;
      if (err) {
        console.error(`    ❌ ${label}`);
        console.error(`       ${err}`);
        itemOk = false;
      } else {
        console.log(`    ✅ ${label}`);
      }
    }

    if (itemOk) passed++; else failed++;
  }

  console.log(`\n📊 ${passed}/${items.length} items passed (${totalDirs} directives)\n`);

  if (failed > 0) {
    console.error(`❌ ${failed} DONE item(s) FAILED verification. Commit blocked.\n`);
    return 1;
  }

  return 0;
}

process.exit(main());
