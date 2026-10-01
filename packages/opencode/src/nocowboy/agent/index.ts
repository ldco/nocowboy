import { Permission } from "@/permission"
import { NamedError } from "@nocowboy/core/util/error"
import { Glob } from "@nocowboy/core/util/glob"
import * as Truncate from "../../tool/truncate"
import { Config } from "../../config/config"
import { Provider } from "../../provider/provider"
import type { Info as AgentInfo } from "../../agent/agent"
import { Schema } from "effect"
import path from "path"
import { Global } from "@nocowboy/core/global"

import PROMPT_NOCOWBOY from "../../agent/prompt/nocowboy.txt"
import PROMPT_NOCOWBOY_RU from "../../agent/prompt/nocowboy.ru.txt"
import PROMPT_REVIEWER from "../../agent/prompt/reviewer.txt"
import PROMPT_REVIEWER_RU from "../../agent/prompt/reviewer.ru.txt"
import PROMPT_WORKER from "../../agent/prompt/worker.txt"
import PROMPT_WORKER_RU from "../../agent/prompt/worker.ru.txt"
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
import PROMPT_PLANNER from "../../agent/prompt/planner.txt"
import PROMPT_PLANNER_RU from "../../agent/prompt/planner.ru.txt"
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

// Map legacy agent names to the current set for backward compatibility:
// the old coding personas (build/general/code/debug → worker, overseer →
// reviewer) fold into the simplified NoCowboy set. `architect` is now a
// first-class agent again (design stage before planner), so it is NOT remapped.
export function resolveKey(name: string): string {
  switch (name) {
    case "general":
    case "build":
    case "code":
    case "debug":
      return "worker"
    case "overseer":
      return "reviewer"
    default:
      return name
  }
}

