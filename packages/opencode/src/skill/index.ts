import path from "path"
import { pathToFileURL } from "url"
import { Effect, Layer, Context, Schema } from "effect"
import { NamedError } from "@nocowboy/core/util/error"
import type { Agent } from "@/agent/agent"
import { Bus } from "@/bus"
import { InstanceState } from "@/effect/instance-state"
import { Global } from "@nocowboy/core/global"
import { Permission } from "@/permission"
import { AppFileSystem } from "@nocowboy/core/filesystem"
import { Config } from "@/config/config"
import { ConfigMarkdown } from "@/config/markdown"
import { RuntimeFlags } from "@/effect/runtime-flags"
import { Glob } from "@nocowboy/core/util/glob"
import * as Log from "@nocowboy/core/util/log"
import { Discovery } from "./discovery"
import { BUILTIN_SKILLS } from "../nocowboy/skills/builtin"
import { isRecord } from "@/util/record"
// nocowboy_change start - classify global config dirs as trusted for markdown substitution
import { ConfigProtection } from "@/nocowboy/permission/config-paths"
// nocowboy_change end

const log = Log.create({ service: "skill" })
const CLAUDE_EXTERNAL_DIR = ".claude"
const AGENTS_EXTERNAL_DIR = ".agents"
export const BUILTIN_LOCATION = "builtin"
const EXTERNAL_SKILL_PATTERN = "skills/**/SKILL.md"
const NOCOWBOY_SKILL_PATTERN = "{skill,skills}/**/SKILL.md"
const SKILL_PATTERN = "**/SKILL.md"

export const Info = Schema.Struct({
  name: Schema.String,
  description: Schema.optional(Schema.String),
  category: Schema.optional(Schema.String),
  location: Schema.String,
  content: Schema.String,
})
export type Info = Schema.Schema.Type<typeof Info>

const Issue = Schema.StructWithRest(
  Schema.Struct({
    message: Schema.String,
    path: Schema.Array(Schema.String),
  }),
  [Schema.Record(Schema.String, Schema.Unknown)],
)

function isSkillFrontmatter(data: unknown): data is { name: string; description?: string; category?: string; metadata?: { category?: string } } {
  return (
    isRecord(data) &&
    typeof data.name === "string" &&
    (data.description === undefined || typeof data.description === "string")
  )
}

function extractCategory(data: { category?: string; metadata?: { category?: string } }): string | undefined {
  return data.category ?? data.metadata?.category ?? undefined
}

export const InvalidError = NamedError.create("SkillInvalidError", {
  path: Schema.String,
  message: Schema.optional(Schema.String),
  issues: Schema.optional(Schema.Array(Issue)),
})

export const NameMismatchError = NamedError.create("SkillNameMismatchError", {
  path: Schema.String,
  expected: Schema.String,
  actual: Schema.String,
})

type State = {
  skills: Record<string, Info>
  dirs: Set<string>
}

// nocowboy_change start - carry per-skill trust + project root so untrusted project markdown cannot
// resolve {env:} or read files outside the project scope (upstream b793bf788f / 032f3bb)
type SkillMatch = {
  path: string
  root: string
  trusted: boolean
}

type DiscoveryState = {
  matches: SkillMatch[]
  dirs: string[]
}

type ScanState = {
  matches: Map<string, { root: string; trusted: boolean }>
  dirs: Set<string>
}
// nocowboy_change end

export interface Interface {
  readonly get: (name: string) => Effect.Effect<Info | undefined>
  readonly all: () => Effect.Effect<Info[]>
  readonly dirs: () => Effect.Effect<string[]>
  readonly available: (agent?: Agent.Info) => Effect.Effect<Info[]>
}

