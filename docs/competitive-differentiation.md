# NoCowboy TUI — Competitive Differentiation & Feature Map

**Date:** 2026-06-16
**Status:** Proposed
**Purpose:** Define the features that make NoCowboy TUI a product, not just another terminal agent.

---

## 1. Competitive Landscape (June 2026)

| Product | Type | Language | TUI? | Agent? | MCP? | Price | Weakness |
|---------|------|----------|------|--------|------|-------|----------|
| **OpenCode** | OSS tool | Go | ✅ | ✅ Multi | ✅ | Free | No process/scoring/product |
| **KiloCode** | OSS fork | Go | ✅ | ✅ Multi | ✅ | Free | No quality enforcement |
| **Claude Code** | Proprietary | Node | ❌ CLI | ❌ Single | ❌ | $20/mo | No TUI, no multi-agent |
| **Aider** | OSS tool | Python | ❌ CLI | ❌ | ❌ | Free | No TUI, no orchestration |
| **Cursor** | Proprietary | TS | ❌ GUI | ✅ | ❌ | $20/mo | IDE-bound, not terminal |
| **Cline** | OSS ext | TS | ❌ GUI | ✅ | ✅ | Free | VS Code only |
| **Gemini CLI** | Proprietary | ? | ❌ CLI | ❌ | ❌ | Free | Google-locked, no TUI |
| **NoCowboy TUI** | **Product** | **Rust** | **✅** | **✅ Multi** | **✅** | **TBD** | **Not built yet** |

### The Gap NoCowboy Fills

Every existing tool is either:
- **A tool** (OpenCode, Aider, Claude Code) — useful but not a product. No quality guarantees, no process, no support, no enterprise features.
- **An IDE extension** (Cursor, Cline) — tied to a specific editor, not terminal-native.
- **Process-only** (RENAR/SENAR) — defines what to do, but provides zero tooling to do it.

**NoCowboy TUI is the first product that combines: terminal-native agentic development + automated quality enforcement + commercial offering.**

---

## 2. Feature Matrix: NoCowboy TUI vs Everyone

### 2.1 Core Agent Features

| Feature | NoCowboy | OpenCode | KiloCode | Claude Code | Aider |
|---------|----------|----------|----------|-------------|-------|
| Terminal TUI | ✅ Rust | ✅ Go | ✅ Go | ❌ | ❌ |
| Multi-agent switching | ✅ One keystroke | ✅ | ✅ | ❌ | ❌ |
| MCP protocol | ✅ 7+ servers | ✅ | ✅ | ❌ | ❌ |
| LLM streaming | ✅ SSE native | ✅ | ✅ | ✅ | ✅ |
| Multi-provider LLM | ✅ DeepSeek, Claude, OpenAI | ✅ | ✅ | Claude only | ✅ |
| LSP integration | ✅ tower-lsp | ✅ | ✅ | ❌ | ❌ |
| Semantic search | ✅ LanceDB native | ✅ | ✅ | ❌ | ❌ |
| File editing | ✅ Direct | ✅ | ✅ | ✅ | ✅ |
| Git integration | ✅ MCP native | ✅ | ✅ | ❌ | ✅ |
| Session resume | ✅ Persisted | ✅ | ✅ | ✅ | ✅ |

**Verdict:** NoCowboy matches or exceeds all core agent features. No competitive disadvantage.

### 2.2 NoCowboy-Unique Features (Competitive Moats)

| Feature | NoCowboy | Any Competitor | Moat Depth |
|---------|----------|----------------|------------|
| **NoCowboy Score (0-100%)** | ✅ Real-time gauge | ❌ None | 🔒 Deep — no competitor has any quality metric |
| **Code Constitution (AST enforcement)** | ✅ 10+ rules, pre-commit | ❌ None | 🔒 Deep — programmatic, not advisory |
| **NCP Protocol (spec-first dev)** | ✅ YAML/JSON Schema | ❌ None | 🔒 Deep — generates stubs, validates contracts |
| **Live Contract Guard (L3)** | ✅ API validation at build | ❌ None | 🔒 Deep — unique technical capability |
| **PRD-driven autonomous execution** | ✅ ralph agent loop | ⚠️ KiloCode has it | 🟡 Medium — inherited, not unique |
| **Plugin system (Wasmtime)** | ✅ Widgets, agents, tools | ❌ None | 🔒 Deep — no terminal agent has plugins |
| **152-FZ compliance built-in** | ✅ Instructions loaded | ❌ None | 🟡 Medium — Russia-market only |
| **Puppet Master integration** | ✅ Build + Verify pipeline | ❌ None | 🟡 Medium — ecosystem lock-in |
| **Rust single binary** | ✅ ~15MB, no deps | ⚠️ OpenCode is Go | 🟢 Shallow — performance difference |
| **Product (not tool)** | ✅ Support, SLA, audit | ❌ All tools | 🔒 Deep — enterprise buying criteria |

