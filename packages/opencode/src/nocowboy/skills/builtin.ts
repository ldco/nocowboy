// nocowboy_change - new file
// Built-in skills that ship inside the CLI binary.
// Content is inlined at compile time via Bun's static import of .md files.
// Registered before all discovery phases so user skills with the same name override.

import KILO_CONFIG from "./nocowboy-config.md"

export interface BuiltinSkill {
  name: string
  description: string
  category?: string
  content: string
}

export const BUILTIN_SKILLS: BuiltinSkill[] = [
  {
    name: "nocowboy-config",
    description:
      "Guide for NoCowboy configuration: config paths, nocowboy.json fields, commands, agents, skills, permissions, MCPs, providers, TUI settings, and conventions.",
    category: "NoCowboy",
    content: KILO_CONFIG,
  },
]
