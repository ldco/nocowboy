export * as ConfigVariable from "./variable"

import path from "path"
import os from "os"
import { InvalidError } from "./error"
// nocowboy_change start - shared guard for {env:}/{file:} substitution (ported from upstream
// KiloCode b793bf788f / 032f3bb). Confines untrusted project config to in-project file reads and
// blocks server-credential environment references.
import { ConfigVariableGuard } from "@/nocowboy/config/variable"
// nocowboy_change end

type ParseSource =
  | {
      type: "path"
      path: string
    }
  | {
      type: "virtual"
      source: string
      dir: string
    }

// nocowboy_change start
export type FileScope = ConfigVariableGuard.FileScope
// nocowboy_change end

type SubstituteInput = ParseSource & {
  text: string
  missing?: "error" | "empty"
  escapeJson?: boolean
  // nocowboy_change start - trust gates {env:}; untrusted project config may only read files inside fileScope.root
  trusted?: boolean
  fileScope?: ConfigVariableGuard.FileScope
  // nocowboy_change end
}

function source(input: ParseSource) {
  return input.type === "path" ? input.path : input.source
}

function dir(input: ParseSource) {
  return input.type === "path" ? path.dirname(input.path) : input.dir
}

// nocowboy_change start - a token is inert when its line is commented out with //
function commented(text: string, index: number) {
  const lineStart = text.lastIndexOf("\n", index - 1) + 1
  return text.slice(lineStart, index).trimStart().startsWith("//")
}
// nocowboy_change end

/** Apply {env:VAR} and {file:path} substitutions to config text. */
export async function substitute(input: SubstituteInput) {
  const missing = input.missing ?? "error"
  const escape = input.escapeJson ?? true
  // nocowboy_change start - untrusted (project) config cannot read environment variables. {env:} has no safe
  // scoped form, so it is rejected outright; {file:} is allowed but confined to fileScope.root below.
  const trusted = input.trusted ?? false
  if (!trusted) {
    const active = Array.from(input.text.matchAll(/\{env:[^}]+\}/g)).find((m) => !commented(input.text, m.index!))
    if (active) {
      throw new InvalidError({
        path: source(input),
        message: `environment references are not allowed in project config: "${active[0]}"`,
      })
    }
    // Secure default: untrusted config needs a fileScope to bound {file:} reads to the project root. Without a
    // scope we cannot enforce that bound, so we reject rather than read unrestricted. In-root file references are
    // still allowed when a scope is supplied (the normal project path); this only guards a caller that omitted it.
    if (!input.fileScope) {
      const file = Array.from(input.text.matchAll(/\{file:[^}]+\}/g)).find((m) => !commented(input.text, m.index!))
      if (file) {
        throw new InvalidError({
          path: source(input),
          message: `file references cannot be resolved without a project scope: "${file[0]}"`,
        })
      }
    }
  }
  // nocowboy_change end
  let text = input.text.replace(/\{env:([^}]+)\}/g, (match, varName, offset: number) => {
    // nocowboy_change start - leave commented tokens literal; reject server credentials
    if (commented(input.text, offset)) return match
    if (!ConfigVariableGuard.env(varName)) {
      throw new InvalidError({ path: source(input), message: `blocked environment reference: "{env:${varName}}"` })
    }
    // nocowboy_change end
    return process.env[varName] || ""
  })

  const fileMatches = Array.from(text.matchAll(/\{file:[^}]+\}/g))
  if (!fileMatches.length) return text

  const configDir = dir(input)
  const configSource = source(input)
  let out = ""
  let cursor = 0

  for (const match of fileMatches) {
    const token = match[0]
    const index = match.index!
    out += text.slice(cursor, index)

    // nocowboy_change start - skip tokens on commented-out lines
    if (commented(text, index)) {
      out += token
      cursor = index + token.length
      continue
    }
    // nocowboy_change end

    let filePath = token.replace(/^\{file:/, "").replace(/\}$/, "")
    if (filePath.startsWith("~/")) {
      filePath = path.join(os.homedir(), filePath.slice(2))
    }

    const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(configDir, filePath)
    // nocowboy_change start - validate and read one opened file to prevent credential substitution races;
    // untrusted config passes a fileScope so reads are confined to the project root.
    const fileContent = (
      await ConfigVariableGuard.read(resolvedPath, input.fileScope && { ...input.fileScope, token }).catch(
        (error: NodeJS.ErrnoException) => {
          // nocowboy_change - a deliberate scope block must always reject; only genuine missing/IO errors are
          // emptied under missing:"empty", so an out-of-scope {file:} surfaces instead of being silently dropped.
          if (ConfigVariableGuard.isBlocked(error)) {
            throw new InvalidError({ path: configSource, message: error.message }, { cause: error })
          }
          if (missing === "empty") return ""

          const errMsg = `bad file reference: "${token}"`
          if (error.code === "ENOENT") {
            throw new InvalidError(
              {
                path: configSource,
                message: errMsg + ` ${resolvedPath} does not exist`,
              },
              { cause: error },
            )
          }
          throw new InvalidError({ path: configSource, message: errMsg }, { cause: error })
        },
      )
    ).trim()
    // nocowboy_change end

    out += escape ? JSON.stringify(fileContent).slice(1, -1) : fileContent
    cursor = index + token.length
  }

  out += text.slice(cursor)
  return out
}