### 2.3 Process & Quality Features

| Feature | NoCowboy | RENAR/SENAR | OpenCode |
|---------|----------|-------------|----------|
| Requirements engineering | ✅ NCP format | ✅ ADAPT (prose) | ❌ |
| Code quality enforcement | ✅ AST + LLM (automatic) | ❌ Spot-check (manual) | ❌ |
| API contract validation | ✅ Live (automatic) | ❌ | ❌ |
| Quality metric | ✅ Score 0-100% | ✅ FPSR, DER | ❌ |
| Knowledge management | ✅ tausik memory graph | ✅ Knowledge Base | ❌ |
| Session discipline | ✅ Checkpoints, resume | ✅ Session mgmt | ✅ |
| Multi-project | ✅ Workspace | ✅ Federation | ✅ |
| Compliance | ✅ 152-FZ, GDPR | ✅ GDPR, AI Act | ❌ |

**Key insight:** RENAR/SENAR define process on paper. NoCowboy *executes process automatically*. That's the fundamental differentiator.

---

## 3. The NoCowboy Score — Centerpiece Feature

### What It Measures

```
NoCowboy Score = weighted average of 5 dimensions:

1. NCP Compliance (25%)      — Are all modules covered by .ncp specs?
2. Constitution (30%)         — Zero AST violations? All rules passing?
3. Contract Integrity (20%)   — Are API contracts consistent frontend↔backend?
4. Test Coverage (15%)        — Critical paths tested? Negative cases covered?
5. Security Posture (10%)     — No hardcoded secrets? CSRF enforced? Headers set?

Each dimension: 0.0–1.0 → weighted → 0–100%
```

### How It's Displayed

```
┌──────────────────────────────────────┐
│         NOCOWBOY SCORE               │
│                                      │
│              ┌──────────────┐        │
│              │      87      │        │
│              │   /100       │        │
│              └──────────────┘        │
│                                      │
│   NCP Compliance     ████████░░  82% │
│   Constitution       █████████░  91% │
│   Contract Integrity ████████░░  85% │
│   Test Coverage      ██████░░░░  68% │
│   Security Posture   ██████████  97% │
│                                      │
│   Trend: ↑ +3 this session           │
└──────────────────────────────────────┘
```

### Why It Matters Commercially

- **CTOs buy it:** "Show me one number that tells me if my AI-generated code is safe." NoCowboy Score is that number.
- **Engineers game it:** Score gamification drives better behavior. "I got the score from 82 to 87 today."
- **Audits use it:** "Your project scores 43. Here's the report showing exactly why."
- **CI/CD gates on it:** "Score must be ≥ 70 to merge. Score must be ≥ 85 to deploy to production."

---

## 4. Code Constitution — Live Enforcement

### How It Works in the TUI

```
User types: "Add a login function that queries the database directly"

AI generates:
  async function login(email: string, password: string): Promise<any> {
    const user = await db.raw(`SELECT * FROM users WHERE email = '${email}'`)
    ...
  }

NoCowboy TUI intercepts before commit:
  ┌─────────────────────────────────────────────────────────────┐
  │ ⚠️  Constitution Violations — 2 issues                       │
  │                                                              │
  │  [C-001] no-any-type          src/auth.ts:12                 │
  │           Return type `any` — use `User \| null`             │
  │                                                              │
  │  [C-002] no-raw-sql           src/auth.ts:13                 │
  │           Raw SQL query — use Drizzle ORM                    │
  │           Also: SQL injection risk (unsanitized input)        │
  │                                                              │
  │  [Fix with AI]   [Fix manually]   [Override (requires reason)]│
  └─────────────────────────────────────────────────────────────┘
```

### Pre-Commit Hook

```bash
$ git commit -m "feat: add login"
→ NoCowboy: checking 3 files against Constitution...
→ 2 violations found. Commit blocked.
→ Run `nocowboy fix` to auto-fix with AI assistance.
→ Score would drop from 87 → 79. Proceed anyway? [y/N]
```

