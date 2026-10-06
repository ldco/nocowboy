#!/usr/bin/env bun
/**
 * engine-manifest.ts — the measurable fork baseline.
 *
 * Writes engine-manifest.json: the NoCowboy SHA, the declared Kilo Code
 * tag/SHA the tree was forked from, the provenance confidence (whether a Git
 * ancestor chain is preserved or the tree is an imported snapshot), the
 * versions of the engine-defining dependencies (OpenTUI / AI SDK / MCP SDK)
 * and the tracked upstream backports.
 *
 * Usage:
 *   bun run scripts/engine-manifest.ts          # (re)write engine-manifest.json
 *   bun run scripts/engine-manifest.ts --check   # fail if the committed file is stale
 *
 * `--check` compares only the *derivable* fields: the NoCowboy SHA and the
 * generation timestamp change on every commit and are deliberately excluded, so
 * the manifest stays checkable without a self-referential loop.
 */
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const MANIFEST_PATH = join(ROOT, "engine-manifest.json")

/** The Kilo Code release the NoCowboy tree was imported from (root commit message). */
const DECLARED_FORK = {
  name: "Kilo Code",
  repo: "https://github.com/kilo-org/kilocode",
  tag: "v7.3.46",
  sha: "f388b60ab579adef7cf1a6c022082100338d6450",
} as const

function git(args: string[], root = ROOT): string | undefined {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return undefined
  }
}

function readJson(abs: string): any {
  return JSON.parse(readFileSync(abs, "utf-8"))
}

/** Resolve a dependency range, following the workspace `catalog:` indirection. */
function depVersion(pkg: any, name: string, catalog: Record<string, string>): string | undefined {
  const range = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name] ?? pkg.peerDependencies?.[name]
  if (typeof range !== "string") return undefined
  if (range === "catalog:" || range.startsWith("catalog:")) {
    const key = range.slice(range.indexOf(":") + 1) || name
    return catalog[key] ?? range
  }
  return range
}

export interface EngineManifest {
  schemaVersion: number
  engine: {
    name: string
    nocowboy_sha: string
    root_commit: string
    root_commit_date?: string
    root_commit_message?: string
  }
  fork_of: {
    name: string
    repo: string
    tag: string
    sha: string
  }
  provenance: {
    confidence: "chain" | "snapshot" | "unknown"
    basis: string
    upstream_remote: string | null
    declared_tag_object_present: boolean
    declared_tag_is_ancestor: boolean
    preserved_ancestry: boolean
  }
  dependencies: {
    opentui_core?: string
    opentui_solid?: string
    ai_sdk?: string
    mcp_sdk?: string
  }
  upstream_backports: { id: string; title: string; status: string }[]
  generated: { at: string; by: string }
}

