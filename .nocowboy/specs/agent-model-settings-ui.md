---
feature_id: "agent-model-settings-ui"
status: "spec"
---

# Spec: Agent Model Settings UI

## Feature
- **ID:** agent-model-settings-ui
- **Description:** UI for selecting per-agent models in TUI Settings
- **Acceptance criteria:** docs/roadmap.json

## Technical context
- TUI components live in `packages/opencode/src/cli/cmd/tui/component/`
- Settings dialog exists somewhere in there
- Agent models are defined in `nocowboy/agent/index.ts` → `patchAgents()` → `model` field
- Models available: deepseek-v4-flash, deepseek-v4-pro, kimi-k2-thinking
- Each agent (auto, architect, code, debug, overseer, nocowboy) gets a dropdown
- Model changes saved to `cfg.agents.<name>.model` which is stored in nocowboy.json
- After model change, the config overlay applies it

## Files to change

| File | Change |
|------|--------|
| `src/cli/cmd/tui/component/settings-dialog.tsx` | Add agent model dropdown section |
| `src/nocowboy/config/overlay.ts` | Ensure agent.model is in overlay fieldPaths (already there) |

## Implementation steps

1. Find the settings dialog component
2. Add a section "Agent Models" with a dropdown per agent
3. Each dropdown shows: Flash (default auto/code/debug/nocowboy), Pro (architect), Kimi K2 (overseer)
4. On change: save to config and update overlay
5. Display current model from agent definition

## New components
- A settings section rendering agent model dropdowns
- A dropdown selector for each agent (reusing any existing UI pattern)

## Edge cases
- If the model is not in the dropdown list (custom model), show it anyway
- If config save fails, show error in UI
- Model change takes effect on next session (or new task spawn)

## Tests
- Settings dialog renders agent model section
- Model selection calls config update
