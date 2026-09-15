// Replaces scripts/verify-roadmap.ts, scripts/generate-docs.ts, scripts/init-roadmap.sh

import { EOL } from "os"
import { join, dirname } from "path"
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, copyFileSync } from "fs"
import { execSync, spawnSync } from "child_process"
import { cmd } from "./cmd"
import { UI } from "../ui"

/** True when a roadmap.json exists at `dir` and declares at least one feature. */
function hasFeatures(dir: string): boolean {
  try {
    const raw = readFileSync(join(dir, "docs", "roadmap.json"), "utf-8")
    const data = JSON.parse(raw) as { features?: unknown[] }
    return Array.isArray(data.features) && data.features.length > 0
  } catch {
    return false
  }
}

/** Detect project root: prefer the roadmap that actually has features.
 *
 * A stale empty `docs/roadmap.json` template (e.g. left inside a package
 * directory) must never shadow the real roadmap — that silently turns the
 * whole verification step into a no-op. */
function detectProjectRoot(): string {
  const cwd = process.cwd()
  const candidates: string[] = [cwd]

  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      timeout: 5000,
      // Suppress git's stderr: outside a repo this prints a scary "fatal: not a
      // git repository" even though we handle the failure. NoCowboy works fine
      // outside git — don't leak that message to the user's terminal.
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
    candidates.push(gitRoot, dirname(cwd), dirname(dirname(cwd)))
  } catch {
    candidates.push(dirname(cwd), dirname(dirname(cwd)))
  }

  const unique = [...new Set(candidates)]
  // 1. The first candidate whose roadmap actually has features.
  for (const dir of unique) if (hasFeatures(dir)) return dir
  // 2. Otherwise the first candidate that has a roadmap at all.
  for (const dir of unique) if (existsSync(join(dir, "docs", "roadmap.json"))) return dir
  return unique[0] ?? cwd
}

const PROJECT_ROOT = detectProjectRoot()
const DATA_PATH = join(PROJECT_ROOT, "docs", "roadmap.json")
const ATTESTATIONS_DIR = join(PROJECT_ROOT, "docs", "attestations")

/** The workspace package that holds the harness source (`packages/opencode` in
 *  this repo, `packages/nocowboy` in some downstream NoCowboy layouts). */
function detectPackageDir(): string {
  for (const name of ["opencode", "nocowboy"]) {
    const dir = join(PROJECT_ROOT, "packages", name)
    if (existsSync(join(dir, "package.json"))) return dir
  }
  return join(PROJECT_ROOT, "packages", "opencode")
}
const PACKAGE_DIR = detectPackageDir()

// ── Schema (inline, not from scripts/lib to keep it portable) ──────────────

interface VerifyDef { type: string; path?: string; pattern?: string; command?: string }
interface AcceptanceCriterion { check: string; verify: string; critical: boolean }
interface Feature { id: string; title: string; status: string; version?: string; changelog?: string; notes?: string; blocker?: string; subfeatures?: string[]; verify?: VerifyDef[]; acceptance_criteria?: AcceptanceCriterion[] }
interface Version { tag: string; date?: string; description: string }
interface RoadmapData { versions: Version[]; features: Feature[] }

const VALID_VERIFY_TYPES = ["file", "grep", "test", "typecheck", "cmd", "agent", "reviewer"]
const VALID_STATUSES = ["done", "planned", "in_progress", "backlog", "abandoned", "blocked"]

function loadRoadmap(): RoadmapData | null {
  if (!existsSync(DATA_PATH)) return null
  return JSON.parse(readFileSync(DATA_PATH, "utf-8"))
}

function resolvePath(ref: string): string {
  if (ref.startsWith("src/")) return join(PACKAGE_DIR, "src", ref.slice(4))
  if (ref.startsWith("packages/") || ref.startsWith("scripts/") || ref.startsWith("docs/") || ref.startsWith(".nocowboy/")) return join(PROJECT_ROOT, ref)
  return join(PROJECT_ROOT, ref)
}

