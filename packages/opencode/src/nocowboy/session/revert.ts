import fs from "node:fs/promises"
import path from "node:path"
import { Effect } from "effect"
import { Instance } from "@/nocowboy/instance"
import type { Snapshot } from "@/snapshot"

// nocowboy_change start - ported from upstream KiloCode 16f8e7e (v7.4.17). Keep session reverts
// atomic: if a checkpoint cannot be fully restored, the conversation and the workspace are left
// unchanged instead of ending up in a half-reverted state.
export namespace NoCowboySessionRevert {
  export const apply = Effect.fn("NoCowboySessionRevert.apply")(function* (
    snap: Snapshot.Interface,
    patches: Snapshot.Patch[],
    baseline?: string,
  ) {
    return yield* snap.revert(patches).pipe(
      Effect.catchCause((cause) => {
        if (!baseline) return Effect.failCause(cause)
        return restore(snap, baseline).pipe(Effect.andThen(Effect.failCause(cause)))
      }),
    )
  })

  export const restore = Effect.fn("NoCowboySessionRevert.restore")(function* (
    snap: Snapshot.Interface,
    hash: string,
  ) {
    const current = yield* snap.track()
    // diffFull paths are relative to the git worktree (the snapshot layer always operates on
    // state.worktree), not to Instance.directory, which is the opened directory and can be a
    // subdirectory of the repo. Resolving against the wrong root produced a non-existent path and
    // made the removal below a silent no-op, leaving the half-reverted state T0.8 exists to prevent.
    const root = Instance.worktree
    const removed = current
      ? (yield* snap.diffFull(hash, current)).flatMap((file) => {
          if (file.status !== "added" || !file.file) return []
          const resolved = path.resolve(root, file.file)
          // Never delete outside the worktree. fs.rm follows symlinked path components, so a symlink
          // directory in the snapshot could otherwise escape the project (and `recursive` is
          // unnecessary — git diff paths are always regular files).
          const rel = path.relative(root, resolved)
          if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) return []
          return [resolved]
        })
      : []

    yield* snap.restore(hash)
    yield* Effect.forEach(removed, (file) => Effect.promise(() => fs.rm(file, { force: true })), { discard: true })
  })
}
// nocowboy_change end
