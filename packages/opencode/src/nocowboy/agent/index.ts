import { Permission } from "@/permission"
import { NamedError } from "@nocowboy/core/util/error"
import { Glob } from "@nocowboy/core/util/glob"
import * as Truncate from "../../tool/truncate"
import { Config } from "../../config/config"
import type { Info as AgentInfo } from "../../agent/agent"
import { Schema } from "effect"
import path from "path"
import { Global } from "@nocowboy/core/global"

import PROMPT_DEBUG from "../../agent/prompt/debug.txt"
import PROMPT_DEBUG_RU from "../../agent/prompt/debug.ru.txt"
import PROMPT_NOCOWBOY from "../../agent/prompt/nocowboy.txt"
import PROMPT_NOCOWBOY_RU from "../../agent/prompt/nocowboy.ru.txt"
import PROMPT_OVERSEER from "../../agent/prompt/overseer.txt"
import PROMPT_OVERSEER_RU from "../../agent/prompt/overseer.ru.txt"
import PROMPT_CODE from "../../agent/prompt/code.txt"
import PROMPT_CODE_RU from "../../agent/prompt/code.ru.txt"
import PROMPT_COMPACTION from "../../agent/prompt/compaction.txt"
import PROMPT_COMPACTION_RU from "../../agent/prompt/compaction.ru.txt"
import PROMPT_TITLE from "../../agent/prompt/title.txt"
import PROMPT_TITLE_RU from "../../agent/prompt/title.ru.txt"
import PROMPT_SUMMARY from "../../agent/prompt/summary.txt"
import PROMPT_SUMMARY_RU from "../../agent/prompt/summary.ru.txt"
import PROMPT_ROUTER from "../../agent/prompt/router.txt"
import PROMPT_ROUTER_RU from "../../agent/prompt/router.ru.txt"
import PROMPT_AUTO from "../../agent/prompt/auto.txt"
import PROMPT_AUTO_RU from "../../agent/prompt/auto.ru.txt"
import PROMPT_ARCHITECT from "../../agent/prompt/architect.txt"
import PROMPT_ARCHITECT_RU from "../../agent/prompt/architect.ru.txt"
// russian-it-law is now a skill, not an agent (P2-C2 refactor)

export const bash: Record<string, "allow" | "ask" | "deny"> = {
  "*": "ask",
  "cat *": "allow",
  "head *": "allow",
  "tail *": "allow",
  "less *": "allow",
  "ls *": "allow",
  "tree *": "allow",
  "pwd *": "allow",
  "echo *": "allow",
  "wc *": "allow",
  "which *": "allow",
  "type *": "allow",
  "file *": "allow",
  "diff *": "allow",
  "du *": "allow",
  "df *": "allow",
  "date *": "allow",
  "uname *": "allow",
  "whoami *": "allow",
  "printenv *": "allow",
  "man *": "allow",
  "grep *": "allow",
  "rg *": "allow",
  "ag *": "allow",
  "sort *": "allow",
  "uniq *": "allow",
  "cut *": "allow",
  "tr *": "allow",
  "jq *": "allow",
  "touch *": "allow",
  "mkdir *": "allow",
  "cp *": "allow",
  "mv *": "allow",
  "tsc *": "allow",
  "tsgo *": "allow",
  "tar *": "allow",
  "unzip *": "allow",
  "gzip *": "allow",
  "gunzip *": "allow",
}

