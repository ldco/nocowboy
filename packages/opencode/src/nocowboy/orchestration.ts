/**
 * Orchestration — branch strategy, merge-back and the iteration loop.
 *
 * The Sandcastle pattern ("run an agent N times on an isolated branch, then
 * merge it back") without the sandbox: pure git orchestration that our
 * in-process agents can drive. The key idea we take from it is recording the
 * *source* branch at creation time — a detached worktree or a `-b` branch has
 * no memory of where it came from, so merge-back has no base unless we write
 * one down.
 *
 * Everything here is a pure planner: it returns the git steps to run and parses
 * git's output. It never spawns a process, so it is unit-testable in isolation
 * and cannot silently mutate a repository. The runner lives elsewhere.
 */

/** Every sandbox branch this project creates shares this prefix. */
export const SANDBOX_BRANCH_PREFIX = "nocowboy-sandbox/"

/**
 * The `branch.<name>.<key>` config entry that records where a sandbox branched
 * from. Git-native, survives across processes, and needs no side store.
 */
export const BASE_BRANCH_CONFIG_KEY = "nocowboyBase"

/** Where a run's work ends up. */
export type BranchStrategy = "head" | "branch" | "merge-to-head"

export interface GitStep {
  /** Args passed to `git`, e.g. `["checkout", "main"]`. */
  args: string[]
  /** Human description for logs and dry runs. */
  description: string
}

export interface MergeResult {
  status: "merged" | "up-to-date" | "conflict" | "failed"
  /** Files git reported as conflicted, deduped, in output order. */
  conflicts: string[]
}

/** True when `branch` is a branch this project's sandbox created. */
export function isSandboxBranch(branch: string): boolean {
  return branch.startsWith(SANDBOX_BRANCH_PREFIX)
}

/**
 * A unique sandbox branch name. The session id is sanitized to `[A-Za-z0-9_-]`
 * only, so a path-like, `..`-containing or space-containing id can never forge
 * a nested or invalid ref (`git check-ref-format` rejects `..`).
 */
export function makeSandboxBranch(sessionID: string, stamp: number): string {
  const safe =
    sessionID
      .trim()
      .replace(/[^A-Za-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "session"
  return `${SANDBOX_BRANCH_PREFIX}${safe}-${stamp}`
}

/**
 * The steps to start a sandbox: branch off `baseBranch` and *record* it, so a
 * later merge-back knows its base even when the branch is checked out alone.
 */
export function planStart(input: { baseBranch: string; sandboxBranch: string }): GitStep[] {
  if (!input.baseBranch || !input.sandboxBranch) return []
  return [
    { args: ["checkout", "-b", input.sandboxBranch, input.baseBranch], description: `branch ${input.sandboxBranch} off ${input.baseBranch}` },
    {
      args: ["config", `branch.${input.sandboxBranch}.${BASE_BRANCH_CONFIG_KEY}`, input.baseBranch],
      description: `record base branch ${input.baseBranch}`,
    },
  ]
}

/**
 * The steps to merge a sandbox back. `branch`/`head` are no-ops at the git
 * level (the work stays on its branch or on HEAD); only `merge-to-head` checks
 * out the base, merges without an editor, and deletes the sandbox branch.
 * `--no-ff` keeps the sandbox as a single, revertable merge commit.
 */
export function planMergeBack(input: { strategy: BranchStrategy; baseBranch: string; sandboxBranch: string }): GitStep[] {
  if (input.strategy !== "merge-to-head") return []
  if (!input.baseBranch || !input.sandboxBranch || input.baseBranch === input.sandboxBranch) return []
  return [
    { args: ["checkout", input.baseBranch], description: `checkout ${input.baseBranch}` },
    { args: ["merge", "--no-ff", "--no-edit", input.sandboxBranch], description: `merge ${input.sandboxBranch} (no-ff)` },
    { args: ["branch", "-D", input.sandboxBranch], description: `delete ${input.sandboxBranch}` },
  ]
}

/** The steps to discard a sandbox: return to base and delete the branch. */
export function planAbort(input: { baseBranch: string; sandboxBranch: string }): GitStep[] {
  if (!input.baseBranch || !input.sandboxBranch || input.baseBranch === input.sandboxBranch) return []
  return [
    { args: ["checkout", input.baseBranch], description: `checkout ${input.baseBranch}` },
    { args: ["branch", "-D", input.sandboxBranch], description: `delete ${input.sandboxBranch}` },
  ]
}

/**
 * Resolve the recorded base branch for `branch`. Prefers the key we wrote at
 * creation; falls back to git's own tracking config (`branch.<name>.merge`),
 * which only exists for a tracking branch; undefined means "unknown base".
 */
export function readBaseBranch(input: { branch: string; getConfig: (key: string) => string | undefined }): string | undefined {
  const recorded = input.getConfig(`branch.${input.branch}.${BASE_BRANCH_CONFIG_KEY}`)
  if (recorded && recorded.trim()) return recorded.trim()
  const tracked = input.getConfig(`branch.${input.branch}.merge`)
  if (tracked && tracked.trim()) return tracked.trim().replace(/^refs\/heads\//, "")
  return undefined
}

const CONFLICT_IN = /Merge conflict in (.+?)\s*$/
const CONFLICT_RENAME = /CONFLICT \([^)]*\):\s*(.+?)\s+(?:deleted|modified|added|renamed)\b/

/**
 * Interpret `git merge`'s exit code and output. Never guesses: an unknown
 * non-zero exit is `failed`. Conflicts are reported by file, deduped.
 */
export function parseMergeOutput(input: { exitCode: number; stdout?: string; stderr?: string }): MergeResult {
  const text = `${input.stdout ?? ""}\n${input.stderr ?? ""}`
  const conflicts: string[] = []
  const seen = new Set<string>()
  const add = (file: string) => {
    const trimmed = file.trim()
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed)
      conflicts.push(trimmed)
    }
  }
  for (const line of text.split("\n")) {
    const content = CONFLICT_IN.exec(line)
    if (content) {
      add(content[1])
      continue
    }
    const rename = CONFLICT_RENAME.exec(line)
    if (rename) add(rename[1])
  }

  if (conflicts.length > 0 || /Automatic merge failed/i.test(text)) return { status: "conflict", conflicts }
  if (input.exitCode !== 0) return { status: "failed", conflicts: [] }
  if (/Already up[- ]to[- ]date/i.test(text)) return { status: "up-to-date", conflicts: [] }
  return { status: "merged", conflicts: [] }
}

export interface IterationOutcome<T> {
  iterations: number
  results: T[]
  stoppedBy: "done" | "max-iterations"
}

/**
 * Run `work` up to `maxIterations` times, stopping early when `done` accepts a
 * result. Sequential and deterministic — the caller decides what "done" means
 * (e.g. tests green), so this is independent of any agent or provider.
 */
export async function runIterations<T>(input: {
  maxIterations: number
  work: (iteration: number) => Promise<T>
  done?: (result: T) => boolean
}): Promise<IterationOutcome<T>> {
  const limit = Number.isFinite(input.maxIterations) ? Math.max(0, Math.floor(input.maxIterations)) : 0
  const results: T[] = []
  for (let i = 0; i < limit; i++) {
    const result = await input.work(i)
    results.push(result)
    if (input.done?.(result)) return { iterations: results.length, results, stoppedBy: "done" }
  }
  return { iterations: results.length, results, stoppedBy: "max-iterations" }
}
