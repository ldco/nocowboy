/**
 * File ownership manifest — owned / adapted / generated.
 *
 * A fork must know which files it authored, which it adapted from upstream, and
 * which are generated. Crucially, "owned" is NOT "anything under
 * `src/nocowboy`": NoCowboy's logic is called from shared-core files
 * (`session/prompt.ts`, `tool/task.ts`, `permission/*`, `tool/registry.ts`),
 * which are adapted upstream files and must be listed as such.
 *
 * Classification is pattern-based and pure. Priority is generated > owned >
 * adapted, so an exact generated output wins over an owned directory, an owned
 * NoCowboy directory wins over the broad `packages/**` adapted catch-all, and
 * anything matching nothing is unclassified (the gate's job is to catch that).
 */

export type OwnershipClass = "owned" | "adapted" | "generated"
export type Ownership = OwnershipClass | "unclassified"

export interface OwnershipManifest {
  schemaVersion: number
  /** Patterns per class. Evaluated in the fixed priority generated > owned > adapted. */
  classes: Record<OwnershipClass, string[]>
  /**
   * Shared-core call sites — upstream engine files where NoCowboy logic is
   * invoked. Every one must classify as `adapted`.
   */
  callSites: string[]
}

export const OWNERSHIP_SCHEMA_VERSION = 1

const CLASS_PRIORITY: OwnershipClass[] = ["generated", "owned", "adapted"]

/**
 * The default ownership manifest. `ownership-manifest.json` is its serialization;
 * the check compares against it so the file cannot drift.
 */
export const DEFAULT_OWNERSHIP_MANIFEST: OwnershipManifest = {
  schemaVersion: OWNERSHIP_SCHEMA_VERSION,
  classes: {
    // Regenerable outputs of our doc/manifest generators.
    generated: [
      "docs/ROADMAP.md",
      "docs/CHANGELOG.md",
      "docs/BACKLOG.md",
      "docs/features/**",
      "engine-manifest.json",
      "ownership-manifest.json",
    ],
    // Files NoCowboy authored and fully controls.
    owned: [
      "packages/opencode/src/nocowboy/**",
      "packages/opencode/src/kilocode/**",
      "packages/opencode/test/nocowboy/**",
      "packages/opencode/test/kilocode/**",
      "packages/nocowboy-*/**",
      "scripts/**",
      "packaging/**",
      ".nocowboy/**",
      "docs/**",
    ],
    // The upstream fork surface we adapt. The broad `packages/**` catch-all is
    // the point: shared-core files are ours-to-adapt, not ours-to-own.
    adapted: [
      "packages/opencode/src/session/prompt.ts",
      "packages/opencode/src/session/processor.ts",
      "packages/opencode/src/session/system.ts",
      "packages/opencode/src/tool/task.ts",
      "packages/opencode/src/tool/registry.ts",
      "packages/opencode/src/tool/search_replace.ts",
      "packages/opencode/src/agent/agent.ts",
      "packages/opencode/src/permission/**",
      "packages/**",
      // Repo-root / tooling files adapted from upstream.
      "package.json",
      "bun.lock",
      "bunfig.toml",
      "turbo.json",
      "tsconfig.json",
      "tsconfig.base.json",
      ".husky/**",
      ".gitignore",
      ".gitattributes",
      "AGENTS.md",
      "README.md",
      "install.sh",
      "*.md",
    ],
  },
  callSites: [
    "packages/opencode/src/session/prompt.ts",
    "packages/opencode/src/session/processor.ts",
    "packages/opencode/src/session/system.ts",
    "packages/opencode/src/tool/task.ts",
    "packages/opencode/src/tool/registry.ts",
    "packages/opencode/src/permission/index.ts",
    "packages/opencode/src/agent/agent.ts",
  ],
}

function escapeChar(char: string): string {
  return /[.*+?^${}()|[\]\\]/.test(char) ? "\\" + char : char
}

/** Compile a `**`/`*` glob to an anchored regex over a normalized posix path. */
function globToRegExp(pattern: string): RegExp {
  let body = ""
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]!
    if (char === "*") {
      if (pattern[i + 1] === "*") {
        body += ".*" // ** crosses path separators
        i++
      } else {
        body += "[^/]*" // * stays within one segment
      }
    } else {
      body += escapeChar(char)
    }
  }
  return new RegExp(`^${body}$`)
}

export function normalizeOwnershipPath(input: string): string {
  return input.replaceAll("\\", "/").replace(/^\.\//, "")
}

/** Classify one path (first matching class in priority order, else unclassified). */
export function classifyPath(path: string, manifest: OwnershipManifest = DEFAULT_OWNERSHIP_MANIFEST): Ownership {
  const normalized = normalizeOwnershipPath(path)
  for (const cls of CLASS_PRIORITY) {
    for (const pattern of manifest.classes[cls] ?? []) {
      if (globToRegExp(pattern).test(normalized)) return cls
    }
  }
  return "unclassified"
}

/** Paths from `paths` that no class covers. */
export function unclassifiedPaths(
  paths: ReadonlyArray<string>,
  manifest: OwnershipManifest = DEFAULT_OWNERSHIP_MANIFEST,
): string[] {
  return paths.filter((path) => classifyPath(path, manifest) === "unclassified")
}

/** Validate structure and the call-site/class consistency. */
export function validateOwnershipManifest(manifest: OwnershipManifest): string[] {
  const errors: string[] = []
  if (!manifest || typeof manifest !== "object") return ["manifest is not an object"]
  if (manifest.schemaVersion !== OWNERSHIP_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${OWNERSHIP_SCHEMA_VERSION}`)
  }
  for (const cls of ["owned", "adapted", "generated"] as const) {
    const patterns = manifest.classes?.[cls]
    if (!Array.isArray(patterns) || patterns.length === 0) errors.push(`classes.${cls} must be a non-empty array`)
    else if (patterns.some((p) => typeof p !== "string" || p.trim().length === 0)) {
      errors.push(`classes.${cls} must contain non-empty strings`)
    }
  }
  if (!Array.isArray(manifest.callSites) || manifest.callSites.length === 0) {
    errors.push("callSites must be a non-empty array")
  } else {
    for (const site of manifest.callSites) {
      if (classifyPath(site, manifest) !== "adapted") {
        errors.push(`call site ${site} must classify as adapted`)
      }
    }
  }
  return errors
}