### Constitution Rules (Initial Set)

| Rule | Severity | Auto-fixable | Description |
|------|----------|-------------|-------------|
| `no-any-type` | Error | ❌ | Prohibit TypeScript `any` |
| `no-raw-sql` | Error | ❌ | Prohibit raw SQL strings |
| `max-complexity-10` | Warning | ❌ | Cyclomatic complexity < 10 |
| `require-null-check` | Error | ❌ | Nullable values must be checked |
| `no-hardcoded-secrets` | Error | ❌ | No API keys, tokens, passwords |
| `max-function-lines-50` | Warning | ❌ | Function body ≤ 50 lines |
| `require-error-handling` | Warning | ❌ | Async calls must have .catch() |
| `no-console-log` | Warning | ✅ | No console.log in production code |
| `require-csrf-protection` | Error | ❌ | POST/PUT/DELETE must have CSRF |
| `no-eval` | Error | ❌ | No eval() or Function() constructor |

---

## 5. NCP Protocol — Spec-First Development

### The Workflow

```
1. ncp agent designs spec:
   .ncp/user-auth.yaml  →  defines entities, endpoints, contracts

2. Puppet Master reads .ncp → generates typed stubs:
   server/src/routes/auth.ts  (typed API routes)
   client/src/api/auth.ts     (typed API client)

3. Developer implements business logic between stubs

4. NoCowboy validates implementation against .ncp:
   $ nocowboy validate
   → Endpoint POST /api/auth/login — response matches NCP contract ✓
   → Endpoint GET /api/users/:id — response missing field 'role' ✗

5. Contract Guard watches for breaking changes:
   $ nocowboy guard watch
   → Watching 12 API contracts...
   → BREAKING: PUT /api/users/:id — 'email' changed from required to optional
   → Frontend build would fail. Fix or update NCP.
```

### NCP File Format

```yaml
# .ncp/user-auth.yaml
protocol: "ncp/v1"
module: "user-auth"
version: "1.0.0"

entities:
  User:
    fields:
      id: { type: uuid, required: true }
      email: { type: email, required: true, unique: true }
      name: { type: string, max: 255 }
      role: { type: enum, values: [admin, user, editor] }
    constraints:
      - email must be unique across all users

endpoints:
  POST /api/auth/login:
    request:
      body:
        email: { type: email, required: true }
        password: { type: string, min: 8, required: true }
    response:
      200:
        body:
          token: { type: jwt }
          user: { $ref: User }
      401:
        body:
          error: { type: string }

  GET /api/users/:id:
    request:
      params:
        id: { type: uuid }
      auth: required
    response:
      200:
        body:
          user: { $ref: User }
      404:
        body:
          error: { type: string }

constitution_rules:
  - no-raw-sql
  - require-csrf-protection
  - max-complexity-10
```

---

## 6. Contract Guard (L3) — The Moat

This is the feature no competitor has. It answers: "If the backend changes an API response, does the frontend break?"

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                     Contract Guard Pipeline                   │
│                                                               │
│  1. Extract contracts:                                        │
│     Backend:  OpenAPI spec from FastAPI/Nitro/Nuxt routes     │
│     Frontend: TypeScript types from API client code           │
│                                                               │
│  2. Diff contracts:                                           │
│     Compare backend response types vs frontend expected types │
│                                                               │
│  3. Classify changes:                                         │
│     🔴 Breaking: removed field, changed type, new required    │
│     🟡 Warning:   added optional field, deprecated field      │
│     🟢 Compatible: added endpoint, added optional field       │
│                                                               │
│  4. Alert in TUI / CI:                                        │
│     Breaking change → build fails, TUI shows diff             │
│     Warning → TUI notification, build continues               │
└─────────────────────────────────────────────────────────────┘
```

### TUI Display

```
┌─────────────────────────────────────────────────────────────┐
│ 🔴  Contract Breach Detected                                  │
│                                                               │
│  PUT /api/users/:id                                           │
│                                                               │
│  Backend changed:           Frontend expects:                 │
│  ┌────────────────────┐    ┌────────────────────┐            │
│  │ email?: string     │    │ email: string      │            │
│  │ role?: string      │    │ role: "admin"\|"user"│           │
│  └────────────────────┘    └────────────────────┘            │
│                                                               │
│  Impact: src/pages/profile.vue:42 — `user.email.length`       │
│          would throw "Cannot read property of undefined"      │
│                                                               │
│  [Update NCP]   [Fix Frontend]   [Revert Backend]             │
└─────────────────────────────────────────────────────────────┘
```

### CI/CD Integration

```yaml
# .github/workflows/nocowboy.yml
- name: NoCowboy Contract Guard
  run: nocowboy guard check
  # Fails build on breaking changes
  # Passes with warnings on compatible changes