function runCmd(cmd: string, cwd?: string): { ok: boolean; out: string } {
  try {
    const out = execSync(cmd, { cwd: cwd ?? PROJECT_ROOT, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"], timeout: 120_000 })
    return { ok: true, out: out.trim() }
  } catch (e: any) {
    return { ok: false, out: e.stderr?.trim() ?? e.message ?? String(e) }
  }
}

function runSpawn(bin: string, args: string[], cwd?: string): { ok: boolean; out: string } {
  try {
    const result = spawnSync(bin, args, { cwd: cwd ?? PROJECT_ROOT, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"], timeout: 120_000, maxBuffer: 1024 * 1024 })
    return result.status === 0 ? { ok: true, out: (result.stdout ?? "").trim() } : { ok: false, out: (result.stderr ?? "").trim() || `exit code ${result.status}` }
  } catch (e: any) {
    return { ok: false, out: e.message ?? String(e) }
  }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

const S = UI.Style

// ── Init ───────────────────────────────────────────────────────────────────

const ROADMAP_TEMPLATE: RoadmapData = {
  versions: [{ tag: "v0.1.0", description: "Initial release" }],
  features: [],
}

const ROADMAP_TEMPLATE_MD = `# ROADMAP.md
> generated from docs/roadmap.json — do not edit directly.
> Run \`nocowboy roadmap generate\` to regenerate.
>
> 📋 Roadmap-верификация NoCowboy. Как пользоваться:
>   • \`/backlog-promote "feature"\` → добавить фичу с acceptance criteria
>   • Разработать → \`#route reviewer: verify\` → attestation
>   • Только PASS → DONE → коммит с \`nocowboy roadmap verify\`

_No features planned yet. Add them to \`docs/roadmap.json\`._
`

const CHANGELOG_TEMPLATE_MD = `# CHANGELOG.md
> generated from docs/roadmap.json — do not edit directly.

_No releases yet._
`

function initRoadmap(force: boolean): boolean {
  const dir = join(PROJECT_ROOT, "docs")
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  if (existsSync(DATA_PATH) && !force) {
    process.stderr.write(`❌ ${DATA_PATH} already exists. Use --force to overwrite.${EOL}`)
    return false
  }

  if (!existsSync(dirname(DATA_PATH))) mkdirSync(dirname(DATA_PATH), { recursive: true })
  writeFileSync(DATA_PATH, JSON.stringify(ROADMAP_TEMPLATE, null, 2) + "\n")
  process.stdout.write(`✅ Created ${DATA_PATH}${EOL}`)

  // Also create docs/attestations directory
  if (!existsSync(ATTESTATIONS_DIR)) {
    mkdirSync(ATTESTATIONS_DIR, { recursive: true })
    writeFileSync(join(ATTESTATIONS_DIR, "README.md"), `# Attestations\n\nPlace reviewer attestation files here: \`docs/attestations/<version>/<feature-id>.md\`\n`)
  }

  // Generate initial .md docs
  generateDocs()

  return true
}

// ── Generate ───────────────────────────────────────────────────────────────

const GENERATED_MARKER = "generated from docs/roadmap.json"

/** Write generated .md file with overwrite protection.
 *  If file exists and doesn't contain GENERATED_MARKER → backup to .backup.md first. */
function safeWriteGenerated(path: string, content: string): void {
  if (existsSync(path)) {
    // Accept both our marker and the repo generator's `<!-- AUTO-GENERATED ... -->`
    // marker (case-insensitively, anywhere in the file), so a fallback to this
    // built-in generator never mistakes an already-generated file for a
    // hand-written one.
    const existing = readFileSync(path, "utf-8").toLowerCase()
    if (!existing.includes(GENERATED_MARKER.toLowerCase())) {
      // Existing file has custom content — backup before overwriting
      const backupPath = path.replace(/\.md$/, ".backup.md")
      copyFileSync(path, backupPath)
      process.stderr.write(`⚠️  Existing ${path} backed up to ${backupPath}${EOL}`)
    }
  }
  writeFileSync(path, content, "utf-8")
}

function generateDocs(): boolean {
  // When the project ships its own generator (this repo does), delegate to it so
  // the CLI and the repo can never produce conflicting formats.
  const repoGenerator = join(PROJECT_ROOT, "scripts", "generate-docs.ts")
  if (existsSync(repoGenerator)) {
    const result = runCmd(`bun run "${repoGenerator}"`)
    if (result.ok) {
      process.stdout.write(result.out + EOL)
      return true
    }
    process.stderr.write(`⚠️  ${repoGenerator} failed, falling back to the built-in generator${EOL}`)
  }

  const data = loadRoadmap()
  if (!data) {
    process.stderr.write(`❌ Not found: ${DATA_PATH}. Run \`nocowboy roadmap init\` first.${EOL}`)
    return false
  }

  const doneFeatures = data.features.filter(f => f.status === "done")
  const plannedFeatures = data.features.filter(f => f.status === "planned" || f.status === "in_progress")
  const backlogFeatures = data.features.filter(f => f.status === "backlog")
  const blockedFeatures = data.features.filter(f => f.status === "blocked")

  // CHANGELOG.md
  let changelog = "# CHANGELOG.md\n> generated from docs/roadmap.json — do not edit directly.\n\n"
  if (doneFeatures.length === 0) {
    changelog += "_No releases yet._\n"
  } else {
    // Group by version
    const byVersion: Record<string, Feature[]> = {}
    for (const f of doneFeatures) {
      const v = f.version ?? "unknown"
      if (!byVersion[v]) byVersion[v] = []
      byVersion[v].push(f)
    }
    for (const [version, features] of Object.entries(byVersion)) {
      changelog += `## ${version}\n\n`
      for (const f of features) {
        changelog += `- ✅ ${f.title}${f.changelog ? ` — ${f.changelog}` : ""}\n`
      }
      changelog += "\n"
    }
  }
  safeWriteGenerated(join(PROJECT_ROOT, "docs", "CHANGELOG.md"), changelog)

  // ROADMAP.md — grouped by version, shows spec status
  let roadmap = "# ROADMAP.md\n> generated from docs/roadmap.json — do not edit directly.\n> Run `nocowboy roadmap generate` to regenerate.\n> 📋 Use `/backlog-promote \"feature\"` to add new features.\n\n"
  const allPlanned = [...plannedFeatures, ...blockedFeatures]
  if (allPlanned.length === 0) {
    roadmap += "_No features planned._\n"
  } else {
    // Group by version
    const byVersion: Record<string, Feature[]> = {}
    const versionMeta: Record<string, string> = {}
    for (const v of data.versions ?? []) {
      versionMeta[v.tag] = v.description
    }
    for (const f of allPlanned) {
      const v = f.version ?? "unsorted"
      if (!byVersion[v]) byVersion[v] = []
      byVersion[v].push(f)
    }
    const specDir = join(PROJECT_ROOT, ".nocowboy", "specs")
    for (const [version, features] of Object.entries(byVersion).sort()) {
      roadmap += `## ${version} — ${versionMeta[version] ?? ""}\n\n`
      for (const f of features) {
        const icon = f.status === "blocked" ? "🔴" : f.status === "in_progress" ? "🏗️" : "⬜"
        const specPath = join(specDir, `${f.id}.md`)
        const specIcon = existsSync(specPath) ? "📐" : "❓"
        const blocker = f.status === "blocked" && f.blocker ? ` — **Blocked:** ${f.blocker}` : ""
        roadmap += `  - ${icon} ${f.title} ${specIcon}${blocker}\n`
      }
      roadmap += "\n"
    }
  }
  safeWriteGenerated(join(PROJECT_ROOT, "docs", "ROADMAP.md"), roadmap)

  // BACKLOG.md
  let backlog = "# BACKLOG.md\n> generated from docs/roadmap.json — do not edit directly.\n\n"
  if (backlogFeatures.length === 0) {
    backlog += "_Nothing in backlog._\n"
  } else {
    for (const f of backlogFeatures) {
      backlog += `- ${f.title}${f.version ? ` (${f.version})` : ""}\n`
    }
  }
  safeWriteGenerated(join(PROJECT_ROOT, "docs", "BACKLOG.md"), backlog)

  process.stdout.write(`Generated:\n  ROADMAP.md   — ${plannedFeatures.length + blockedFeatures.length} planned\n  CHANGELOG.md — ${doneFeatures.length} done\n  BACKLOG.md   — ${backlogFeatures.length} ideas\n`)
  return true
}

// ── Verify ─────────────────────────────────────────────────────────────────

function checkFile(path: string): string | null {
  return existsSync(resolvePath(path)) ? null : `file not found: ${resolvePath(path)}`
}

function checkGrep(path: string, pattern: string): string | null {
  let target = resolvePath(path)
  if (!existsSync(target)) {
    const withTs = target + ".ts"
    if (existsSync(withTs)) target = withTs
  }
  if (!existsSync(target)) return `not found: ${target}`
  const isDir = existsSync(target) && statSync(target).isDirectory()
  const args = isDir ? ["-rl", pattern, target] : ["-l", pattern, target]
  const result = runSpawn("grep", args, PROJECT_ROOT)
  if (!result.ok || !result.out) return `pattern "${pattern}" not found in ${target}`
  return null
}

function checkTest(path: string): string | null {
  const resolved = resolvePath(path)
  if (!existsSync(resolved)) return `test not found: ${resolved}`
  const rel = resolved.startsWith(PACKAGE_DIR) ? resolved.slice(PACKAGE_DIR.length + 1) : resolved
  const result = runCmd(`bun test "${rel}" 2>&1 | tail -10`, PACKAGE_DIR)
  return result.ok ? null : `test failed:\n${result.out}`
}

function checkTypecheck(): string | null {
  if (!existsSync(PACKAGE_DIR)) return null // not a NoCowboy project
  const result = runCmd("bun run typecheck 2>&1 | tail -10", PACKAGE_DIR)
  return result.ok ? null : result.out
}

function checkAgent(version: string, name: string): string | null {
  const file = join(ATTESTATIONS_DIR, version, `${slugify(name)}.md`)
  return existsSync(file) ? null : `attestation not found: ${file}`
}

function checkOverseer(version: string, name: string, id: string, criteria: AcceptanceCriterion[] | undefined): string | null {
  const file = join(ATTESTATIONS_DIR, version, `${id}.md`)
  if (!existsSync(file)) return `reviewer attestation not found: ${file}\n  Run reviewer agent to verify this feature first.`
  const content = readFileSync(file, "utf-8").trim()
  if (!content) return `attestation is empty: ${file}`
  const lines = content.split("\n")
  const verdictLine = lines.find(l => l.includes("Verdict:") || l.includes("Вердикт:"))
  const isPass = verdictLine ? /PASS/i.test(verdictLine) : false
  const hasFail = verdictLine ? /FAIL/i.test(verdictLine) : false
  const isTemplate = verdictLine && !isPass && !hasFail
  if (isTemplate) return `attestation has default verdict (not PASS/FAIL): ${file}`
  if (!isPass) return `reviewer attestation FAILED or missing PASS verdict: ${file}`
  if (criteria && criteria.length > 0) {
    const criticalCriteria = criteria.filter(c => c.critical)
    const passCount = (content.match(/✅/g) || []).length
    if (passCount < criticalCriteria.length && content.includes("❌")) {
      return `reviewer attestation has failing critical criteria: ${file}`
    }
  }
  return null
}

function runVerify(v: VerifyDef, feat: Feature): string | null {
  switch (v.type) {
    case "file": return checkFile(v.path ?? "")
    case "grep": return checkGrep(v.path ?? "", v.pattern ?? "")
    case "test": return checkTest(v.path ?? "")
    case "typecheck": return checkTypecheck()
    case "cmd": return checkCmd(v.command ?? v.path ?? "")
    case "agent": return checkAgent(feat.version ?? "unknown", feat.title)
    case "reviewer": return checkOverseer(feat.version ?? "unknown", feat.title, feat.id, feat.acceptance_criteria)
    default: return `unknown verify type: ${v.type}`
  }
}

function checkCmd(command: string): string | null {
  const result = runCmd(command)
  return result.ok ? null : `command failed:\n${result.out}`
}

function verifyRoadmap(): number {
  // Delegate to the project's own verifier when present for the same reason as
  // generateDocs: one format, one implementation.
  const repoVerifier = join(PROJECT_ROOT, "scripts", "verify-roadmap.ts")
  if (existsSync(repoVerifier)) {
    const result = runCmd(`bun run "${repoVerifier}"`)
    if (result.out) process.stdout.write(result.out + EOL)
    return result.ok ? 0 : 1
  }

  const data = loadRoadmap()
  if (!data) {
    process.stdout.write(`No roadmap.json found at ${DATA_PATH} — skipping verification.${EOL}`)
    return 0
  }

  const doneFeatures = data.features.filter(f => f.status === "done" && f.verify && f.verify.length > 0)
  if (doneFeatures.length === 0) {
    process.stdout.write(`No DONE features with verify directives to check.${EOL}`)
    return 0
  }

  process.stdout.write(`\nVerifying ${doneFeatures.length} DONE features against code\n`)
  let passed = 0, failed = 0, totalDirs = 0, passedDirs = 0

  for (const feat of doneFeatures) {
    process.stdout.write(`  ${feat.title} [${feat.version ?? "?"}]${EOL}`)
    let featOk = true
    for (const v of feat.verify!) {
      totalDirs++
      const label = `${v.type} ${v.path ?? v.pattern ?? v.command ?? ""}`
      const err = runVerify(v, feat)
      if (err) {
        process.stderr.write(`    ❌ ${label}${EOL}`)
        process.stderr.write(`       ${err}${EOL}`)
        featOk = false
      } else {
        process.stdout.write(`    ✅ ${label}${EOL}`)
        passedDirs++
      }
    }
    if (featOk) passed++; else failed++
  }

  process.stdout.write(`\n${passed}/${doneFeatures.length} features passed (${passedDirs}/${totalDirs} directives)${EOL}`)
  if (failed > 0) {
    process.stderr.write(`\n❌ ${failed} feature(s) FAILED verification.${EOL}`)
    return 1
  }
  process.stdout.write(`\n✅ All ${passed} done features verified.${EOL}`)
  return 0
}

// ── Command registrations ──────────────────────────────────────────────────

export const RoadmapCommand = cmd({
  command: "roadmap",
  describe: "manage project roadmap (docs/roadmap.json)",
  builder: (yargs: any) =>
    yargs
      .command({
        command: "init",
        describe: "create docs/roadmap.json with template",
        builder: (y: any) => y.option("force", { type: "boolean", describe: "overwrite existing roadmap.json", default: false }),
        handler: (args: any) => { process.exit(initRoadmap(args.force) ? 0 : 1) },
      })
      .command({
        command: "generate",
        describe: "regenerate ROADMAP.md, CHANGELOG.md, BACKLOG.md from roadmap.json",
        handler: () => { process.exit(generateDocs() ? 0 : 1) },
      })
      .command({
        command: "verify",
        describe: "verify all DONE features against code (pre-commit check)",
        handler: () => { process.exit(verifyRoadmap()) },
      })
      .demandCommand(),
  async handler() {},
})
