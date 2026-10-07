/**
 * GitPort — reading git state outside the render path.
 *
 * The top bar used to read `.git/HEAD` synchronously and shell out to
 * `git rev-list`/`git status` via `execSync` inside a `createMemo`: a blocking
 * call on every render tick. A GitPort is async, injectable and returns a typed
 * state, so "not a repo" / "git failed" is `unknown`/`error`, never a fake clean
 * tree (branch "" with all zeros).
 *
 * Pure parsers and repo discovery are separated from the process runner so the
 * mapping from git output to state is unit-testable.
 */

import { execFile } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { promisify } from "node:util"

export type GitState =
  | {
      status: "ok"
      dir: string
      branch: string
      /** HEAD is not on a branch (detached); `branch` holds the short sha. */
      detached: boolean
      ahead: number
      behind: number
      dirty: number
      untracked: number
    }
  | { status: "unknown"; dir?: string; reason: string }
  | { status: "error"; dir?: string; reason: string }

/** Parse `.git/HEAD` into a branch name (or a detached short sha). */
export function parseGitHead(text: string): { branch: string; detached: boolean } {
  const trimmed = text.trim()
  const match = trimmed.match(/^ref:\s*refs\/heads\/(.+)$/)
  if (match) return { branch: match[1]!, detached: false }
  return { branch: trimmed.slice(0, 12), detached: true }
}

/** Parse `git status --porcelain` into dirty/untracked counts. */
export function parseGitStatus(text: string): { dirty: number; untracked: number } {
  let dirty = 0
  let untracked = 0
  for (const line of text.split("\n")) {
    if (!line.trim()) continue
    if (line.startsWith("??")) untracked++
    else dirty++
  }
  return { dirty, untracked }
}

/** Find the nearest ancestor directory containing `.git/HEAD`. */
export function findRepoRoot(cwd: string, exists: (path: string) => boolean, maxLevels = 6): string | undefined {
  let dir = cwd
  for (let i = 0; i < maxLevels; i++) {
    if (exists(join(dir, ".git", "HEAD"))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return undefined
}

export type RunGit = (args: string[], cwd: string) => Promise<{ ok: true; stdout: string } | { ok: false; error: string }>

export interface GitPort {
  /** Read the git state for `cwd` asynchronously. Never throws. */
  read(cwd: string): Promise<GitState>
}

export interface GitPortDeps {
  run: RunGit
  exists: (path: string) => boolean
  readFile: (path: string) => string
}

function toInt(value: string): number {
  const n = Number.parseInt(value.trim(), 10)
  return Number.isFinite(n) ? n : 0
}

export function createGitPort(deps: GitPortDeps): GitPort {
  return {
    async read(cwd: string): Promise<GitState> {
      // Total by contract: a dependency that throws (e.g. a rejecting `run`)
      // must not escape — the caller always gets a typed state.
      try {
        const root = findRepoRoot(cwd, deps.exists)
        if (!root) return { status: "unknown", reason: "not a git repository" }

        let branch = ""
        let detached = false
        try {
          const parsed = parseGitHead(deps.readFile(join(root, ".git", "HEAD")))
          branch = parsed.branch
          detached = parsed.detached
        } catch (error) {
          return { status: "error", dir: root, reason: error instanceof Error ? error.message : String(error) }
        }

        // `rev-list` fails when there is no upstream configured — that means "no
        // ahead/behind info", i.e. 0, not an error.
        const aheadResult = await deps.run(["rev-list", "--count", "@{upstream}..HEAD"], root)
        const behindResult = await deps.run(["rev-list", "--count", "HEAD..@{upstream}"], root)
        const statusResult = await deps.run(["status", "--porcelain"], root)
        if (!statusResult.ok) return { status: "error", dir: root, reason: statusResult.error }

        const { dirty, untracked } = parseGitStatus(statusResult.stdout)
        return {
          status: "ok",
          dir: root,
          branch,
          detached,
          ahead: aheadResult.ok ? toInt(aheadResult.stdout) : 0,
          behind: behindResult.ok ? toInt(behindResult.stdout) : 0,
          dirty,
          untracked,
        }
      } catch (error) {
        return { status: "error", reason: error instanceof Error ? error.message : String(error) }
      }
    },
  }
}

const execFileAsync = promisify(execFile)

const defaultRun: RunGit = async (args, cwd) => {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      timeout: 2000,
      windowsHide: true,
      maxBuffer: 1 << 20,
    })
    return { ok: true, stdout: String(stdout) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/** The default port backed by the filesystem and an async `git` child process. */
export const defaultGitPort: GitPort = createGitPort({
  run: defaultRun,
  exists: existsSync,
  readFile: (path) => readFileSync(path, "utf-8"),
})
