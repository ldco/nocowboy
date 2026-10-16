// Изоляция AI-изменений в git branch до подтверждения пользователем.
//
// /sandbox-start  — создаёт git branch, ЗАПИСЫВАЕТ базовую ветку (branch.<name>.nocowboyBase)
// /sandbox-diff   — показывает diff против записанной базовой ветки
// /sandbox-apply  — merge sandbox обратно в базовую ветку
// /sandbox-abort  — отбрасывает branch, возвращает к исходному состоянию
//
// Планирование git-шагов и разбор их вывода живут в `@/nocowboy/orchestration`
// (чистые функции, покрытые юнит-тестами). Здесь — только запуск.
//
// Раньше базовая ветка восстанавливалась из `branch.<name>.merge` — но этот
// ключ существует только у tracking-ветки, а `git checkout -b` его не ставит,
// поэтому merge-back всегда падал на `main`. Теперь базовая ветка пишется при
// создании sandbox-а (`readBaseBranch` читает наш ключ первым).

import { Effect } from "effect"
import { AppFileSystem } from "@nocowboy/core/filesystem"
import { Config } from "@/config/config"
import {
  BASE_BRANCH_CONFIG_KEY,
  isSandboxBranch,
  makeSandboxBranch,
  planAbort,
  planMergeBack,
  planStart,
  parseMergeOutput,
  readBaseBranch,
  type GitStep,
} from "@/nocowboy/orchestration"

export namespace DiffSandbox {
  /** Run one planned git step; reject on a non-zero exit. */
  async function runStep(cwd: string, step: GitStep): Promise<string> {
    return Bun.$`git ${step.args}`.cwd(cwd).quiet().text()
  }

  /** `git config --get <key>`, or undefined when unset. */
  async function getConfig(cwd: string, key: string): Promise<string | undefined> {
    return Bun.$`git config --get ${key}`.cwd(cwd).quiet().nothrow().text().then(
      (text) => (text.trim() ? text.trim() : undefined),
      () => undefined,
    )
  }

  async function currentBranch(cwd: string): Promise<string> {
    return Bun.$`git rev-parse --abbrev-ref HEAD`.cwd(cwd).quiet().text().then((s) => s.trim())
  }

  async function isRepo(cwd: string): Promise<boolean> {
    return Bun.$`git rev-parse --is-inside-work-tree`.cwd(cwd).quiet().nothrow().text().then(
      () => true,
      () => false,
    )
  }

  /** The recorded base branch, or `main` as a last resort. */
  async function baseBranch(cwd: string, branch: string): Promise<string> {
    const ownKey = `branch.${branch}.${BASE_BRANCH_CONFIG_KEY}`
    const trackKey = `branch.${branch}.merge`
    const cfg = new Map<string, string>()
    const own = await getConfig(cwd, ownKey)
    if (own) cfg.set(ownKey, own)
    const track = await getConfig(cwd, trackKey)
    if (track) cfg.set(trackKey, track)
    return readBaseBranch({ branch, getConfig: (key) => cfg.get(key) }) ?? "main"
  }

  /**
   * Start a new diff sandbox: create a git branch from current HEAD and record
   * the base branch so merge-back has a base to merge into. Returns the branch.
   */
  export function start(sessionID: string): Effect.Effect<string, Error, AppFileSystem.Service | Config.Service> {
    return Effect.gen(function* () {
      const cwd = process.cwd() // would use InstanceState
      if (!(yield* Effect.promise(() => isRepo(cwd)))) return yield* Effect.fail(new Error("Not a git repository"))

      const baseBranchName = yield* Effect.promise(() => currentBranch(cwd))
      const branchName = makeSandboxBranch(sessionID, Date.now())
      for (const step of planStart({ baseBranch: baseBranchName, sandboxBranch: branchName })) {
        yield* Effect.promise(() => runStep(cwd, step))
      }
      return branchName
    })
  }

