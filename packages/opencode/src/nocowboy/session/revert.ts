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
    const removed = current
      ? (yield* snap.diffFull(hash, current)).flatMap((file) =>
          file.status === "added" && file.file ? [path.resolve(Instance.directory, file.file)] : [],
        )
      : []

    yield* snap.restore(hash)
    yield* Effect.forEach(removed, (file) => Effect.promise(() => fs.rm(file, { force: true, recursive: true })), {
      discard: true,
    })
  })
}
// nocowboy_change end