// Remap legacy keys to their current agent names in config entries for
// backward compat in the config loop.
export function preprocessConfig<T>(agentConfig: Record<string, T>): Record<string, T> {
  const result: Record<string, T> = {}
  for (const [key, value] of Object.entries(agentConfig)) {
    result[resolveKey(key)] = value
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
// - Fold upstream "build" into worker; remove upstream unused agents:
//   general, explore, scout, plan
// - Agent set: auto (dispatcher), architect (system design), planner
//   (spec + acceptance criteria), worker (implementation), reviewer
//   (verification), nocowboy (companion)
// - Delegated agents use mode "all": they stay selectable in the TUI AND are
//   spawnable via the task tool (the task tool only lists mode !== "primary").
//   `auto` stays "primary" — the dispatcher must never be a subagent.
// - architect/planner/reviewer are read-only; reviewer runs a different model
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
  //
  // Fallback chain:
  //   1. Agent-specific model from config (nocowboy.json agent.<name>.model)
  //   2. Default model from config (nocowboy.json model)
  //   3. Hardcoded fallback per agent type
  // ────────────────────────────────────────────────────────────────────

  function resolveModel(
    agentName: string,
    hardcoded: { providerID: string; modelID: string },
  ): { providerID: string; modelID: string } {
    const agentCfg = cfg.agent?.[agentName]
    if (agentCfg?.model) {
      return Provider.parseModel(agentCfg.model) as unknown as { providerID: string; modelID: string }
    }
    if (cfg.model) {
      return Provider.parseModel(cfg.model) as unknown as { providerID: string; modelID: string }
    }
    return hardcoded
  }

  // Upstream default coding agent "build" becomes NoCowboy's "worker".
  if (agents.build) {
    agents.worker = {
      ...agents.build,
      name: "worker",
      description: "Primary engineering agent — implements, refactors, tests, debugs",
      prompt: (lang === "ru" ? PROMPT_WORKER_RU : PROMPT_WORKER) + routerPrompt,
      model: resolveModel("worker", { providerID: "deepseek", modelID: "deepseek-v4-flash" }),
      permission: Permission.merge(
        defaults,
        agents.build.permission,
        user,
        Permission.fromConfig({ semantic_search: "allow" }),
      ),
      mode: "all",
    }
    delete agents.build
  }

  // Remove upstream agents we don't use
  for (const name of ["general", "explore", "scout", "plan"]) {
    delete agents[name]
  }

  // Add nocowboy — companion agent. Chat, ideas, questions, conversation.
  // Technical work is delegated to planner/worker/reviewer via #route.
  agents.nocowboy = {
    name: "nocowboy",
    description: "Companion — chat, brainstorming, questions, conversations. The soul of NoCowboy.",
    prompt: (lang === "ru" ? PROMPT_NOCOWBOY_RU : PROMPT_NOCOWBOY) + routerPrompt,
    model: resolveModel("nocowboy", { providerID: "deepseek", modelID: "deepseek-v4-flash" }),
    options: {},
    permission: Permission.merge(defaults, Permission.fromConfig({ suggest: "allow" }), user, META_TOOLS),
    mode: "all",
    native: true,
  }

  // Add reviewer — Traycer-like review/verification agent. Read-only.
  agents.reviewer = {
    name: "reviewer",
    description: "Reviews work against acceptance criteria. Cross-model, read-only.",
    prompt: (lang === "ru" ? PROMPT_REVIEWER_RU : PROMPT_REVIEWER) + routerPrompt,
    model: resolveModel("reviewer", { providerID: "moonshotai", modelID: "kimi-k3" }),
    options: {},
    permission: Permission.merge(
      defaults,
      Permission.fromConfig({
        suggest: "allow",
        semantic_search: "allow",
        codebase_search: "allow",
      }),
      user,
      META_TOOLS,
    ),
    mode: "all",
    native: true,
  }

  // Add architect — system design stage. Designs the shape of the system
  // (ADRs, C4, ISO 25010 trade-offs) and hands the approved design to planner.
  // Read-only beyond design artifacts (docs/ and .nocowboy/plans/).
  agents.architect = {
    name: "architect",
    description: "Senior architect — system design, ADRs, trade-offs, NFR analysis. Read-only.",
    prompt: (lang === "ru" ? PROMPT_ARCHITECT_RU : PROMPT_ARCHITECT) + routerPrompt,
    model: resolveModel("architect", { providerID: "deepseek", modelID: "deepseek-v4-pro" }),
    options: {},
    // Restrictive rules go LAST (after defaults/user/META_TOOLS): Permission
    // .evaluate returns the LAST matching rule, so a global `permission.bash`
    // or `permission.edit` allow cannot silently re-grant what a read-only
    // agent must not have. Agent-level config still merges later in agent.ts,
    // so users can still opt out explicitly.
    permission: Permission.merge(
      defaults,
      user,
      META_TOOLS,
      Permission.fromConfig({
        suggest: "allow",
        plan_enter: "allow",
        bash: readOnlyBash,
        edit: {
          "*": "deny",
          "docs/*.md": "allow",
          "docs/*.json": "allow",
          ".nocowboy/plans/*.md": "allow",
        },
      }),
    ),
    mode: "all",
    native: true,
  }

  // Add planner agent — planning and specification. Consumes the architect's
  // design and turns it into a spec plus acceptance criteria. Read-only.
  agents.planner = {
    name: "planner",
    description: "Planning, specification, acceptance criteria — read-only",
    prompt: (lang === "ru" ? PROMPT_PLANNER_RU : PROMPT_PLANNER) + routerPrompt,
    model: resolveModel("planner", { providerID: "deepseek", modelID: "deepseek-v4-pro" }),
    options: {},
    permission: Permission.merge(defaults, Permission.fromConfig({ suggest: "allow", plan_enter: "allow" }), user, META_TOOLS),
    mode: "all",
    native: true,
  }

  // Add Auto agent — dispatcher, default agent. Decides which agent to start.
  agents.auto = {
    name: "auto",
    description: "Dispatcher — decides which agent to run for the current task",
    prompt: (lang === "ru" ? PROMPT_AUTO_RU : PROMPT_AUTO),
    model: resolveModel("auto", { providerID: "deepseek", modelID: "deepseek-v4-flash" }),
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
