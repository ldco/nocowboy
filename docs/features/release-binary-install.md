# Release installs the local binary atomically

**Status:** implemented (2026-09-15)
**Files:** `packaging/publish.sh`, `packages/opencode/script/build.ts`

## Problem

The repo was at `0.14.0` while `nocowboy --version` still reported `0.13.1`. Two defects stacked:

1. `packaging/publish.sh` — the script behind `bun run release` — exported `NOCOWBOY_VERSION`
   but never `NOCOWBOY_RELEASE=true`. Every release-only step in `script/build.ts` lives inside
   `if (Script.release)`: the distribution archives **and** the refresh of
   `~/.nocowboy/bin/nocowboy`. So `bun run release` built a source binary and silently left the
   installed one untouched.
2. Inside that branch the refresh was:

   ```ts
   await $`cp ${src} ${homeBin}`.nothrow()
   console.log(`  ✅ Updated ${homeBin}`)
   ```

   Linux returns `ETXTBSY` when writing an ELF that a running process has mapped — and a running
   NoCowboy TUI maps exactly that file. `.nothrow()` swallowed the failure and the exit code was
   never inspected, so the build printed `✅ Updated` while nothing was copied. A false success.

## What changed

- `packaging/publish.sh` exports `NOCOWBOY_RELEASE=true` alongside `NOCOWBOY_VERSION`.
- The install stages the new binary next to the target and renames over it:

  ```ts
  await fs.promises.copyFile(src, staged)
  await fs.promises.chmod(staged, 0o755)
  await fs.promises.rename(staged, homeBin)
  ```

  `rename(2)` only swaps the directory entry: the live process keeps the old inode, the next
  launch picks up the new binary, and `ETXTBSY` cannot happen. On failure the staged file is
  removed and the real error is printed with a manual `cp` hint — no more unconditional checkmark.

## Verified

`bun run release` (i.e. `NOCOWBOY_VERSION=0.14.0 NOCOWBOY_RELEASE=true bun run script/build.ts
--single`) deployed `0.14.0` to `~/.nocowboy/bin/nocowboy` while three NoCowboy TUI instances
were running; `nocowboy --version` reports `0.14.0`.
