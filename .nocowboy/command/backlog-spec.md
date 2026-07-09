---
description: "Generate a detailed implementation spec from a roadmap feature"
mode: all
---
Generate a spec (.nocowboy/specs/<feature-id>.md) for a feature in docs/roadmap.json.

Architect reads the feature from roadmap.json, analyzes the codebase,
and writes a detailed implementation spec for the code agent.

Process:
1. Read feature from roadmap.json by id or title
2. Analyze codebase: existing files, modules, APIs, data flow
3. Write spec to `.nocowboy/specs/<feature-id>.md` using TEMPLATE format
4. Present to user with /approve, /edit, /reject

Spec template: `.nocowboy/specs/TEMPLATE.md`

Sections:
- Feature (from roadmap.json)
- Technical context
- Files to change (table: file → change)
- Implementation steps
- New functions/types/classes
- Edge cases
- Tests
- Checklist (code agent)

Usage:
`/backlog-spec <feature-id>`

Examples:
`/backlog-spec rate-limiting`
`/backlog-spec yandex-gigachat`
