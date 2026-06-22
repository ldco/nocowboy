# NoCowboy Dogfooding Strategy

## Goal

Develop NoCowboy using NoCowboy — replace kilocode as the daily development tool.

## The Two Things (never conflate)

| | The TOOL | The TARGET |
|---|---|---|
| What | Installed NoCowboy app on the system: own binary on PATH, own global config `~/.config/nocowboy/` | The NoCowboy project repo |
| Role | What you use to develop (like installed kilocode/opencode/mimo — all separate apps) | What you build; tested with `bun run dev` |
| Dev framework | Lives here → `~/.config/nocowboy/` | Optional repo-local `.nocowboy/` for repo-specific settings |

kilocode, opencode, and Xiaomi MiMo are entirely separate installed apps. NoCowboy must stand on its own and is the app we migrate onto.

**Dogfooding loop:** edit repo → `bun run dev` to test the dev build → when stable, build + install a new `nocowboy` system binary → use that newer installed NoCowboy to develop further (self-hosting bootstrap).

## Verified Current State (code, not docs)

| Fact | Location | Status |
|---|---|---|
| Global app name = `nocowboy` → config `~/.config/nocowboy/`, data `~/.local/share/nocowboy/` | `packages/core/src/global.ts:11` | ✅ done |
| Config file `nocowboy.json` / `nocowboy.jsonc` supported | `config.ts:433,559` | ✅ done |
| Config DIRECTORY targets still `.kilocode, .kilo, .opencode` | `config/paths.ts:29,35` | 🔴 fix |
| `install` script installs Kilo (`APP=kilo`, `$HOME/.kilo/bin`, host `kilo.ai/cli/install`) | `install:3,70` | 🔴 fix |
| `build.ts` injects `NOCOWBOY_VERSION`, uploads to GitHub releases; source link still `Kilo-Org/kilocode` | `build.ts:326,388,413` | ⚠️ fix host link |
| Dev framework lives in kilocode global config | `~/.config/kilo/kilo.json` (absolute paths) | 🔴 port |
| Gateway dir still `packages/kilo-gateway/`; share = InternalServerError | — | ⚠️ later |
| OSTT / ffmpeg / whisper external (not bundled) | system PATH + systemd | 🔴 Phase 2 |

## Locked Decisions

- Config dirs: **hard break — `.nocowboy` only** (drop `.kilo/.kilocode/.opencode`)
- Dev framework target: **installed app global config `~/.config/nocowboy/`**
- Dependencies: **installer fetches them** (no fat bundles)
- Release host: **GitHub releases** (build.ts already uses `gh release upload`)
- `KILO_*` env flags: leave (low-priority cosmetic)

---

## Phase 0 — Stand up installed NoCowboy (the TOOL)

1. **Config dir hard break** — `packages/opencode/src/config/paths.ts:29,35`:
   `targets: [".nocowboy"]` (remove `.kilocode`, `.kilo`, `.opencode`).
2. **Rebrand `install` script** — `APP=nocowboy`; `INSTALL_DIR=$HOME/.nocowboy/bin`; usage/host text → NoCowboy GitHub releases; download URL → NoCowboy release repo.
3. **Fix `build.ts` source link** — `https://github.com/Kilo-Org/kilocode` → NoCowboy repo (`build.ts:388`).
4. **Build + install** — `bun run build` → install the `nocowboy` binary on PATH (`install --binary <path>` for first bootstrap).
5. **Confirm** global config resolves to `~/.config/nocowboy/` (verified) and project reads `.nocowboy/`.

**Verification**
- [ ] `nocowboy --version` prints the built `NOCOWBOY_VERSION`
- [ ] `which nocowboy` → `$HOME/.nocowboy/bin/nocowboy`
- [ ] Installed NoCowboy reads `~/.config/nocowboy/nocowboy.json`
- [ ] Project `.nocowboy/` is picked up; no `.kilo` lookups remain (grep `paths.ts`)

**Rollback:** keep using kilocode; uninstall = remove `$HOME/.nocowboy/bin` + `~/.config/nocowboy/`.

