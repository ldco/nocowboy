import { BusEvent } from "@/bus/bus-event"
import { Schema } from "effect"
import { NamedError } from "@nocowboy/core/util/error"

const SUPPORTED_IDES = [
  { name: "Windsurf" as const, cmd: "windsurf" },
  { name: "Visual Studio Code - Insiders" as const, cmd: "code-insiders" },
  { name: "Visual Studio Code" as const, cmd: "code" },
  { name: "Cursor" as const, cmd: "cursor" },
  { name: "VSCodium" as const, cmd: "codium" },
]

export const Event = {
  Installed: BusEvent.define(
    "ide.installed",
    Schema.Struct({
      ide: Schema.String,
    }),
  ),
}

export const AlreadyInstalledError = NamedError.create("AlreadyInstalledError", {})

export const InstallFailedError = NamedError.create("InstallFailedError", {
  stderr: Schema.String,
})

export function ide() {
  if (process.env["TERM_PROGRAM"] === "vscode") {
    const v = process.env["GIT_ASKPASS"]
    for (const ide of SUPPORTED_IDES) {
      if (v?.includes(ide.name)) return ide.name
    }
  }
  return "unknown"
}

export function alreadyInstalled() {
  return process.env["NOCOWBOY_CALLER"] === "vscode" || process.env["NOCOWBOY_CALLER"] === "vscode-insiders"
}

export async function install(_ide: (typeof SUPPORTED_IDES)[number]["name"]) {
  throw new AlreadyInstalledError({})
}

export * as Ide from "."