export const readOnlyBash: Record<string, "allow" | "ask" | "deny"> = {
  "*": "deny",
  "cat *": "allow",
  "head *": "allow",
  "tail *": "allow",
  "less *": "allow",
  "ls *": "allow",
  "tree *": "allow",
  "pwd *": "allow",
  "echo *": "allow",
  "wc *": "allow",
  "which *": "allow",
  "type *": "allow",
  "file *": "allow",
  "diff *": "allow",
  "du *": "allow",
  "df *": "allow",
  "date *": "allow",
  "uname *": "allow",
  "whoami *": "allow",
  "printenv *": "allow",
  "man *": "allow",
  "grep *": "allow",
  "rg *": "allow",
  "ag *": "allow",
  "sort *": "allow",
  "uniq *": "allow",
  "cut *": "allow",
  "tr *": "allow",
  "jq *": "allow",
  "git *": "deny",
  "git log *": "allow",
  "git show *": "allow",
  "git diff *": "allow",
  "git status *": "allow",
  "git blame *": "allow",
  "git rev-parse *": "allow",
  "git rev-list *": "allow",
  "git ls-files *": "allow",
  "git ls-tree *": "allow",
  "git ls-remote *": "allow",
  "git shortlog *": "allow",
  "git describe *": "allow",
  "git cat-file *": "allow",
  "git name-rev *": "allow",
  "git stash list *": "allow",
  "git tag -l *": "allow",
  "git branch --list *": "allow",
  "git branch -a *": "allow",
  "git branch -r *": "allow",
  "git remote -v *": "allow",
  "gh *": "ask",
  "*\n*": "deny",
  "*<(*": "deny",
  "*|*": "deny",
  "*;*": "deny",
  "*&&*": "deny",
  "*&*": "deny",
  "*$(*": "deny",
  "*`*": "deny",
  "*>*": "deny",
  "* > *": "deny",
  "*>>*": "deny",
  "* >> *": "deny",
  "*>|*": "deny",
  "* >| *": "deny",
  "sort -o *": "deny",
  "sort * -o *": "deny",
  "sort --output*": "deny",
  "sort * --output*": "deny",
}

// Always-available meta-tools — every agent has these regardless of groups/config.
export const META_TOOLS = Permission.fromConfig({
  task: "allow",
  question: "allow",
  todowrite: "allow",
})

// All removed. askGuard, planGuard, planEditRules, planEditGuard,
// denies were used by agents removed in the P3 agent refactor.

// Generate per-server MCP wildcard rules that allow MCP tools with user approval.
export function getMcpRules(cfg: Config.Info): Record<string, "allow" | "ask" | "deny"> {
  const rules: Record<string, "allow" | "ask" | "deny"> = {}
  for (const key of Object.keys(cfg.mcp ?? {})) {
    const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, "_")
    rules[sanitized + "_*"] = "ask"
  }
  return rules
}

export interface KiloData {
  mcpRules: Record<string, "allow" | "ask" | "deny">
  defaultsPatch: Permission.Ruleset
}

// Prepare kilo-specific data derived from config. Call once per state initialization.
export function prepare(cfg: Config.Info): KiloData {
  const mcpRules = getMcpRules(cfg)
  const defaultsPatch = Permission.fromConfig({ bash, recall: "ask" })
  return { mcpRules, defaultsPatch }
}

export function cacheKey(cfg: Config.Info) {
  return JSON.stringify({
    agent: cfg.agent,
    default_agent: cfg.default_agent,
    mcp: cfg.mcp,
    mode: cfg.mode,
    permission: cfg.permission,
  })
}

// Map "build" config key to "code" for backward compatibility.
export function resolveKey(name: string): string {
  return name === "build" ? "code" : name
}

// Remap "build" → "code" in agent config entries for backward compat in the config loop.
export function preprocessConfig<T>(agentConfig: Record<string, T>): Record<string, T> {
  const result: Record<string, T> = {}
  for (const [key, value] of Object.entries(agentConfig)) {
    result[key === "build" ? "code" : key] = value
  }
  return result
}

// Set displayName and deprecated from options after config item is processed.
export function processConfigItem(item: {
  options: Record<string, unknown>
  displayName?: string
  deprecated?: boolean
}) {
  if (item.options?.displayName && typeof item.options.displayName === "string") {
    item.displayName = item.options.displayName
  }
}

const locked = new Set(["compaction", "title", "summary"])

function hardRules() {
  return Permission.fromConfig({
    "*": "deny",
  })
}

export function harden(item?: { name: string; permission: Permission.Ruleset }) {
  if (!item) return
  if (!locked.has(item.name)) return
  item.permission = hardRules()
}

export function hardenSystemAgents<T extends { name: string; permission: Permission.Ruleset }>(
  agents: Record<string, T>,
) {
  for (const [key, item] of Object.entries(agents)) {
    if (locked.has(key)) {
      item.permission = hardRules()
      continue
    }
    harden(item)
  }
}

