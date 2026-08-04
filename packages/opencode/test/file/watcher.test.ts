import { describe, expect } from "bun:test"
import path from "path"
import { realpath } from "fs/promises" // kilocode_change - accept canonical paths from symlinked git directories
import { AppFileSystem } from "@nocowboy/core/filesystem"
import { ConfigProvider, Deferred, Effect, Layer, Option } from "effect"
import { TestInstance, provideInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { GlobalBus, type GlobalEvent } from "../../src/bus/global"
import { Config } from "@/config/config"
import { FileWatcher } from "../../src/file/watcher"
import { Git } from "../../src/git"

// Native @parcel/watcher bindings aren't reliably available in CI (missing on Linux, flaky on Windows)
const describeWatcher = FileWatcher.hasNativeBinding() && !process.env.CI ? describe : describe.skip

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const watcherConfigLayer = ConfigProvider.layer(
  ConfigProvider.fromUnknown({
    NOCOWBOY_EXPERIMENTAL_FILEWATCHER: "true",
    NOCOWBOY_EXPERIMENTAL_DISABLE_FILEWATCHER: "false",
  }),
)

const watcherLayer = FileWatcher.layer.pipe(
  Layer.provide(Config.defaultLayer),
  Layer.provide(Git.defaultLayer),
  Layer.provide(watcherConfigLayer),
)

const it = testEffect(Layer.mergeAll(AppFileSystem.defaultLayer, Git.defaultLayer))

type WatcherEvent = { file: string; event: "add" | "change" | "unlink" }

/** Run `body` with a live FileWatcher service. */
function withWatcher<A, E, R>(directory: string, body: Effect.Effect<A, E, R>) {
  return FileWatcher.Service.use((watcher) =>
    Effect.flatMap(watcher.init(), () =>
      Effect.flatMap(ready(directory), () => body),
    ),
  ).pipe(Effect.provide(watcherLayer), provideInstance(directory), Effect.scoped)
}

function listen(directory: string, check: (evt: WatcherEvent) => boolean, hit: (evt: WatcherEvent) => void) {
  let done = false

  const on = (evt: GlobalEvent) => {
    if (done) return
    if (evt.directory !== directory) return
    if (evt.payload.type !== FileWatcher.Event.Updated.type) return
    if (!check(evt.payload.properties)) return
    hit(evt.payload.properties)
  }

  GlobalBus.on("event", on)

  return () => {
    if (done) return
    done = true
    GlobalBus.off("event", on)
  }
}

function wait(directory: string, check: (evt: WatcherEvent) => boolean) {
  return Deferred.make<WatcherEvent>().pipe(
    Effect.flatMap((deferred) =>
      Effect.sync(() => {
        let off = () => {}
        off = listen(directory, check, (evt) => {
          off()
          Effect.runFork(Deferred.succeed(deferred, evt))
        })
        return { cleanup: off, deferred }
      }),
    ),
  )
}

function nextUpdate<E>(directory: string, check: (evt: WatcherEvent) => boolean, trigger: Effect.Effect<void, E>) {
  return Effect.acquireUseRelease(
    wait(directory, check),
    ({ deferred }) =>
      Effect.flatMap(trigger, () =>
        Deferred.await(deferred).pipe(
          Effect.timeoutOrElse({
            duration: "5 seconds",
            orElse: () => Effect.fail(new Error("timed out waiting for file watcher update")),
          }),
        ),
      ),
    ({ cleanup }) => Effect.sync(cleanup),
  )
}

/** Effect that asserts no matching event arrives within `ms`. */
function noUpdate<E>(
  directory: string,
  check: (evt: WatcherEvent) => boolean,
  trigger: Effect.Effect<void, E>,
  ms = 500,
) {
  return Effect.acquireUseRelease(
    wait(directory, check),
    ({ deferred }) =>
      Effect.flatMap(trigger, () =>
        Deferred.await(deferred).pipe(
          Effect.map((evt) => Option.some(evt)),
          Effect.timeoutOrElse({ duration: `${ms} millis`, orElse: () => Effect.succeed(Option.none()) }),
        ),
      ).pipe(Effect.tap((result) => Effect.sync(() => expect(result).toEqual(Option.none())))),
    ({ cleanup }) => Effect.sync(cleanup),
  )
}

function ready(directory: string) {
  const file = path.join(directory, `.watcher-${Math.random().toString(36).slice(2)}`)
  const head = path.join(directory, ".git", "HEAD")

  return AppFileSystem.Service.use((fs) =>
    Git.Service.use((git) => {
      const setup = nextUpdate(
        directory,
        (evt) => evt.file === file && evt.event === "add",
        fs.writeFileString(file, "ready"),
      ).pipe(Effect.ensuring(fs.remove(file, { force: true }).pipe(Effect.ignore)), Effect.asVoid)

      const checkGit = Effect.flatMap(fs.existsSafe(head), (exists) => {
        if (!exists) return Effect.void
        return Effect.flatMap(
          Effect.promise(() => realpath(head).catch(() => head)), // kilocode_change
          (realHead) => {
            const branch = `watch-${Math.random().toString(36).slice(2)}`
            return Effect.flatMap(
              git.run(["rev-parse", "HEAD"], { cwd: directory }).pipe(Effect.map((r) => r.text())),
              (hash) =>
                nextUpdate(
                  directory,
                  (evt) => (evt.file === head || evt.file === realHead) && evt.event !== "unlink", // kilocode_change
                  fs
                    .writeFileString(path.join(directory, ".git", "refs", "heads", branch), hash.trim() + "\n")
                    .pipe(Effect.andThen(fs.writeFileString(head, `ref: refs/heads/${branch}\n`))),
                ),
            ).pipe(Effect.asVoid)
          },
        )
      })

      return setup.pipe(Effect.andThen(checkGit))
    }),
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describeWatcher("FileWatcher", () => {
  it.instance(
    "publishes root create, update, and delete events",
    () =>
      TestInstance.use((test) =>
        AppFileSystem.Service.use((fs) => {
          const file = path.join(test.directory, "watch.txt")
          const cases = [
            { event: "add" as const, trigger: fs.writeFileString(file, "a") },
            { event: "change" as const, trigger: fs.writeFileString(file, "b") },
            { event: "unlink" as const, trigger: fs.remove(file) },
          ]

          return withWatcher(
            test.directory,
            Effect.forEach(cases, ({ event, trigger }) =>
              nextUpdate(test.directory, (evt) => evt.file === file && evt.event === event, trigger).pipe(
                Effect.tap((evt) => Effect.sync(() => expect(evt).toEqual({ file, event }))),
              ),
            ),
          )
        }),
      ),
    { git: true },
  )

  it.instance(
    "watches non-git roots",
    () =>
      TestInstance.use((test) =>
        AppFileSystem.Service.use((fs) => {
          const file = path.join(test.directory, "plain.txt")

          return withWatcher(
            test.directory,
            nextUpdate(test.directory, (e) => e.file === file && e.event === "add", fs.writeFileString(file, "plain")).pipe(
              Effect.tap((evt) => Effect.sync(() => expect(evt).toEqual({ file, event: "add" }))),
            ),
          )
        }),
      ),
  )

  it.instance(
    "cleanup stops publishing events",
    () =>
      TestInstance.use((test) =>
        AppFileSystem.Service.use((fs) => {
          const file = path.join(test.directory, "after-dispose.txt")

          return withWatcher(test.directory, Effect.void).pipe(
            Effect.andThen(
              noUpdate(test.directory, (e) => e.file === file, fs.writeFileString(file, "gone")).pipe(
                provideInstance(test.directory),
              ),
            ),
          )
        }),
      ),
    { git: true },
  )

  it.instance(
    "ignores .git/index changes",
    () =>
      TestInstance.use((test) =>
        AppFileSystem.Service.use((fs) =>
          Git.Service.use((git) => {
            const gitIndex = path.join(test.directory, ".git", "index")
            const edit = path.join(test.directory, "tracked.txt")

            return withWatcher(
              test.directory,
              noUpdate(
                test.directory,
                (e) => e.file === gitIndex,
                fs.writeFileString(edit, "a").pipe(Effect.andThen(git.run(["add", "."], { cwd: test.directory }))),
              ),
            )
          }),
        ),
      ),
    { git: true },
  )

  it.instance(
    "publishes .git/HEAD events",
    () =>
      TestInstance.use((test) =>
        AppFileSystem.Service.use((fs) =>
          Git.Service.use((git) => {
            const head = path.join(test.directory, ".git", "HEAD")
            const branch = `watch-${Math.random().toString(36).slice(2)}`

            return git.run(["branch", branch], { cwd: test.directory }).pipe(
              Effect.andThen(
                withWatcher(
                  test.directory,
                  nextUpdate(
                    test.directory,
                    (evt) => evt.file === head && evt.event !== "unlink",
                    fs.writeFileString(head, `ref: refs/heads/${branch}\n`),
                  ).pipe(
                    Effect.tap((evt) =>
                      Effect.sync(() => {
                        expect(evt.file).toBe(head)
                        expect(["add", "change"]).toContain(evt.event)
                      }),
                    ),
                  ),
                ),
              ),
            )
          }),
        ),
      ),
    { git: true },
  )

  // Symlink support varies by platform; skip where unavailable
  const describeSymlink = process.platform !== "win32" ? describe : describe.skip

  describeSymlink("symlinked .git", () => {
    it.instance(
      "publishes .git/HEAD events through a symlinked .git directory",
      () =>
        TestInstance.use((test) =>
          AppFileSystem.Service.use((fs) =>
            Git.Service.use((git) => {
              const dir = test.directory
              const actualGit = path.join(dir, "..", "tmp_actual_git_" + Math.random().toString(36).slice(2))

              const setupSymlink = Effect.promise(() => import("fs")).pipe(
                Effect.flatMap((nodeFs) =>
                  Effect.all([
                    Effect.promise(() => nodeFs.promises.rename(path.join(dir, ".git"), actualGit)),
                    Effect.promise(() => nodeFs.promises.symlink(actualGit, path.join(dir, ".git"))),
                  ]),
                ),
              )

              const head = path.join(dir, ".git", "HEAD")
              const branch = `watch-${Math.random().toString(36).slice(2)}`

              return setupSymlink.pipe(
                Effect.andThen(
                  Effect.addFinalizer(() =>
                    Effect.promise(() =>
                      import("fs").then((f) =>
                        f.promises.rm(actualGit, { recursive: true, force: true }).catch(() => undefined),
                      ),
                    ),
                  ),
                ),
                Effect.andThen(git.run(["branch", branch], { cwd: dir })),
                Effect.andThen(
                  withWatcher(
                    dir,
                    nextUpdate(
                      dir,
                      (evt) => evt.file === path.join(actualGit, "HEAD") && evt.event !== "unlink",
                      fs.writeFileString(head, `ref: refs/heads/${branch}\n`),
                    ).pipe(
                      Effect.tap((evt) =>
                        Effect.sync(() => {
                          expect(evt.file).toBe(path.join(actualGit, "HEAD"))
                          expect(["add", "change"]).toContain(evt.event)
                        }),
                      ),
                    ),
                  ),
                ),
              )
            }),
          ),
        ),
      { git: true },
    )
  })
})
