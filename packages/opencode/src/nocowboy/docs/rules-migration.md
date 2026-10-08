# Kilocode Rules Migration

This document explains how Kilocode rules are automatically migrated to Opencode's `instructions` config array.

## Overview

Kilocode stores rules in various file locations. When Opencode starts, it reads these files and injects their paths into the `instructions` config array, which Opencode then loads as part of the system prompt.

## Key Guarantees

### 1. Read-Only Migration

The migration **never modifies project files**. We only:

- Read existing rule files from disk
- Inject file paths into the config's `instructions` array
- Never write to the project or modify any files

### 2. Combines with Existing Config (Never Overwrites)

If you have existing opencode config with `instructions`, the Kilocode rules are **combined**, not replaced:

```typescript
// Example: User has opencode.json with:
{ "instructions": ["AGENTS.md", "custom-rules.md"] }

// Kilocode rules add:
{ "instructions": [".kilocoderules", ".nocowboy/rules/coding.md"] }

// Result (combined, deduplicated):
{ "instructions": ["AGENTS.md", "custom-rules.md", ".kilocoderules", ".nocowboy/rules/coding.md"] }
```

### 3. Restart to Pick Up Changes

If you change your Kilocode configuration (e.g., edit `.kilocoderules`), simply restart kilo-cli to pick up the new config. No manual migration or conversion needed.

## Source Locations

The migrator reads rules from these locations:

### Project Rules

| Location | Description |
|---|---|
| `.kilocoderules` | Legacy single-file rules in project root |
| `.nocowboy/rules/*.md` | Directory-based rules (multiple markdown files) |
| `.kilocoderules-{agent}` | Agent-specific legacy rules (e.g., `.kilocoderules-worker`) |
| `.nocowboy/rules-{agent}/*.md` | Agent-specific rule directories |

### Global Rules

| Location | Description |
|---|---|
| `~/.nocowboy/rules/*.md` | Global rules directory |

## File Mapping

| Kilocode Location | Opencode Equivalent |
|---|---|
| `.kilocoderules` | `instructions: [".kilocoderules"]` |
| `.kilocoderules-{agent}` | scoped instructions for that agent only |
| `.nocowboy/rules/*.md` | `instructions: [".nocowboy/rules/file.md", ...]` |
| `.nocowboy/rules-{agent}/*.md` | scoped instructions for that agent only |
| `~/.nocowboy/rules/*.md` | `instructions: ["~/.nocowboy/rules/file.md", ...]` |

## AGENTS.md Compatibility

`AGENTS.md` is loaded **natively** by Opencode - no migration needed. Opencode automatically loads:

- `AGENTS.md` in project root
- `CLAUDE.md` in project root
- `~/.opencode/AGENTS.md` (global)

## Not Migrated

The following are **not** migrated:

- `.roorules` - Roo-specific rules
- `.clinerules` - Cline-specific rules

Only Kilocode-specific files (`.kilocoderules`, `.nocowboy/rules/`) are migrated.

## Agent-Scoped Rules

Rules under `.nocowboy/rules-{agent}/` (or `.kilocoderules-{agent}`) apply to **one
agent only** — the agent whose name matches `{agent}`. They are resolved per agent
by the instruction service and are **never** placed in the global
`config.instructions` list, so they cannot leak to another agent.

`{agent}` must be one of the real agents: `worker`, `nocowboy`, `reviewer`,
`architect`, `planner`, `auto`. Unknown names (including the legacy `code` and
`debug`) are not discovered. A rule meant for everyone belongs in the unscoped
`.nocowboy/rules/` directory instead.

Example: `.nocowboy/rules-nocowboy/soul.md` reaches only the `nocowboy` agent.

## Warnings

The migrator generates warnings for:

- **Legacy files**: When `.kilocoderules` is found, a warning suggests migrating to `.nocowboy/rules/` directory structure

## Example

### Before (Kilocode)

```
project/
├── .kilocoderules           # Legacy rules
├── .kilocoderules-worker    # Worker-specific legacy rules
└── .nocowboy/
    ├── rules/
    │   ├── coding.md        # Coding standards (all agents)
    │   └── testing.md       # Testing guidelines (all agents)
    └── rules-nocowboy/
        └── soul.md          # Soul rules (nocowboy agent only)
```

### After (Opencode Config)

The global instruction list carries the unscoped rules only. The `soul.md` rule is
resolved at prompt time for the `nocowboy` agent and never appears here.

```json
{
  "instructions": [
    "/path/to/project/.nocowboy/rules/coding.md",
    "/path/to/project/.nocowboy/rules/testing.md",
    "/path/to/project/.kilocoderules"
  ]
}
```

## Troubleshooting

### Rules not appearing

1. Check the file exists at the expected location
2. Ensure markdown files have `.md` extension
3. Restart kilo-cli to pick up changes

### Duplicate rules

The `mergeConfigConcatArrays` function automatically deduplicates the `instructions` array using `Array.from(new Set([...]))`.

## Related Files

- [`rules-migrator.ts`](../rules-migrator.ts) - Core migration logic
- [`config-injector.ts`](../config-injector.ts) - Config building and injection
- [`modes-migration.md`](./modes-migration.md) - Modes migration documentation
