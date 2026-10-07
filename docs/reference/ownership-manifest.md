# File ownership manifest

`ownership-manifest.json` (repo root) classifies the tree into three classes so
the fork knows what it authored, what it adapted from upstream, and what is
generated. It is the serialization of the pure classifier in
`packages/opencode/src/nocowboy/ownership/manifest.ts`.

```
bun run scripts/ownership-manifest.ts                 # regenerate
bun run scripts/ownership-manifest.ts --check          # sync + valid
bun run scripts/ownership-manifest.ts --check-staged   # gate staged paths
```

## Classes (priority: generated > owned > adapted)

| Class | Meaning | Patterns |
| --- | --- | --- |
| `generated` | Regenerable outputs of the doc/manifest generators. | `docs/ROADMAP.md`, `docs/CHANGELOG.md`, `docs/BACKLOG.md`, `docs/features/**`, `engine-manifest.json`, `ownership-manifest.json` |
| `owned` | Files NoCowboy authored and fully controls. | `packages/opencode/src/nocowboy/**`, `src/kilocode/**`, nocowboy test dirs, `packages/nocowboy-*/**`, `scripts/**`, `.nocowboy/**`, `docs/**` |
| `adapted` | The upstream fork surface we adapt (the broad `packages/**`) plus repo-root/tooling files. | |

Anything matching none of the patterns is **unclassified** — and unclassified is
what the gate catches.

## Why not "owned = src/nocowboy"

NoCowboy's logic is *called from* shared-core upstream files. The manifest
records those call sites explicitly (`callSites`):

```
packages/opencode/src/session/prompt.ts
packages/opencode/src/session/processor.ts
packages/opencode/src/session/system.ts
packages/opencode/src/tool/task.ts
packages/opencode/src/tool/registry.ts
packages/opencode/src/permission/index.ts
packages/opencode/src/agent/agent.ts
```

`validateOwnershipManifest` requires every call site to classify as `adapted`,
so the manifest cannot claim ownership of code that actually lives in the shared
core.

## The gate

`.husky/pre-commit` runs `--check` (manifest in sync + valid) and
`--check-staged` (every staged path has a class). A new file that belongs to
none of the known roots fails the commit until it is classified.