/** Build the manifest from the current working tree + git facts. */
export function buildManifest(root = ROOT): EngineManifest {
  const rootPkg = readJson(join(root, "package.json"))
  const opencodePkg = readJson(join(root, "packages", "opencode", "package.json"))
  const catalog: Record<string, string> = rootPkg.workspaces?.catalog ?? {}

  const head = git(["rev-parse", "HEAD"], root) ?? "unknown"
  const rootCommit = git(["rev-list", "--max-parents=0", "HEAD"], root) ?? "unknown"
  const rootCommitDate =
    rootCommit !== "unknown" ? git(["show", "-s", "--format=%cs", rootCommit], root) : undefined
  const rootCommitMessage =
    rootCommit !== "unknown" ? git(["show", "-s", "--format=%s", rootCommit], root) : undefined

  const declaredTagObjectPresent = git(["cat-file", "-t", DECLARED_FORK.sha], root) === "commit"
  // `git merge-base --is-ancestor` exits 0 when it IS an ancestor and 1 when it
  // is not; git() returns undefined on the non-zero exit.
  const declaredTagIsAncestor =
    declaredTagObjectPresent && git(["merge-base", "--is-ancestor", DECLARED_FORK.sha, "HEAD"], root) !== undefined
  const upstreamRemote = git(["remote", "get-url", "upstream"], root) ?? null

  const preservedAncestry = declaredTagIsAncestor
  const confidence: EngineManifest["provenance"]["confidence"] = !declaredTagObjectPresent
    ? "unknown"
    : preservedAncestry
      ? "chain"
      : "snapshot"
  const basis =
    confidence === "snapshot"
      ? `The NoCowboy root commit ${rootCommit} is not a descendant of the declared Kilo tag ${DECLARED_FORK.tag} (${DECLARED_FORK.sha.slice(0, 10)}): the tree is an imported snapshot, not a preserved Git ancestor chain.`
      : confidence === "chain"
        ? `The declared Kilo tag ${DECLARED_FORK.tag} (${DECLARED_FORK.sha.slice(0, 10)}) is an ancestor of HEAD: the Git chain is preserved.`
        : `The declared Kilo tag ${DECLARED_FORK.tag} object is not present locally, so provenance cannot be verified.`

  const roadmapPath = join(root, "docs", "roadmap.json")
  const backports: EngineManifest["upstream_backports"] = existsSync(roadmapPath)
    ? (readJson(roadmapPath).features ?? [])
        .filter((f: any) => f?.phase === "backport")
        .map((f: any) => ({ id: String(f.id), title: String(f.title ?? ""), status: String(f.status ?? "") }))
    : []

  return {
    schemaVersion: 1,
    engine: {
      name: "NoCowboy",
      nocowboy_sha: head,
      root_commit: rootCommit,
      ...(rootCommitDate ? { root_commit_date: rootCommitDate } : {}),
      ...(rootCommitMessage ? { root_commit_message: rootCommitMessage } : {}),
    },
    fork_of: { ...DECLARED_FORK },
    provenance: {
      confidence,
      basis,
      upstream_remote: upstreamRemote,
      declared_tag_object_present: declaredTagObjectPresent,
      declared_tag_is_ancestor: declaredTagIsAncestor,
      preserved_ancestry: preservedAncestry,
    },
    dependencies: {
      opentui_core: depVersion(opencodePkg, "@opentui/core", catalog),
      opentui_solid: depVersion(opencodePkg, "@opentui/solid", catalog),
      ai_sdk: depVersion(opencodePkg, "ai", catalog),
      mcp_sdk: depVersion(opencodePkg, "@modelcontextprotocol/sdk", catalog),
    },
    upstream_backports: backports,
    generated: { at: new Date().toISOString(), by: "scripts/engine-manifest.ts" },
  }
}

/** The derivable view: volatile fields (SHA, timestamp) stripped for --check. */
export function stableView(manifest: EngineManifest): unknown {
  const { nocowboy_sha: _sha, ...engine } = manifest.engine
  const { generated: _generated, ...rest } = manifest
  return { ...rest, engine }
}

function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n"
}

function main() {
  const check = process.argv.includes("--check")
  const next = buildManifest()

  if (!check) {
    writeFileSync(MANIFEST_PATH, stringify(next), "utf-8")
    console.log(`✅ wrote engine-manifest.json (provenance: ${next.provenance.confidence})`)
    return
  }

  if (!existsSync(MANIFEST_PATH)) {
    console.error("❌ engine-manifest.json is missing — run `bun run scripts/engine-manifest.ts`")
    process.exit(1)
  }

  const committed = readJson(MANIFEST_PATH) as EngineManifest
  const a = stringify(stableView(next))
  const b = stringify(stableView(committed))
  if (a !== b) {
    console.error("❌ engine-manifest.json is stale — run `bun run scripts/engine-manifest.ts`")
    for (const [i, line] of a.split("\n").entries()) {
      if (line !== b.split("\n")[i]) {
        console.error(`  expected: ${line}`)
        console.error(`  committed: ${b.split("\n")[i]}`)
      }
    }
    process.exit(1)
  }
  console.log(`✅ engine-manifest.json is in sync (provenance: ${next.provenance.confidence})`)
}

if (import.meta.main) main()