// nocowboy_change - SkillMatch carries trust + root (upstream 032f3bb)
const add = Effect.fnUntraced(function* (state: State, match: SkillMatch, bus: Bus.Interface) {
  const md = yield* Effect.tryPromise({
    try: () =>
      ConfigMarkdown.parse(match.path, {
        trusted: match.trusted,
        fileScope: match.trusted ? undefined : { root: match.root, source: match.path },
      }),
    catch: (err) => err,
  }).pipe(
    Effect.catch(
      Effect.fnUntraced(function* (err) {
        const message = ConfigMarkdown.FrontmatterError.isInstance(err)
          ? err.data.message
          : `Failed to parse skill ${match.path}`
        const { Session } = yield* Effect.promise(() => import("@/session/session"))
        yield* bus.publish(Session.Event.Error, { error: new NamedError.Unknown({ message }).toObject() })
        log.error("failed to load skill", { skill: match, err })
        return undefined
      }),
    ),
  )

  if (!md) return

  if (!isSkillFrontmatter(md.data)) return

  if (state.skills[md.data.name]) {
    log.warn("duplicate skill name", {
      name: md.data.name,
      existing: state.skills[md.data.name].location,
      duplicate: match,
    })
  }

  state.dirs.add(path.dirname(match.path))
  state.skills[md.data.name] = {
    name: md.data.name,
    description: md.data.description,
    category: extractCategory(md.data),
    location: match.path,
    content: md.content,
  }
})

const scan = Effect.fnUntraced(function* (
  state: ScanState,
  root: string,
  pattern: string,
  opts?: { dot?: boolean; scope?: string },
) {
  const matches = yield* Effect.tryPromise({
    try: () =>
      Glob.scan(pattern, {
        cwd: root,
        absolute: true,
        include: "file",
        symlink: true,
        dot: opts?.dot,
      }),
    catch: (error) => error,
  }).pipe(
    Effect.catch((error) => {
      if (!opts?.scope) return Effect.die(error)
      log.error(`failed to scan ${opts.scope} skills`, { dir: root, error })
      return Effect.succeed([] as string[])
    }),
  )

  for (const match of matches) {
    // nocowboy_change - global scopes / global config dirs are trusted; project scopes are not
    const trusted = opts?.scope ? opts.scope === "global" : ConfigProtection.isAbsolute(root)
    state.matches.set(match, { root, trusted })
    state.dirs.add(path.dirname(match))
  }
})

const discoverSkills = Effect.fnUntraced(function* (
  config: Config.Interface,
  discovery: Discovery.Interface,
  fsys: AppFileSystem.Interface,
  global: Global.Interface,
  disableExternalSkills: boolean,
  disableClaudeCodeSkills: boolean,
  directory: string,
  worktree: string,
) {
  const state: ScanState = { matches: new Map(), dirs: new Set() }

  const externalDirs: string[] = []
  if (!disableExternalSkills) {
    if (!disableClaudeCodeSkills) externalDirs.push(CLAUDE_EXTERNAL_DIR)
    externalDirs.push(AGENTS_EXTERNAL_DIR)

    for (const dir of externalDirs) {
      const root = path.join(global.home, dir)
      if (!(yield* fsys.isDir(root))) continue
      yield* scan(state, root, EXTERNAL_SKILL_PATTERN, { dot: true, scope: "global" })
    }

    const upDirs = yield* fsys
      .up({ targets: externalDirs, start: directory, stop: worktree })
      .pipe(Effect.catch(() => Effect.succeed([] as string[])))

    for (const root of upDirs) {
      yield* scan(state, root, EXTERNAL_SKILL_PATTERN, { dot: true, scope: "project" })
    }
  }

  const configDirs = yield* config.directories()
  for (const dir of configDirs) {
    yield* scan(state, dir, NOCOWBOY_SKILL_PATTERN)
  }

  const cfg = yield* config.get()
  for (const item of cfg.skills?.paths ?? []) {
    const expanded = item.startsWith("~/") ? path.join(global.home, item.slice(2)) : item
    const dir = path.isAbsolute(expanded) ? expanded : path.join(directory, expanded)
    if (!(yield* fsys.isDir(dir))) {
      log.warn("skill path not found", { path: dir })
      continue
    }

    yield* scan(state, dir, SKILL_PATTERN)
  }

  for (const url of cfg.skills?.urls ?? []) {
    const pulledDirs = yield* discovery.pull(url)
    for (const dir of pulledDirs) {
      yield* scan(state, dir, SKILL_PATTERN)
    }
  }

  return {
    matches: Array.from(state.matches, ([match, meta]) => ({ path: match, ...meta })),
    dirs: Array.from(state.dirs),
  }
})