  /**
   * Show the diff between the sandbox branch and its recorded base branch.
   */
  export function diff(): Effect.Effect<string, Error> {
    return Effect.gen(function* () {
      const cwd = process.cwd()
      const branch = yield* Effect.promise(() => currentBranch(cwd))
      if (!isSandboxBranch(branch)) return yield* Effect.fail(new Error("Not in a sandbox branch"))

      const base = yield* Effect.promise(() => baseBranch(cwd, branch))
      const stat = yield* Effect.promise(() => Bun.$`git diff ${base}...HEAD --stat`.cwd(cwd).quiet().nothrow().text())
      if (!stat.trim()) return "No changes in sandbox."

      const full = yield* Effect.promise(() => Bun.$`git diff ${base}...HEAD`.cwd(cwd).quiet().nothrow().text())
      return `## Sandbox Changes\n\n${stat.trim()}\n\n\`\`\`diff\n${full.slice(0, 5000)}\n\`\`\`\n\nRun \`/sandbox-apply\` to apply or \`/sandbox-abort\` to discard.`
    })
  }

  /**
   * Apply the sandbox: commit pending work, merge it back into the base branch,
   * delete the sandbox branch. A conflict returns the repository to the sandbox
   * branch (base stays clean) and surfaces the conflicted files instead of
   * silently dropping the work.
   */
  export function apply(): Effect.Effect<string, Error> {
    return Effect.gen(function* () {
      const cwd = process.cwd()
      const branch = yield* Effect.promise(() => currentBranch(cwd))
      if (!isSandboxBranch(branch)) return yield* Effect.fail(new Error("Not in a sandbox branch"))

      const base = yield* Effect.promise(() => baseBranch(cwd, branch))

      const status = yield* Effect.promise(() => Bun.$`git status --porcelain`.cwd(cwd).quiet().nothrow().text())
      if (status.trim()) {
        yield* Effect.promise(() =>
          Bun.$`git add -A`.cwd(cwd).quiet().then(() =>
            Bun.$`git commit -m "nocowboy-sandbox: changes"`.cwd(cwd).quiet(),
          ),
        )
      }

      const steps = planMergeBack({ strategy: "merge-to-head", baseBranch: base, sandboxBranch: branch })
      let mergeResult = parseMergeOutput({ exitCode: 0 })
      for (const step of steps) {
        const isMerge = step.args[0] === "merge"
        const proc = yield* Effect.promise(() =>
          Bun.$`git ${step.args}`.cwd(cwd).quiet().nothrow().then((r) => ({
            code: r.exitCode,
            out: r.stdout.toString(),
            err: r.stderr.toString(),
          })),
        )
        if (isMerge) {
          mergeResult = parseMergeOutput({ exitCode: proc.code, stdout: proc.out, stderr: proc.err })
          if (mergeResult.status !== "merged" && mergeResult.status !== "up-to-date") {
            // Restore the pre-apply state so /sandbox-apply and /sandbox-abort
            // stay usable: abort the half-finished merge and go back to the
            // sandbox branch (the base branch is left clean).
            yield* Effect.promise(() => Bun.$`git merge --abort`.cwd(cwd).quiet().nothrow())
            yield* Effect.promise(() => Bun.$`git checkout ${branch}`.cwd(cwd).quiet().nothrow())
            return `Merge conflict in ${mergeResult.conflicts.join(", ") || "unknown files"}. Merge \`${base}\` into the sandbox and resolve, then re-run /sandbox-apply.`
          }
        }
      }
      return `Changes applied to ${base}. Sandbox branch "${branch}" deleted.`
    })
  }

  /**
   * Abort the sandbox: return to the base branch and delete the sandbox branch.
   */
  export function abort(): Effect.Effect<string, Error> {
    return Effect.gen(function* () {
      const cwd = process.cwd()
      const branch = yield* Effect.promise(() => currentBranch(cwd))
      if (!isSandboxBranch(branch)) return yield* Effect.fail(new Error("Not in a sandbox branch"))

      const base = yield* Effect.promise(() => baseBranch(cwd, branch))
      yield* Effect.promise(() => Bun.$`git stash`.cwd(cwd).quiet().nothrow())
      for (const step of planAbort({ baseBranch: base, sandboxBranch: branch })) {
        yield* Effect.promise(() => runStep(cwd, step))
      }
      return `Sandbox "${branch}" aborted. Returned to ${base}.`
    })
  }
}
