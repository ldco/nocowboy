import { ConfigVariable } from "@/config/variable"
import { InvalidError } from "@/config/error"
import { Filesystem } from "@/util/filesystem"
import { ConfigVariableGuard } from "./variable"

// nocowboy_change start - ported from upstream KiloCode 032f3bb (v7.4.7). Markdown instruction source
// reads and substitutions now honour config trust: trusted (user-owned) sources read freely, project
// sources are confined to a project scope so a malicious repo cannot exfiltrate host files/secrets.
export namespace NoCowboyMarkdown {
  export type Options = {
    trusted: boolean
    fileScope?: ConfigVariable.FileScope
    sourceScope?: ConfigVariable.FileScope
  }

  export function read(item: string, options: Options) {
    if (options.trusted) return Filesystem.readText(item)
    const scope = options.sourceScope ?? options.fileScope
    if (!scope) {
      throw new InvalidError({
        path: item,
        message: "project markdown cannot be read without a project scope",
      })
    }
    return ConfigVariableGuard.read(item, { ...scope, token: `markdown source "${item}"` })
  }

  export function substitute(text: string, item: string, options: Options) {
    return ConfigVariable.substitute({
      text,
      type: "path",
      path: item,
      missing: "empty",
      escapeJson: false,
      trusted: options.trusted,
      fileScope: options.fileScope,
    })
  }
}
// nocowboy_change end