// Returns experimental_telemetry config for generate calls.
// AI SDK span recording (ai.* / gen_ai.*) is disabled.
export function telemetryOptions(_cfg: Config.Info) {
  return { isEnabled: false as const }
}

// Patch the base agents map in-place with NoCowboy changes:
// - Rename build → code
// - Remove upstream unused agents: general, explore, scout, plan
// - Rewrite nocowboy as OpenClaw-style general-purpose assistant
// - Add overseer (Traycer-like review/orchestration agent)
// - Add jurist (Russian IT law specialist)
// - Keep debug
export function patchAgents(
  agents: Record<
    string,
    {
      name: string
      displayName?: string
      description?: string
      deprecated?: boolean
      mode: "subagent" | "primary" | "all"
      native?: boolean
      hidden?: boolean
      topP?: number
      temperature?: number
      color?: string
      permission: Permission.Ruleset
      model?: { modelID: string; providerID: string }
      variant?: string
      prompt?: string
      options: Record<string, unknown>
      steps?: number
    }
  >,
  defaults: Permission.Ruleset,
  user: Permission.Ruleset,
  cfg: Config.Info,
  kilo: KiloData,
  worktree: string,
  whitelistedDirs: string[],
) {
  const lang = cfg.lang ?? "en"
  const routerPrompt = lang === "ru" ? PROMPT_ROUTER_RU : PROMPT_ROUTER

  // ── Agent model configuration ──────────────────────────────────────
  // Each agent can have an explicit `model` field. If omitted, the agent
  // uses the system default (cfg.model in nocowboy.json).
  // Configured here: patchAgents() → agents.<name>.model
  // ────────────────────────────────────────────────────────────────────

  // Rename "build" → "code" for backward compatibility
  if (agents.build) {
    agents.code = {
      ...agents.build,
      name: "code",
      description: "Primary coding agent — writes, refactors, tests, debugs",
      prompt: (lang === "ru" ? PROMPT_CODE_RU : PROMPT_CODE) + routerPrompt,
      model: { providerID: "deepseek" as any, modelID: "deepseek-v4-flash" as any },
      permission: Permission.merge(
        defaults,
        agents.build.permission,
        user,
        Permission.fromConfig({ semantic_search: "allow" }),
      ),
    }
    delete agents.build
  }

  // Remove upstream agents we don't use
  for (const name of ["general", "explore", "scout", "plan"]) {
    delete agents[name]
  }

  // Add nocowboy — OpenClaw-style general-purpose automation agent
  agents.nocowboy = {
    name: "nocowboy",
    description: "Browser, filesystem, shell — full system automation",
    prompt: (lang === "ru" ? PROMPT_NOCOWBOY_RU : PROMPT_NOCOWBOY) + routerPrompt,
    model: { providerID: "deepseek" as any, modelID: "deepseek-v4-flash" as any },
    options: {},
    permission: Permission.merge(defaults, Permission.fromConfig({ suggest: "allow" }), user, META_TOOLS),
    mode: "primary",
    native: true,
  }

  // Add overseer — Traycer-like review/orchestration agent
  agents.overseer = {
    name: "overseer",
    description: "Orchestrates code agent + cross-model review. Read-only.",
    prompt: (lang === "ru" ? PROMPT_OVERSEER_RU : PROMPT_OVERSEER) + routerPrompt,
    model: { providerID: "nocowboy" as any, modelID: "kimi-k2-thinking" as any },
    options: {},
    permission: Permission.merge(
      defaults,
      Permission.fromConfig({
        suggest: "allow",
        plan_enter: "allow",
        plan_exit: "allow",
        semantic_search: "allow",
        codebase_search: "allow",
      }),
      user,
      META_TOOLS,
    ),
    mode: "primary",
    native: true,
  }

  // Add debug agent
  agents.debug = {
    name: "debug",
    description: "Systematic bug diagnosis and root cause analysis",
    prompt: (lang === "ru" ? PROMPT_DEBUG_RU : PROMPT_DEBUG) + routerPrompt,
    model: { providerID: "deepseek" as any, modelID: "deepseek-v4-flash" as any },
    options: {},
    permission: Permission.merge(defaults, Permission.fromConfig({ suggest: "allow", plan_enter: "allow", semantic_search: "allow" }), user, META_TOOLS),
    mode: "primary",
    native: true,
  }

  // Add architect agent — planning and specification
  agents.architect = {
    name: "architect",
    description: "Planning, specification, acceptance criteria — read-only",
    prompt: (lang === "ru" ? PROMPT_ARCHITECT_RU : PROMPT_ARCHITECT),
    model: { providerID: "deepseek" as any, modelID: "deepseek-v4-pro" as any },
    options: {},
    permission: Permission.merge(defaults, Permission.fromConfig({ suggest: "allow", plan_enter: "allow" }), user, META_TOOLS),
    mode: "primary",
    native: true,
  }

  // Add Auto agent — orchestrator, default agent
  agents.auto = {
    name: "auto",
    description: "Orchestrator — routes to architect → code → overseer automatically",
    prompt: (lang === "ru" ? PROMPT_AUTO_RU : PROMPT_AUTO),
    model: { providerID: "deepseek" as any, modelID: "deepseek-v4-flash" as any },
    options: {},
    permission: Permission.merge(defaults, Permission.fromConfig({ suggest: "allow" }), user, META_TOOLS),
    mode: "primary",
    native: true,
  }

  // Russian system prompts for internal agents (compaction, title, summary)
  if (lang === "ru") {
    if (agents.compaction) agents.compaction.prompt = PROMPT_COMPACTION_RU
    if (agents.title) agents.title.prompt = PROMPT_TITLE_RU
    if (agents.summary) agents.summary.prompt = PROMPT_SUMMARY_RU
  }

  hardenSystemAgents(agents)
}