const loadSkills = Effect.fnUntraced(function* (state: State, discovered: DiscoveryState, bus: Bus.Interface) {
  for (const skill of BUILTIN_SKILLS) {
    state.skills[skill.name] = {
      name: skill.name,
      description: skill.description,
      category: skill.category,
      location: BUILTIN_LOCATION,
      content: skill.content,
    }
  }

  yield* Effect.forEach(discovered.matches, (match) => add(state, match, bus), {
    concurrency: "unbounded",
    discard: true,
  })

  log.info("init", { count: Object.keys(state.skills).length })
})

export class Service extends Context.Service<Service, Interface>()("@nocowboy/Skill") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const discovery = yield* Discovery.Service
    const config = yield* Config.Service
    const bus = yield* Bus.Service
    const fsys = yield* AppFileSystem.Service
    const global = yield* Global.Service
    const flags = yield* RuntimeFlags.Service
    const discovered = yield* InstanceState.make(
      Effect.fn("Skill.discovery")(function* (ctx) {
        return yield* discoverSkills(
          config,
          discovery,
          fsys,
          global,
          flags.disableExternalSkills,
          flags.disableClaudeCodeSkills,
          ctx.directory,
          ctx.project.worktree,
        )
      }),
    )
    const state = yield* InstanceState.make(
      Effect.fn("Skill.state")(function* () {
        const s: State = { skills: {}, dirs: new Set() }
        yield* loadSkills(s, yield* InstanceState.get(discovered), bus)
        return s
      }),
    )

    const get = Effect.fn("Skill.get")(function* (name: string) {
      const s = yield* InstanceState.get(state)
      return s.skills[name]
    })

    const all = Effect.fn("Skill.all")(function* () {
      const s = yield* InstanceState.get(state)
      return Object.values(s.skills)
    })

    const dirs = Effect.fn("Skill.dirs")(function* () {
      return (yield* InstanceState.get(discovered)).dirs
    })

    const available = Effect.fn("Skill.available")(function* (agent?: Agent.Info) {
      const s = yield* InstanceState.get(state)
      const list = Object.values(s.skills).toSorted((a, b) => a.name.localeCompare(b.name))
      if (!agent) return list
      return list.filter((skill) => Permission.evaluate("skill", skill.name, agent.permission).action !== "deny")
    })

    return Service.of({ get, all, dirs, available })
  }),
)

export const defaultLayer = layer.pipe(
  Layer.provide(Discovery.defaultLayer),
  Layer.provide(Config.defaultLayer),
  Layer.provide(Bus.layer),
  Layer.provide(AppFileSystem.defaultLayer),
  Layer.provide(Global.layer),
  Layer.provide(RuntimeFlags.defaultLayer),
)

function groupByCategory(list: Info[]): Array<{ category: string; skills: Info[] }> {
  const groups: Record<string, Info[]> = {}
  for (const skill of list.toSorted((a, b) => a.name.localeCompare(b.name))) {
    const cat = skill.category ?? "General"
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(skill)
  }
  return Object.entries(groups)
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([category, skills]) => ({ category, skills }))
}

export function fmt(list: Info[], opts: { verbose: boolean }) {
  const described = list.filter((skill) => skill.description !== undefined)
  if (described.length === 0) return "No skills are currently available."
  if (opts.verbose) {
    const grouped = groupByCategory(described)
    const lines = ["<available_skills>"]
    for (const { category, skills } of grouped) {
      lines.push(`  <category name="${category}">`)
      for (const skill of skills) {
        lines.push("    <skill>")
        lines.push(`      <name>${skill.name}</name>`)
        lines.push(`      <description>${skill.description}</description>`)
        lines.push(`      <location>${pathToFileURL(skill.location).href}</location>`)
        lines.push("    </skill>")
      }
      lines.push("  </category>")
    }
    lines.push("</available_skills>")
    return lines.join("\n")
  }

  const grouped = groupByCategory(described)
  const lines = ["## Available Skills"]
  for (const { category, skills } of grouped) {
    lines.push(`### ${category}`)
    for (const skill of skills) {
      lines.push(`- **${skill.name}**: ${skill.description}`)
    }
  }
  return lines.join("\n")
}

export * as Skill from "."
