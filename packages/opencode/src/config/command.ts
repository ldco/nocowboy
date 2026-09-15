export * as ConfigCommand from "./command"

import * as Log from "@nocowboy/core/util/log"
import { Cause, Exit, Schema, SchemaIssue } from "effect"
import { Glob } from "@nocowboy/core/util/glob"
import { configEntryNameFromPath } from "./entry-name"
import * as ConfigMarkdown from "./markdown"
import { ConfigModelID } from "./model-id"
import { Bus } from "@/bus"
import { NamedError } from "@nocowboy/core/util/error"
import { NoCowboyConfig } from "@/nocowboy/config/config"
import type { Warning } from "./config"
import type { ConfigVariable } from "./variable"

const log = Log.create({ service: "config" })

export const Info = Schema.Struct({
  template: Schema.String,
  description: Schema.optional(Schema.String),
  agent: Schema.optional(Schema.String),
  model: Schema.optional(ConfigModelID),
  subtask: Schema.optional(Schema.Boolean),
})

export type Info = Schema.Schema.Type<typeof Info>

const decodeInfo = Schema.decodeUnknownExit(Info)

export async function load(
  dir: string,
  warnings?: Warning[],
  trusted = false,
  fileScope?: ConfigVariable.FileScope,
  sourceScope?: ConfigVariable.FileScope,
) {
  // nocowboy_change end
  const result: Record<string, Info> = {}
  for (const item of await Glob.scan("{command,commands}/**/*.md", {
    cwd: dir,
    absolute: true,
    dot: true,
    symlink: true,
  })) {
    // nocowboy_change start
    const md = await ConfigMarkdown.parse(item, { trusted, fileScope, sourceScope }).catch(async (err) => {
      // nocowboy_change end
      const message = ConfigMarkdown.FrontmatterError.isInstance(err)
        ? err.data.message
        : `Failed to parse command ${item}`
      if (warnings) warnings.push({ path: item, message })
      try {
        const { capture } = await import("@/nocowboy/instance")
        const ctx = capture()
        if (ctx) {
          const { Session } = await import("@/session/session")
          await Bus.publish(ctx, Session.Event.Error, { error: new NamedError.Unknown({ message }).toObject() })
        }
      } catch (error) {
        log.warn("could not publish session error", { message, err: error })
      }
      log.error("failed to load command", { command: item, err })
      return undefined
    })
    if (!md) continue

    const patterns = [
      "/.nocowboy/command/",
      "/.nocowboy/commands/",
      "/.nocowboy/command/",
      "/.nocowboy/commands/",
      "/.opencode/commands/",
      "/command/",
      "/commands/",
    ]
    const name = configEntryNameFromPath(item, patterns)

    const config = {
      name,
      ...md.data,
      template: md.content.trim(),
    }
    const parsed = decodeInfo(config, { errors: "all", propertyOrder: "original" })
    if (Exit.isSuccess(parsed)) {
      result[config.name] = parsed.value
      continue
    }
    const error = Cause.squash(parsed.cause)
    const issues = Schema.isSchemaError(error)
      ? SchemaIssue.makeFormatterStandardSchemaV1()(error.issue).issues.map((issue) => ({
          ...issue,
          message: issue.message,
          path: issue.path?.map(String) ?? [],
        }))
      : [{ message: String(error), path: [] }]
    const cause = error instanceof Error ? error : new Error(String(error))
    await NoCowboyConfig.handleInvalid("command", item, issues, cause, warnings)
  }
  return result
}
