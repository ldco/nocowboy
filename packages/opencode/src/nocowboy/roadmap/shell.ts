// runShellCommand — execute a verify-directive shell command honestly.
//
// Why `pipefail`: a directive such as
//   bun run --cwd packages/opencode test 2>&1 | tail -5
// is a pipeline. Without `pipefail` the shell reports the exit status of the
// LAST command in the pipeline (`tail`), which succeeds even when the test run
// failed — turning a red suite into a green verify (a false all-clear). We run
// the command under a POSIX shell with `-o pipefail` so a failure in ANY stage
// of the pipeline propagates as a non-zero exit status.

import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"

export interface ShellResult {
  ok: boolean
  out: string
}

/** Ceiling for long verify commands — the full test suite runs for minutes. */
export const SHELL_TIMEOUT_MS = 900_000
const MAX_BUFFER = 16 * 1024 * 1024

const PIPE_FAIL_SHELLS = ["/bin/bash", "/usr/bin/bash", "/usr/local/bin/bash", "/opt/homebrew/bin/bash"]

/**
 * First POSIX shell that supports `set -o pipefail`. Returns null on Windows or
 * when bash is absent; callers then fall back to the platform shell.
 */
export function pipefailShell(): string | null {
  if (process.platform === "win32") return null
  for (const sh of PIPE_FAIL_SHELLS) {
    if (existsSync(sh)) return sh
  }
  return null
}

/**
 * Run `cmd` in `cwd` and report `{ ok, out }`. `ok` is false when the command
 * exits non-zero — including when only a non-final stage of a pipeline fails.
 */
export function runShellCommand(cmd: string, cwd: string): ShellResult {
  const shell = pipefailShell()
  try {
    const out = shell
      ? execFileSync(shell, ["-o", "pipefail", "-c", cmd], {
          cwd,
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
          timeout: SHELL_TIMEOUT_MS,
          maxBuffer: MAX_BUFFER,
        })
      : execFileSync(cmd, {
          cwd,
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
          timeout: SHELL_TIMEOUT_MS,
          maxBuffer: MAX_BUFFER,
          shell: true,
        })
    return { ok: true, out: (out ?? "").trim() }
  } catch (e: any) {
    const stderr = typeof e?.stderr === "string" ? e.stderr : (e?.stderr?.toString?.() ?? "")
    return { ok: false, out: stderr.trim() || e?.message || String(e) }
  }
}
