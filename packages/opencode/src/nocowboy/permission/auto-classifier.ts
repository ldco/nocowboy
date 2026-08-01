/**
 * Auto-Permission Classifier — three-level safety classification for tool calls.
 *
 * Used by autonomous mode (goal agent) to auto-approve safe operations while
 * still guarding against destructive or risky ones. This is NOT a replacement
 * for the full permission system — it augments it when a session runs with
 * auto-approval enabled.
 *
 * Levels:
 *   SAFE   — read-only, always auto-approved (read, grep, glob, test/lint runs)
 *   CAUTION — modifies project state but reversible, auto-approved with audit log
 *   BLOCK  — destructive or out-of-project, always requires user approval
 */
import type { Permission } from "@/permission"

export type AutoLevel = "safe" | "caution" | "block"

export type Classification = {
  level: AutoLevel
  reason: string
}

// ── SAFE: read-only commands / non-mutating tool calls ────────────────────
const SAFE_BASH_PATTERNS: RegExp[] = [
  /^(cat|head|tail|less|more|ls|tree|pwd|echo|wc|which|type|file|diff|du|df|date|uname|whoami|printenv|man|grep|rg|ag|sort|uniq|cut|tr|jq|find)\b/i,
  /^(git)\s+(log|show|diff|status|blame|rev-parse|rev-list|ls-files|ls-tree|ls-remote|shortlog|describe|cat-file|name-rev|stash\s+list|tag\s+-l|branch\s+(--list|-a|-r)|remote\s+-v)\b/i,
  /^(npm|bun|pnpm|yarn)\s+(test|run\s+lint|run\s+typecheck|run\s+type-check|exec)\b/i,
  /^(bun)\s+(test|run\s+typecheck|run\s+lint)\b/i,
  /^(tsc|tsgo)\s+--noEmit\b/i,
  /^(cargo)\s+(check|test|clippy)\b/i,
  /^(python|python3|node)\s+.*\.(py|js|ts)\s*$/i,
]

// ── CAUTION: modifies project state but reversible ────────────────────────
const CAUTION_BASH_PATTERNS: RegExp[] = [
  /^(touch|mkdir|cp|mv|rm)\s+/i,
  /^(git)\s+(add|commit|rm|mv|checkout\s+--|restore)\b/i,
  /^(npm|bun|pnpm|yarn)\s+(install|add|remove|update|dedupe)\b/i,
  /^(bun)\s+(install|add|remove|update)\b/i,
  /^(code|write|edit|patch|search_replace)\b/i,
]

// ── BLOCK: destructive or out-of-scope, always prompt ─────────────────────
const BLOCK_BASH_PATTERNS: RegExp[] = [
  /^(sudo|rm\s+(-[a-z]*[fr])|rm\s+-rf\s+\/|shutdown|reboot|halt|poweroff)\b/i,
  /rm\s+(-[a-z]*[fr])/i,
  /(git)\s+(push\s+--force|reset\s+--hard|clean\s+-[a-z]*f)/i,
  /(\bkubectl|\bhelm|\bdocker\s+(rm|rmi|system|volume|network))\b/i,
  /\bcurl\s+-[a-z]*[XkLO]\b/i,
  /(dd\s+of=|mkfs\.|fdisk|parted|kill\s+-9\s+1)/i,
]

const SAFE_TOOLS = new Set(["read", "grep", "glob", "list", "semantic_search", "task_status"])
const CAUTION_TOOLS = new Set(["write", "edit", "patch", "search_replace", "todo", "todowrite", "task", "plan", "plan_exit", "goal_set", "goal_clear", "notebook", "background_process"])

export namespace AutoPermissionClassifier {
  /** Classify a bash command string into a safety level. */
  export function classifyBash(command: string): Classification {
    for (const pattern of BLOCK_BASH_PATTERNS) {
      if (pattern.test(command)) return { level: "block", reason: `matches dangerous pattern: ${pattern}` }
    }
    for (const pattern of CAUTION_BASH_PATTERNS) {
      if (pattern.test(command)) return { level: "caution", reason: `mutating command: ${pattern}` }
    }
    for (const pattern of SAFE_BASH_PATTERNS) {
      if (pattern.test(command)) return { level: "safe", reason: `read-only command: ${pattern}` }
    }
    return { level: "block", reason: "unrecognized bash command — require approval" }
  }

  /** Classify a non-bash tool call into a safety level. */
  export function classifyTool(tool: string): Classification {
    if (SAFE_TOOLS.has(tool)) return { level: "safe", reason: `read-only tool: ${tool}` }
    if (CAUTION_TOOLS.has(tool)) return { level: "caution", reason: `mutating tool: ${tool}` }
    return { level: "block", reason: `unrecognized tool: ${tool}` }
  }

  /**
   * Build a permission ruleset that auto-approves SAFE + CAUTION operations
   * while forcing BLOCK operations to ask. Returns rules that can be merged
   * into a session's permission set for autonomous runs.
   */
  export function autoRuleset(): Permission.Ruleset {
    return [
      { permission: "*", pattern: "*", action: "ask" },
      { permission: "read", pattern: "*", action: "allow" },
      { permission: "grep", pattern: "*", action: "allow" },
      { permission: "glob", pattern: "*", action: "allow" },
      { permission: "list", pattern: "*", action: "allow" },
      { permission: "semantic_search", pattern: "*", action: "allow" },
      { permission: "task_status", pattern: "*", action: "allow" },
      { permission: "write", pattern: "*", action: "allow" },
      { permission: "edit", pattern: "*", action: "allow" },
      { permission: "patch", pattern: "*", action: "allow" },
      { permission: "search_replace", pattern: "*", action: "allow" },
      { permission: "todo", pattern: "*", action: "allow" },
      { permission: "todowrite", pattern: "*", action: "allow" },
      { permission: "task", pattern: "*", action: "allow" },
      { permission: "plan", pattern: "*", action: "allow" },
      { permission: "plan_exit", pattern: "*", action: "allow" },
      { permission: "goal_set", pattern: "*", action: "allow" },
      { permission: "goal_clear", pattern: "*", action: "allow" },
      { permission: "bash", pattern: "cat *", action: "allow" },
      { permission: "bash", pattern: "grep *", action: "allow" },
      { permission: "bash", pattern: "ls *", action: "allow" },
      { permission: "bash", pattern: "bun test *", action: "allow" },
      { permission: "bash", pattern: "bun run typecheck*", action: "allow" },
      { permission: "bash", pattern: "bun run lint*", action: "allow" },
      { permission: "bash", pattern: "git status *", action: "allow" },
      { permission: "bash", pattern: "git diff *", action: "allow" },
      { permission: "bash", pattern: "git log *", action: "allow" },
    ]
  }
}