```

---

## 7. Plugin System — Extensibility as Product

### Plugin Types

```
nocowboy-plugin-*.wasm  →  loaded by Wasmtime host

Plugin manifest (nocowboy-plugin.toml):
  [plugin]
  name = "jira-integration"
  version = "1.0.0"
  type = "tool"              # widget | agent | tool | theme | hook

  [plugin.capabilities]
  render = true              # Can write to TUI panels
  tools = true               # Can register new MCP-like tools
  network = false            # Can make HTTP requests (dangerous)
  filesystem = ["read"]      # read | write | none
```

### Plugin Marketplace (Future)

```
$ nocowboy plugin search "git"
  git-flow       v2.1.0  ★ 234  Git flow visualization widget
  git-stats      v1.0.0  ★ 89   Contribution stats in status bar
  git-blame-tui  v0.9.0  ★ 56   Interactive git blame viewer

$ nocowboy plugin install git-flow
  → Downloading from registry.nocowboy.sh...
  → Verifying signature...
  → Installed to ~/.local/share/nocowboy/plugins/
```

---

## 8. The Product Story — Why Companies Buy

### For CTOs

> "Your team uses AI coding tools. How do you know the code is safe? NoCowboy gives you a single number — the NoCowboy Score — that tells you exactly how much of your AI-generated code passes quality gates. When the score drops, you investigate. When it rises, you ship with confidence."

### For Engineering Managers

> "NoCowboy TUI replaces five tools: your terminal agent, your code review checklist, your API contract validator, your security scanner, and your quality dashboard. One binary, one workflow, one source of truth for code quality."

### For Developers

> "You type what you want. NoCowboy's agents build it — but they don't commit cowboy code. The Constitution catches unsafe patterns before they reach production. You ship faster because you ship safer."

### For Auditors

> "NoCowboy produces an audit trail: every AI-generated change, every Constitution violation, every contract breach. Compliance reports for 152-FZ, GDPR, and SOC 2 are one command away."

---

## 9. Feature Delivery Phases

### Phase 1 — Core TUI (MVP)
```
✅ Multi-panel TUI (agent sidebar + chat + context + status)
✅ LLM streaming (DeepSeek, Claude, OpenAI)
✅ MCP integration (all 7 servers)
✅ Agent switching (architect, prd, ralph, code-reviewer)
✅ Session save/resume
✅ Basic markdown rendering
✅ Keyboard shortcut system
✅ Configuration (nocowboy.toml)
```

### Phase 2 — NoCowboy Identity
```
✅ NoCowboy Score widget (0-100%, 5 dimensions)
✅ Score computation engine
✅ Score trend tracking
✅ Constitution rule engine (first 5 rules)
✅ Pre-commit hook integration
✅ Custom color theme & branding
```

### Phase 3 — NCP + Contract Guard
```
✅ NCP file format parser
✅ NCP validation against implementation
✅ Contract guard — API diff engine
✅ Contract guard — breaking change detection
✅ TUI display for contract breaches
✅ CI/CD templates (GitHub Actions, GitLab CI)
```

### Phase 4 — Plugins + Product
```
✅ Wasmtime plugin host
✅ Plugin manifest format
✅ Widget plugin type (custom TUI panels)
✅ Tool plugin type (new MCP-like tools)
✅ Plugin registry (static, later dynamic)
✅ Nuxt Score dashboard (web UI for CTOs)
✅ Audit report generation
✅ Commercial licensing
```

---

## 10. Summary: The 30-Second Pitch

```
"Every AI coding tool makes your team faster.

NoCowboy TUI makes your team safer.

It's a terminal agent like Claude Code or OpenCode —
but with a Code Constitution that blocks unsafe AI-generated code
before it reaches production.

One number. The NoCowboy Score. Tells your CTO
whether your AI-generated code is production-ready.

Built in Rust. Ships as a single binary. Works with any LLM.

That's NoCowboy TUI. AI under control."
```
