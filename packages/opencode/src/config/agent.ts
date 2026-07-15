export * as ConfigAgent from "./agent"

import path from "path"
import { Schema, SchemaGetter } from "effect"
import { PositiveInt } from "@nocowboy/core/schema"
import * as Log from "@nocowboy/core/util/log"
import { Glob } from "@nocowboy/core/util/glob"
import { configEntryNameFromPath } from "./entry-name"
import { ConfigError } from "./error"
import * as ConfigMarkdown from "./markdown"
import { ConfigModelID } from "./model-id"
import { ConfigParse } from "./parse"
import { ConfigPermission } from "./permission"
import { ConfigVariable } from "./variable"
import { Bus } from "@/bus"
import { NamedError } from "@nocowboy/core/util/error"
import { NoCowboyConfig } from "@/nocowboy/config/config"
import type { Warning } from "./config"

const log = Log.create({ service: "config" })

const Color = Schema.Union([
  Schema.String.check(Schema.isPattern(/^#[0-9a-fA-F]{6}$/)),
  Schema.Literals(["primary", "secondary", "accent", "success", "warning", "error", "info"]),
])

const AgentSchema = Schema.StructWithRest(
  Schema.Struct({
    model: Schema.optional(Schema.NullOr(ConfigModelID)),
    variant: Schema.optional(Schema.NullOr(Schema.String)).annotate({
      description: "Default model variant for this agent (applies only when using the agent's configured model).",
    }),
    temperature: Schema.optional(Schema.NullOr(Schema.Finite)),
    top_p: Schema.optional(Schema.NullOr(Schema.Finite)),
    prompt: Schema.optional(Schema.NullOr(Schema.String)),
    tools: Schema.optional(Schema.Record(Schema.String, Schema.Boolean)).annotate({
      description: "@deprecated Use 'permission' field instead",
    }),
    disable: Schema.optional(Schema.Boolean),
    description: Schema.optional(Schema.NullOr(Schema.String)).annotate({
      description: "Description of when to use the agent",
    }),
    mode: Schema.optional(Schema.Literals(["subagent", "primary", "all"])),
    hidden: Schema.optional(Schema.Boolean).annotate({
      description: "Hide this subagent from the @ autocomplete menu (default: false, only applies to mode: subagent)",
    }),
    options: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
    color: Schema.optional(Color).annotate({
      description: "Hex color code (e.g., #FF5733) or theme color (e.g., primary)",
    }),
    steps: Schema.optional(Schema.NullOr(PositiveInt)).annotate({
      description: "Maximum number of agentic iterations before forcing text-only response",
    }),
    maxSteps: Schema.optional(PositiveInt).annotate({ description: "@deprecated Use 'steps' field instead." }),
    permission: Schema.optional(ConfigPermission.Info),
    groups: Schema.optional(
      Schema.mutable(Schema.Array(Schema.String)),
    ).annotate({
      description: "Tool groups for this agent: read, edit, command, mcp. Resolved to baseline permissions.",
    }),
  }),
  [Schema.Record(Schema.String, Schema.Any)],
)

const KNOWN_KEYS = new Set([
  "name",
  "model",
  "variant",
  "prompt",
  "description",
  "temperature",
  "top_p",
  "mode",
  "hidden",
  "color",
  "steps",
  "maxSteps",
  "options",
  "permission",
  "disable",
  "tools",
  "groups",
])

// Post-parse normalisation:
//  - Promote any unknown-but-present keys into `options` so they survive the
//    round-trip in a well-known field.
//  - Translate the deprecated `tools: { name: boolean }` map into the new
//    `permission` shape (write-adjacent tools collapse into `permission.edit`).
//  - Coalesce `steps ?? maxSteps` so downstream can ignore the deprecated alias.
const normalize = (agent: Schema.Schema.Type<typeof AgentSchema>): Schema.Schema.Type<typeof AgentSchema> => {
  const options: Record<string, unknown> = { ...agent.options }
  for (const [key, value] of Object.entries(agent)) {
    if (!KNOWN_KEYS.has(key)) options[key] = value
  }

  const permission: ConfigPermission.Info = {}
  for (const [tool, enabled] of Object.entries(agent.tools ?? {})) {
    const action = enabled ? "allow" : "deny"
    if (tool === "write" || tool === "edit" || tool === "patch") {
      permission.edit = action
      continue
    }
    permission[tool] = action
  }
  globalThis.Object.assign(permission, agent.permission)

  const steps = agent.steps !== undefined ? agent.steps : agent.maxSteps

  // Resolve tool groups to baseline permissions
  if (Array.isArray(agent.groups)) {
    const GROUP_TOOLS: Record<string, Record<string, "allow">> = {
      read: { read: "allow", grep: "allow", glob: "allow", list: "allow", codebase_search: "allow", semantic_search: "allow" },
      edit: { edit: "allow", write: "allow" },
      command: { bash: "allow" },
      mcp: {},
    }
    const resolved: Record<string, unknown> = {}
    for (const group of agent.groups) {
      const tools = GROUP_TOOLS[group as string]
      if (tools) Object.assign(resolved, tools)
    }
    Object.assign(permission, resolved, permission)
  }
  return { ...agent, options, permission, ...(steps !== undefined ? { steps } : {}) }
}

export const Info = AgentSchema.pipe(
  Schema.decodeTo(AgentSchema, {
    decode: SchemaGetter.transform(normalize),
    encode: SchemaGetter.passthrough({ strict: false }),
  }),
).annotate({ identifier: "AgentConfig" })
export type Info = Schema.Schema.Type<typeof Info>

export async function load(dir: string, warnings?: Warning[]) {
  const result: Record<string, Info> = {}
  for (const item of await Glob.scan("{agent,agents}/**/*.md", {
    cwd: dir,
    absolute: true,
    dot: true,
    symlink: true,
  })) {
    const md = await ConfigMarkdown.parse(item).catch(async (err) => {
      const message = ConfigMarkdown.FrontmatterError.isInstance(err)
        ? err.data.message
        : `Failed to parse agent ${item}`
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
      log.error("failed to load agent", { agent: item, err })
      return undefined
    })
    if (!md) continue

    const patterns = [
      "/.nocowboy/agent/",
      "/.nocowboy/agents/",
      "/.nocowboy/agent/",
      "/.nocowboy/agents/",
      "/agent/",
      "/agents/",
    ]
    const name = configEntryNameFromPath(item, patterns)

    const prompt = await ConfigVariable.substitute({
      text: md.content.trim(),
      type: "virtual",
      dir: path.dirname(item),
      source: item,
      missing: "empty",
      escapeJson: false,
    })
    const config = {
      name,
      ...md.data,
      prompt,
    }
    try {
      result[config.name] = ConfigParse.schema(Info, config, item) as Info
    } catch (err) {
      if (ConfigError.InvalidError.isInstance(err)) {
        await NoCowboyConfig.handleInvalid("agent", item, err.data.issues ?? [], err, warnings)
        continue
      }
      throw err
    }
  }
  return result
}

export async function loadMode(dir: string, warnings?: Warning[]) {
  const result: Record<string, Info> = {}
  for (const item of await Glob.scan("{mode,modes}/*.md", {
    cwd: dir,
    absolute: true,
    dot: true,
    symlink: true,
  })) {
    const md = await ConfigMarkdown.parse(item).catch(async (err) => {
      const message = ConfigMarkdown.FrontmatterError.isInstance(err)
        ? err.data.message
        : `Failed to parse mode ${item}`
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
      log.error("failed to load mode", { mode: item, err })
      return undefined
    })
    if (!md) continue

    const config = {
      name: configEntryNameFromPath(item, []),
      ...md.data,
      prompt: md.content.trim(),
    }
    try {
      result[config.name] = {
        ...(ConfigParse.schema(Info, config, item) as Info),
        mode: "primary" as const,
      }
    } catch (err) {
      if (ConfigError.InvalidError.isInstance(err)) {
        await NoCowboyConfig.handleInvalid("agent", item, err.data.issues ?? [], err, warnings)
        continue
      }
      throw err
    }
  }
  return result
}