export const RemoveError = NamedError.create("AgentRemoveError", {
  name: Schema.String,
  message: Schema.String,
})

/**
 * Remove a custom agent by deleting its markdown source file and/or
 * removing it from legacy .kilocodemodes YAML files.
 * Scans all config directories for agent/mode .md files matching the name,
 * then also checks the .kilocodemodes files the ModesMigrator reads.
 */
export async function remove(input: { name: string; agent?: AgentInfo; dirs: string[]; directory: string }) {
  if (!input.agent) throw new RemoveError({ name: input.name, message: "agent not found" })
  if (input.agent.native) throw new RemoveError({ name: input.name, message: "cannot remove native agent" })
  // Prevent removal of organization-managed agents
  if (input.agent.options?.source === "organization")
    throw new RemoveError({
      name: input.name,
      message: "cannot remove organization agent — manage it from the cloud dashboard",
    })

  const { unlink, writeFile } = await import("fs/promises")
  let found = false

  // 1. Delete .md files from config directories
  const patterns = ["{agent,agents}/**/" + input.name + ".md", "{mode,modes}/" + input.name + ".md"]
  for (const dir of input.dirs) {
    for (const pattern of patterns) {
      const matches = await Glob.scan(pattern, { cwd: dir, absolute: true, dot: true })
      for (const file of matches) {
        if (await Bun.file(file).exists()) {
          await unlink(file)
          found = true
        }
      }
    }
  }

  // 2. Remove from legacy .kilocodemodes YAML files (read by ModesMigrator)
  const { ModesMigrator } = await import("@/nocowboy/modes-migrator")
  const { NocowboyPaths } = await import("@/nocowboy/paths")
  const os = await import("os")
  const matter = (await import("gray-matter")).default
  const home = os.default.homedir()
  const modesFiles = [
    path.join(NocowboyPaths.vscodeGlobalStorage(), "settings", "custom_modes.yaml"),
    path.join(home, ".nocowboy", "cli", "global", "settings", "custom_modes.yaml"),
    path.join(home, ".kilocodemodes"),
    path.join(input.directory, ".kilocodemodes"),
  ]

  for (const file of modesFiles) {
    const modes = await ModesMigrator.readModesFile(file)
    if (!modes.length) continue

    const filtered = modes.filter((m: { slug: string }) => m.slug !== input.name)
    if (filtered.length === modes.length) continue

    // Rewrite the file without the removed mode
    const yaml = matter
      .stringify("", { customModes: filtered })
      .replace(/^---\n/, "")
      .replace(/\n---\n?$/, "")
    await writeFile(file, yaml)
    found = true
  }

  if (!found) throw new RemoveError({ name: input.name, message: "no agent file found on disk" })
}
