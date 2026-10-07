# Capability-конфиг выбора инструментов

> Roadmap id: `tool-capability-config` — status is tracked in `docs/roadmap.json`.

## Description
Upstream chose the edit tool by model name: "if the model id contains `gpt-`
(but not `oss`/`gpt-4`), prefer `apply_patch`; otherwise `edit`". There is no
single required editing methodology — the right tool depends on the model, the
enabled tools and the prompt — so the switch is now data.

`packages/opencode/src/nocowboy/tool/capabilities.ts`:

- `selectEditCapability({ providerID, modelID, config?, force? })` evaluates an
  ordered list of `{ match, tool: edit | apply_patch }` rules (glob over
  `providerID/modelID`, `**` crosses `/`) and returns the first match, else the
  fallback. `force` is the E2E override.
- `DEFAULT_TOOL_CAPABILITIES` reproduces the legacy gpt behavior exactly:
  `**gpt-4**` → edit, `**gpt-*oss**` → edit, `**gpt-**` → apply_patch, else edit.

The config seam is `experimental.tool_capabilities` in `nocowboy.json`
(`{ edit: [{match, tool}], default_edit_tool }`). `tool/registry.ts` no longer
branches on the model name — it calls the resolver — so the model-name tool
switch is gone from call sites.

## Key files
- `packages/opencode/src/nocowboy/tool/capabilities.ts`
- `packages/opencode/src/config/config.ts`
- `packages/opencode/src/tool/registry.ts`

## Verification
- `bun test test/nocowboy/tool-capabilities.test.ts` — 5 pass (legacy behavior,
  force, caller config, plus a source guard that registry.ts has no model-name
  switch).
- `bun test test/tool/registry.test.ts` — registry behavior unchanged.
- `bun run typecheck` — clean.
