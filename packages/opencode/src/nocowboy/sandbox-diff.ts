// nocowboy_change — Diff Sandbox (Plandex-style)
// Изоляция AI-изменений в git branch до подтверждения пользователем.
//
// /sandbox-start  — создаёт git branch, сохраняет "до" состояние
// /sandbox-apply  — показывает diff, merge в основную ветку
// /sandbox-abort — отбрасывает branch, возвращает к исходному состоянию

import { Effect } from "effect"
import { AppFileSystem } from "@opencode-ai/core/filesystem"
import { Config } from "@/config/config"

export namespace DiffSandbox {
  const SANDBOX_BRANCH_PREFIX = "nocowboy-sandbox/"

  export interface State {
    readonly branch: string
    readonly baseBranch: string
    readonly timestamp: number
  }

  /**
   * Start a new diff sandbox: create a git branch from current HEAD.
   * Returns the branch name.
   */
  export function start(sessionID: string): Effect.Effect<string, Error, AppFileSystem.Service | Config.Service> {
    return Effect.gen(function* () {
      const fs = yield* AppFileSystem.Service
      const cfg = yield* Config.Service
      const config = yield* cfg.get()
      const worktree = yield* Effect.promise(() => Promise.resolve(process.cwd())) // simplified — would use InstanceState

      const branchName = `${SANDBOX_BRANCH_PREFIX}${sessionID}-${Date.now()}`

      // Check git repo
      const isRepo = yield* Effect.promise(() =>
        Bun.$`git rev-parse --is-inside-work-tree`.text().then(
          () => true,
          () => false,
        ),
      )
      if (!isRepo) return yield* Effect.fail(new Error("Not a git repository"))

      // Get current branch
      const currentBranch = yield* Effect.promise(() => Bun.$`git rev-parse --abbrev-ref HEAD`.text().then((s) => s.trim()))

      // Create and switch to sandbox branch
      yield* Effect.promise(() => Bun.$`git checkout -b ${branchName}`.then((r) => r.text()))

      return branchName
    })
  }

  /**
   * Show diff between sandbox branch and base branch.
   * Returns the diff text or a message if no changes.
   */
  export function diff(): Effect.Effect<string, Error> {
    return Effect.gen(function* () {
      const currentBranch = yield* Effect.promise(() =>
        Bun.$`git rev-parse --abbrev-ref HEAD`.text().then((s) => s.trim()),
      )

      if (!currentBranch.startsWith(SANDBOX_BRANCH_PREFIX)) {
        return yield* Effect.fail(new Error("Not in a sandbox branch"))
      }

      // Get base branch (the one we branched from)
      const baseBranch = yield* Effect.promise(() =>
        Bun.$`git config branch.${currentBranch}.merge`.text().then(
          (s) => s.trim().replace("refs/heads/", ""),
          () => "main",
        ),
      )

      // Show diff against base
      const diffOutput = yield* Effect.promise(() =>
        Bun.$`git diff ${baseBranch}...HEAD --stat`.text().then(
          (s) => s.trim(),
          () => "",
        ),
      )

      if (!diffOutput) return "No changes in sandbox."

      const fullDiff = yield* Effect.promise(() => Bun.$`git diff ${baseBranch}...HEAD`.text().then((s) => s.trim()))

      return `## Sandbox Changes\n\n${diffOutput}\n\n\`\`\`diff\n${fullDiff.slice(0, 5000)}\n\`\`\`\n\nRun \`/sandbox-apply\` to apply or \`/sandbox-abort\` to discard.`
    })
  }

  /**
   * Apply sandbox changes: switch to base branch, merge sandbox.
   */
  export function apply(): Effect.Effect<string, Error> {
    return Effect.gen(function* () {
      const currentBranch = yield* Effect.promise(() =>
        Bun.$`git rev-parse --abbrev-ref HEAD`.text().then((s) => s.trim()),
      )

      if (!currentBranch.startsWith(SANDBOX_BRANCH_PREFIX)) {
        return yield* Effect.fail(new Error("Not in a sandbox branch"))
      }

      // Get base branch
      const baseBranch = yield* Effect.promise(() =>
        Bun.$`git config branch.${currentBranch}.merge`.text().then(
          (s) => s.trim().replace("refs/heads/", ""),
          () => "main",
        ),
      )

      // Check for uncommitted changes
      const hasChanges = yield* Effect.promise(() =>
        Bun.$`git status --porcelain`.text().then((s) => s.trim().length > 0),
      )

      if (hasChanges) {
        // Auto-commit sandbox changes
        yield* Effect.promise(() => Bun.$`git add -A && git commit -m "nocowboy-sandbox: changes"`.then((r) => r.text()))
      }

      // Switch to base and merge
      yield* Effect.promise(() => Bun.$`git checkout ${baseBranch}`.then((r) => r.text()))
      yield* Effect.promise(() => Bun.$`git merge ${currentBranch} --no-edit`.then((r) => r.text()))

      // Delete sandbox branch
      yield* Effect.promise(() => Bun.$`git branch -D ${currentBranch}`.catch(() => {}))

      return `Changes applied to ${baseBranch}. Sandbox branch "${currentBranch}" deleted.`
    })
  }

  /**
   * Abort sandbox: switch back to base branch, delete sandbox branch.
   */
  export function abort(): Effect.Effect<string, Error> {
    return Effect.gen(function* () {
      const currentBranch = yield* Effect.promise(() =>
        Bun.$`git rev-parse --abbrev-ref HEAD`.text().then((s) => s.trim()),
      )

      if (!currentBranch.startsWith(SANDBOX_BRANCH_PREFIX)) {
        return yield* Effect.fail(new Error("Not in a sandbox branch"))
      }

      // Get base branch
      const baseBranch = yield* Effect.promise(() =>
        Bun.$`git config branch.${currentBranch}.merge`.text().then(
          (s) => s.trim().replace("refs/heads/", ""),
          () => "main",
        ),
      )

      // Stash any uncommitted changes before switching
      yield* Effect.promise(() => Bun.$`git stash`.catch(() => {}))

      // Switch to base
      yield* Effect.promise(() => Bun.$`git checkout ${baseBranch}`.then((r) => r.text()))

      // Delete sandbox branch
      yield* Effect.promise(() => Bun.$`git branch -D ${currentBranch}`.then((r) => r.text()))

      return `Sandbox "${currentBranch}" aborted. Returned to ${baseBranch}.`
    })
  }
}