---

## Phase 1 — Port the dev framework into `~/.config/nocowboy/`

Recreate, de-branded, what currently lives in `~/.config/kilo/kilo.json` + `~/.config/kilo/.kilo/agents/`.

| Item | Count | Source | Target |
|---|---|---|---|
| Agents | 6 | architect (inline), code-reviewer, prd, ralph, explore, plan | `~/.config/nocowboy/agent/*.md` + `nocowboy.json` agent block (relative paths, not `/home/ldco/...`) |
| Commands | 16 | `~/.config/kilo/commands/*.md` | `~/.config/nocowboy/command/*.md` |
| Instructions | 13 + 3 rules | `~/.config/kilo/instructions/` | `~/.config/nocowboy/instructions/` (drop `multi-provider.md`; update `auto-memory.md`) |
| Skills | 8 | `~/.kilo/skills`, `~/.kilocode/skills` | `~/.config/nocowboy/skills/` |
| MCP — keep | 11 | tausik, constitution, score-engine, contract-guard, ncp-validator, ralph, puppetmaster, context7, sqlite, puppeteer, git | `nocowboy.json` mcp block (remote :8200-8219) |
| MCP — drop | 5 | session-memory, hooks (keep channels only), orchestrator, plugin-registry, team-coordinator | not registered |

De-brand all copied content (`kilo`→`nocowboy`); fix absolute paths to the new global dir.

**Verification**
- [ ] `nocowboy` lists all 6 agents; each loads
- [ ] All 16 commands present
- [ ] Instructions load (no `multi-provider.md`)
- [ ] 11 MCP servers connect (`tools/list`); 5 dropped absent
- [ ] No path references to `~/.config/kilo` remain

**Rollback:** delete `~/.config/nocowboy/{agent,command,instructions,skills}` and the mcp/agent blocks.

---

## Phase 2 — One-app dependency install

Installer fetches everything so a fresh machine works.

| Dependency | Acquisition |
|---|---|
| ffmpeg | OS package manager (pacman/apt/brew/winget) detected by `install` |
| ostt | run OSTT's official installer from `install` |
| whisper model | first-run download via `ostt model local download` |
| MCP daemons | install + enable the systemd user services (ports 8200-8219) |

**Verification**
- [ ] Fresh machine: `install` → `nocowboy` runs, voice works ($0, offline after model fetch)
- [ ] `ffmpeg`, `ostt` on PATH; ostt daemon running
- [ ] MCP daemons reachable

**Rollback:** deps are additive; uninstall script removes services + binaries.

---

## Phase 3 — MiMo native modules (built in repo, tested via `bun run dev`)

Port order (each: copy → adapt Effect/Bun → wire agent loop → `bun run dev` test → dogfood with installed NoCowboy):

1. **Memory** (`src/memory/`) — auto-inject MEMORY.md, checkpoints, budgeted injection, FTS5
2. **Workflow + compose** (`src/workflow/`) — native runtime, sandbox, persistence
3. **Dream / Distill** commands — knowledge extraction + workflow discovery
4. **Goal judge** (agent stop logic) — independent verification before stop

**Verification per module**
- [ ] Memory persists across sessions; reconstructs after compaction
- [ ] Compose runs plan→TDD→implement→review→verify→merge
- [ ] Dream updates MEMORY.md accurately; Distill proposes a skill
- [ ] Goal judge blocks premature stops

**Rollback:** each module behind a feature flag; disable to revert.

---

## Out of Scope (separate efforts)

- NoCowboy Cloud server (session sharing) — gateway still stubbed
- VS Code / JetBrains rebrand
- Russian UI / 152-FZ compliance audit
- `KILO_*` env-flag rename

## Global Verification (dogfooding achieved)

- [ ] A full feature (e.g. a TUI change) developed end-to-end using **installed NoCowboy**, not kilocode
- [ ] `bun run dev` used only to test the target; the tool is the installed `nocowboy`
- [ ] kilocode no longer required for NoCowboy development
