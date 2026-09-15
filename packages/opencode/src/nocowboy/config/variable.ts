import fs from "node:fs/promises"
import { realpathSync, statSync } from "node:fs"
import path from "node:path"

// nocowboy_change start - ported from upstream KiloCode b793bf788f / 032f3bb (v7.4.2 / v7.4.7).
// Guards {env:...} and {file:...} config substitutions: untrusted (project) config may not read the
// environment, and file reads are confined to a project scope so a malicious repo cannot exfiltrate
// ~/.ssh, ~/.aws, etc. by pointing a provider apiKey at a local file and baseURL at an attacker server.
export namespace ConfigVariableGuard {
  export type FileScope = {
    root: string
    source: string
  }

  // A deliberate security block (out-of-scope, swapped, or /proc) — distinct from a plain missing/IO error so
  // callers using missing:"empty" still surface the block instead of silently emptying it.
  export class BlockedError extends Error {
    readonly blocked = true as const
  }

  export function isBlocked(err: unknown): err is BlockedError {
    return err instanceof BlockedError || (typeof err === "object" && err !== null && (err as any).blocked === true)
  }

  // nocowboy_change - credentials the local server injects into the environment must never be reachable
  // through config substitution. KILO_* kept for parity with the upstream guard so a renaming drift cannot
  // silently re-open the hole.
  const secret = new Set([
    "NOCOWBOY_SERVER_PASSWORD",
    "NOCOWBOY_SERVER_USERNAME",
    "KILO_SERVER_PASSWORD",
    "KILO_SERVER_USERNAME",
  ])

  export function env(name: string) {
    return !secret.has(name.toUpperCase())
  }

  function inside(root: string, file: string) {
    const rel = path.relative(root, file)
    return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))
  }

  function check(file: string, token: string, scope?: FileScope) {
    if (!scope) return
    const root = realpathSync.native(scope.root)
    if (inside(root, file)) return
    throw new BlockedError(`blocked file reference outside project config scope: "${token}"`)
  }

  export async function read(filePath: string, scope?: FileScope & { token?: string }) {
    const file = await fs.open(filePath, "r")
    try {
      // Resolve the file the fd actually points at, then validate the scope and read through the same fd
      // (file.readFile) so the validated inode is exactly the one we read.
      //
      // On Linux /proc/self/fd/<fd> is the kernel's canonical path for the open fd, so realpath + read both
      // follow the fd — no path is re-resolved after open. On other platforms we cannot name the fd directly,
      // so we realpath the caller's path and then confirm, via fstat vs. stat on that resolved path, that it
      // still refers to the same inode as the open fd. If an attacker swapped the path between open and check,
      // the inodes differ and we reject rather than validating one inode while reading another.
      const target = process.platform === "linux" ? `/proc/self/fd/${file.fd}` : filePath
      const resolved = realpathSync.native(target)
      if (process.platform !== "linux" && scope) {
        const opened = await file.stat()
        const seen = statSync(resolved)
        if (opened.dev !== seen.dev || opened.ino !== seen.ino) {
          throw new BlockedError(`blocked file reference changed during read: "${scope.token ?? "{file:...}"}"`)
        }
      }
      check(resolved, scope?.token ?? "{file:...}", scope)
      if (/^\/proc\/.*\/environ$/.test(resolved)) throw new BlockedError("blocked process environment reference")
      return await file.readFile("utf-8")
    } finally {
      await file.close()
    }
  }
}
// nocowboy_change end
