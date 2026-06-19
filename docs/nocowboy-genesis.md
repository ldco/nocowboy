# NoCowboy: Building an AI Coding Agent for the Russian Market

**Date:** June 2026
**Status:** In active development
**Document purpose:** Honest technical and strategic assessment for due diligence

---

## 1. The Problem We Are Solving

A professional software developer in Russia in 2026 cannot reliably use any of the leading AI coding assistants. This is not a hypothetical — it is the daily reality for approximately 1.7 million developers (HH.ru / Habr industry estimates, 2025).

### 1.1 What Happened

Between 2022 and 2026, the AI coding tool market exploded globally. GitHub Copilot, Cursor, Claude Code, Windsurf, and dozens of others became standard equipment for professional developers. Russian developers watched this happen while their access to these tools degraded or disappeared entirely.

The causes are structural, not temporary:

| Barrier | Impact | Reversibility |
|---|---|---|
| **Payment processing** | Visa/Mastercard/PayPal suspended operations in Russia. Developers cannot pay for subscriptions to Anthropic, OpenAI, GitHub, Cursor, or any US/EU SaaS. | Unlikely to reverse while sanctions persist |
| **API geo-restrictions** | Anthropic, OpenAI, Google, and most US AI providers block or restrict API access from Russian IP ranges. VPN workarounds are unreliable and violate ToS. | Tied to sanctions and export control policy |
| **Cloud infrastructure** | AWS, GCP, Azure suspended new accounts and restricted existing ones. No reliable cloud compute for AI workloads. | No timeline for reversal |
| **Data localization (152-FZ)** | Federal Law 152-FZ requires personal data of Russian citizens to be stored on servers physically located in Russia. Cloud-based AI tools that process code, sessions, and user data through US/EU servers are non-compliant by default. | This is Russian law — it is not going away |
| **Export controls** | US BIS export controls restrict transfer of certain AI technologies to Russia. This creates legal risk for both providers and users. | Tightening, not loosening |

### 1.2 What This Means in Practice

A Russian developer at a mid-size company in Moscow or Saint Petersburg who wants to use an AI coding assistant today has these options:

1. **Use a VPN + foreign payment card (gray market):** Works sometimes. Violates provider ToS. Account can be terminated without notice. Company cannot officially expense it. Legal risk under both US export law and Russian data law.

2. **Use a Russian tool (GigaCode, YaGPT):** Available but significantly weaker. No agentic capabilities (can't edit files, run commands, manage git). Autocomplete only. No multi-model support. No terminal/CLI interface.

3. **Use an open-source tool (Continue.dev, Aider, OpenCode):** Works locally but requires self-hosting models or routing through accessible APIs. No product polish, no support ecosystem, limited IDE integration.

4. **Use nothing:** This is what most Russian developers are doing. They read about Claude Code on Habr and have no access.

None of these options provide what the global market now considers baseline: an AI agent that can read your codebase, edit files, run commands, manage git, and iterate autonomously toward a goal.

---

## 2. The Competitive Landscape — Honest Assessment

We are not claiming the market is empty. We are claiming the intersection of "works in Russia" and "actually good" is empty.

### 2.1 Western Tools (Inaccessible)

| Tool | Quality | Russia Access | Notes |
|---|---|---|---|
| **Claude Code** (Anthropic) | Best-in-class agent | ❌ Blocked | API geo-restricted. No Russian billing. Cloud-only for advanced features. |
| **Cursor** | Excellent IDE | ❌ Blocked | US cloud, US billing. No self-hosted option. |
| **GitHub Copilot** | Good autocomplete | ⚠️ Degraded | GitHub accounts work but Copilot billing requires non-Russian payment. Enterprise plans unavailable. |
| **Windsurf** (Codeium) | Good agent | ❌ Blocked | US cloud, US billing. |
| **Augment Code** | Enterprise agent | ❌ Blocked | US only, enterprise sales. |
| **Amazon Q Developer** | AWS-integrated | ❌ Blocked | AWS accounts restricted for Russia. |

These tools are objectively excellent. We cannot use them. That is the entire problem.

### 2.2 Chinese Tools (Partially Accessible)

| Tool | Quality | Russia Access | Notes |
|---|---|---|---|
| **Tongyi Lingma** (Alibaba) | Good for Chinese ecosystem | ⚠️ Limited | Chinese language documentation. Optimized for Chinese dev ecosystem. VS Code only. |
| **DevChat** (Merico) | Decent agent | ⚠️ Limited | Small community. Limited model support. |
| **MiMo-Code** (Xiaomi) | Innovative features | ⚠️ Source only | Open source but no hosted product. Research project, not a product. MIT license. |

Chinese tools are accessible but designed for the Chinese market. Documentation is in Chinese. Models are optimized for Chinese language code comments and variable names. The ecosystem (npm packages, frameworks, conventions) diverges from what Russian developers use (which is largely Western-aligned: React, Node.js, Python, Go).

**However:** Chinese AI models, particularly DeepSeek, are fully accessible from Russia and are competitive with Western models on coding benchmarks. DeepSeek V3/V4 ranks within the top 5 on most coding evaluations. This is the critical enabler for our approach.

### 2.3 Russian Tools (Weak)

| Tool | Quality | Russia Access | Notes |
|---|---|---|---|
| **GigaCode** (Sber) | Basic autocomplete | ✅ Full | GigaChat model. No agent capabilities. VS Code plugin only. No file editing, no commands, no git integration. |
| **YaGPT Code** (Yandex) | Basic autocomplete | ✅ Full | YandexGPT model. Same limitations as GigaCode. |
| **Codestral** (via local) | Good autocomplete | ✅ Self-hosted | Mistral model. Autocomplete only, not an agent. |

Russian tools are 2-3 generations behind Western equivalents. They provide autocomplete (suggesting the next line of code) but not agentic capabilities (reading a codebase, making multi-file changes, running tests, iterating). No Russian tool can do what Claude Code or Cursor do.

**To be fair:** Sber and Yandex are investing heavily in AI. GigaChat and YandexGPT improve with each release. But their coding tools are not their priority — general-purpose chat and enterprise automation are. A competitive agentic coding tool from a Russian company is at least 12-18 months away, based on current trajectories.

### 2.4 Open Source (Functional but Unproductive)

| Tool | Quality | Russia Access | Notes |
|---|---|---|---|
| **Aider** | Good CLI agent | ✅ Full | Python, CLI only. No IDE integration. No TUI. Single-model. Works well for individual use. |
| **Continue.dev** | Good IDE extension | ✅ Full | VS Code + JetBrains. Autocomplete + chat. Limited agent capabilities. |
| **OpenCode** | Excellent CLI | ✅ Full | TypeScript/Bun. Modern TUI. Effect framework. 500+ model routing. The upstream project that KiloCode forks. |
| **KiloCode** | Best open-source agent | ✅ Full (MIT) | Fork of OpenCode. VS Code + JetBrains + CLI + Cloud. 22.7k stars. Most feature-complete open-source alternative. |

Open-source tools work. The problem is that "works" and "is a product" are different things. Aider is a single developer's side project. Continue.dev is a VC-backed US company that could restrict access at any time. OpenCode is excellent but has no brand, no community, no support ecosystem in Russia.

**KiloCode is the exception.** It is MIT-licensed, has all the features of a modern AI coding agent, supports VS Code + JetBrains + CLI, routes 500+ models, and has a clean TypeScript/Bun/SolidJS architecture. It is the most viable base for building a Russian product.

---

## 3. Our Approach: Composite Fork

We are not simply cloning KiloCode and changing the logo. We are building a composite product that cherry-picks the best components from four sources, each chosen for a specific reason.

### 3.1 The Four Sources

```
┌─────────────────────────────────────────────────────────┐
│                     NoCowboy                            │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  KiloCode    │  │  MiMo-Code   │  │  Our Own     │  │
│  │  (BASE)      │  │  (DONOR)     │  │  Extensions  │  │
│  │              │  │              │  │              │  │
│  │  MIT license │  │  MIT license │  │  Proprietary │  │
│  │  22.7k stars │  │  Xiaomi R&D  │  │  12 months   │  │
│  │  23k commits │  │  ~3k commits │  │  of work     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Claude Code (REFERENCE ONLY — closed source)    │   │
│  │  We study its features. We implement equivalents.│   │
│  │  We never copy its code.                         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 3.2 What We Take From Each Source

#### KiloCode → The Foundation (80% of the codebase)

KiloCode is itself a fork of OpenCode (by Anomaly). It adds VS Code/JetBrains integration, cloud features, and a commercial layer on top of OpenCode's CLI.

We fork KiloCode because it has everything we cannot build from scratch in a reasonable timeframe:

| Component | Why We Need It | Effort to Build From Scratch |
|---|---|---|
| VS Code extension | Primary IDE for Russian devs. Full sidebar, chat, Agent Manager. | 6-12 months |
| JetBrains plugin | JetBrains IDEs have ~40% market share in Russia (IntelliJ, WebStorm, PyCharm). Native Kotlin plugin. | 6-12 months |
| CLI + TUI | Terminal interface with SolidJS/OpenTUI rendering. Mouse support, themes, split panes. | 3-6 months |
| 500+ model router | Routes to any AI provider. Critical for DeepSeek integration. | 2-3 months |
| Effect framework | Typed functional runtime for services, layers, dependency injection. Already deeply embedded. | Impractical to replace |
| Semantic code search | Voyage AI embeddings + LanceDB vector store. Understands code meaning, not just text. | 2-3 months |
| Agent loop | Multi-step autonomous execution with tool use, permission system, compaction. | 3-6 months |
| MCP protocol | Model Context Protocol for extending the agent with custom tools. | 1-2 months |

**What we explicitly DO NOT use from KiloCode:**
- Kilo Cloud (app.kilo.ai) — we will not depend on US-hosted cloud infrastructure
- Kilo Gateway — we replace with our own provider routing (DeepSeek-first)
- Kilo branding, telemetry, analytics — fully replaced

#### MiMo-Code → Six Modules (5% of the codebase)

MiMo-Code is a research project by Xiaomi's AI lab. It is not a product — there is no hosted service, no marketplace listing, no user community. But its source code contains six innovations that neither KiloCode nor Claude Code have:

| Module | What It Does | Why It Matters |
|---|---|---|
| **Memory system** | Auto-injects project knowledge at session start. Checkpoints when context fills up. Reconstructs context after compaction. SQLite FTS5 for full-text search across memories. | Without this, the agent forgets everything when the context window fills up. KiloCode's compaction simply truncates old messages — losing all learned knowledge. MiMo's approach preserves discoveries across sessions. |
| **Workflow runtime** | Native multi-step execution engine with sandbox isolation, persistence, and compose mode (plan→TDD→implement→review→verify→merge). | Our current orchestration is external (MCP server spawning blind CLI processes). MiMo's runtime runs inside the agent loop with full context access. |
| **Dream command** | Scans recent session traces, extracts knowledge (build commands, architecture patterns, debugging insights, user preferences), writes to MEMORY.md, removes contradictions, deduplicates. | Neither Claude Code nor KiloCode has anything like this. The agent literally learns from its past work. |
| **Distill command** | Identifies repeated manual workflows across sessions (e.g., "user always runs lint→test→commit") and packages them as reusable skills/commands/subagents. | Self-improving agent. No competitor has this. |
| **Goal judge** | When the agent claims a task is complete, an independent judge model evaluates the evidence. If the judge rejects, the agent continues working. | Prevents the "optimistic stop" problem — agents often claim success prematurely during autonomous work. |
| **Task tree** | Hierarchical task IDs (T1→T1.1→T1.2→T1.1.1) with quality gates, progress tracking, and SQLite persistence. | Our existing task system (Tausik MCP) is richer overall, but MiMo's hierarchical ID format integrates cleanly with the memory/checkpoint system. |

**Honest assessment of MiMo modules:**
- The memory system and dream/distill commands are genuinely novel. We have not seen equivalents anywhere.
- The workflow runtime is good but needs significant adaptation — MiMo uses the Effect framework differently than KiloCode.
- The task tree is the weakest contribution — our existing Tausik MCP has 70+ tools vs MiMo's 7 files. We only need the ID format.
- **Risk:** MiMo is a research project with limited documentation. Porting requires deep reading of source code with no guides.

#### Claude Code → Feature Reference (0% code, 100% inspiration)

Claude Code is Anthropic's closed-source CLI. We cannot use its code (proprietary). We study its public documentation and user reports to identify features worth implementing:

| Feature | Claude Code Status | Our Plan | Risk |
|---|---|---|---|
| Ultraplan (plan in cloud → execute locally) | Shipped | Implement equivalent using local planning | Medium — requires multi-model orchestration |
| Ultrareview (deep multi-agent review) | Shipped | Implement equivalent | Low — we already have a code-reviewer agent |
| Channels (push CI/alerts into sessions) | Shipped | Already have MCP version, make native | Low |
| Routines (scheduled recurring tasks) | Shipped | Already have kilo-schedule wrapper | Low |
| Remote control (phone/browser → terminal) | Shipped | Future phase | High — requires infrastructure |

#### Our Own Extensions → The Russian Layer (15% of the codebase)

Over 12 months of daily use, we built an ecosystem of extensions on top of KiloCode. These are NOT part of any open-source project — they represent our proprietary value:

| Category | Count | Purpose |
|---|---|---|
| **MCP servers** | 11 servers, 150+ tools | Tausik (project management), Constitution (code quality AST rules), Score Engine (quality scoring), Contract Guard (API contract validation), Ralph (PRD execution), PuppetMaster (framework ops), plus Context7, SQLite, Puppeteer, Git |
| **Instructions** | 13 files + 3 rule sets | Engineering rules, no-shortcuts behavioral policy, cybersecurity (OWASP), Russian law (152-FZ), repo mapping protocol, structured output format |
| **Custom agents** | 6 agents | Architect (ADRs, C4 modeling), PRD interviewer, Ralph (iterative executor), Code reviewer (8-dimension audit), Explorer (read-only), Planner |
| **Skills** | 8 skills | Frontend design, web design guidelines, memory manager, skill evaluator, Ralph TUI adapters |
| **Commands** | 16 slash commands | /plan, /act, /commit, /diff, /repomap, /lintcheck, /checkpoint, /restore, /goal, /init, /bg, /schedule, and more |

**What makes this layer defensible:**
- The Russian law instructions (152-FZ compliance, Roskomnadzor templates, consent forms) are specific to the Russian market. No Western tool will ever include these.
- The behavioral engineering rules ("no-shortcuts.md" — 300 lines of anti-hack, anti-workaround, root-cause-only policies) are the result of months of iteration. They measurably improve code quality.
- Tausik (70+ tools for project management with memory graph, dead-end tracking, decision records) has no equivalent in any AI coding tool.
- Constitution (AST-based code quality rules that run pre-commit) is unique — no other AI tool has real-time code quality enforcement.

---

## 4. The Actual Cost of Forking — What Nobody Tells You

Forking an 80,000+ line TypeScript project is not "clone and rename." Here is what it actually involves, based on our experience over the past weeks.

### 4.1 Namespace Rename Hell

KiloCode uses the namespace `kilo` / `Kilo` / `KILO` / `kilocode` / `Kilocode` / `@kilocode/` across every layer of the stack. Our rename to `nocowboy` / `NoCowboy` / `NOCOWBOY` touched:

- 88 source files in a single commit
- Import paths: `@/kilocode/` → `@/nocowboy/` (40+ test files)
- Module paths: `kilo-sessions/` → `nocowboy-sessions/` (10+ files)
- SDK exports: `createKiloClient` → `createNocowboyClient`
- Flag constants: `Flag.NOCOWBOY_*` → `Flag.KILO_*` (the Flag object kept KILO_ prefix from upstream)
- Provider IDs: `ProviderID.nocowboy` → `ProviderID.kilo`
- Type names: `KiloToolRegistry`, `KilocodeProfile`, `KiloTerminalTitle` — each renamed differently
- Theme colors: `#f9f76f` (KiloCode yellow) → `#ff6800` (NoCowboy orange) across 2 theme JSON files

**Result:** 727 TypeScript type errors after the rename. Every one had to be fixed individually — not with find-and-replace, because each error had a different root cause (missing export, changed interface, moved module, Effect type parameter mismatch).

### 4.2 Types vs Runtime — The Invisible Trap

TypeScript type checking passes. The app crashes. This happened to us.

An automated type-fixing agent changed `FileWatcher.init` from:
```typescript
init: Effect.fn("FileWatcher.init")(function* () { ... })
```
to:
```typescript
init: () => Effect.fn("FileWatcher.init")(function* () { ... }) as unknown as Effect.Effect<void>
```

TypeScript was happy — zero errors. At runtime, `s.init()` now returned a function instead of an Effect object. The entire server crashed with "s.init().pipe is not a function" — affecting ALL instance routes. Four of six startup requests failed.

**Lesson:** The Effect framework in this codebase uses `Effect.fn()` which returns a callable function, not an Effect object. TypeScript's type system cannot distinguish between "a function that returns an Effect" and "an Effect.fn wrapper that IS a function and returns an Effect when called." Type casts (`as never`, `as unknown as X`) that satisfy the compiler can silently break runtime behavior.

This class of bug is invisible to CI, invisible to type checking, and only surfaces when you actually run the application. Every `as never` cast in the codebase is a potential runtime bomb.

### 4.3 Upstream Sync — The Ongoing Tax

KiloCode is actively developed (~100 commits/week). We need upstream improvements (bug fixes, new features, security patches). But every upstream merge is a conflict resolution exercise:

- We use `zdiff3` merge style to get the common ancestor in conflict markers
- Every file we modified creates a potential merge conflict
- Our rename (`kilocode` → `nocowboy`) conflicts with every upstream change that touches the same files
- We mark all our changes with `// kilocode_change` comments so they can be identified during merges
- We try to keep changes in separate `src/nocowboy/` directories to minimize conflicts with upstream `src/` files

**Reality:** Every upstream sync takes 2-8 hours of manual conflict resolution. This is a permanent ongoing cost for the lifetime of the product, as long as we track upstream.

### 4.4 Legal and Compliance

| Requirement | Status | Effort |
|---|---|---|
| MIT license compliance | ✅ Done | Attribution in README and LICENSE |
| 152-FZ data localization | 🔄 In progress | All session data, user data, and code analysis results must be stored on Russian servers. No cloud fallback to US/EU. |
| Roskomnadzor notification | ⬜ Not started | Required before processing personal data of Russian users. Notification form includes operator details, processing purposes, data categories, protection measures. |
| Personal data processing policy | ⬜ Not started | Must be published on product website. Templates exist in our russian-law.md instructions. |
| FSTEC certification (if government customers) | ⬜ Not applicable yet | Required only for government sector sales. Expensive and slow (6-12 months). |

### 4.5 Infrastructure Without Cloud

Western AI coding tools rely on AWS/GCP/Azure for compute, storage, and API routing. We cannot.

Our infrastructure plan:

| Component | Western Approach | Our Approach |
|---|---|---|
| AI model API | Anthropic/OpenAI API | DeepSeek API (accessible from Russia) + LiteLLM proxy for multi-provider routing |
| Model hosting | Cloud GPU instances | Self-hosted on Russian VPS (Selectel, VK Cloud, Yandex Cloud) for on-premise customers |
| Code embeddings | Voyage AI cloud API | Self-hosted embedding model or accessible API |
| Vector storage | Cloud-hosted Pinecone/Weaviate | LanceDB (local, embedded) — already in KiloCode |
| User data | Cloud database | SQLite (local) — already in KiloCode |
| Distribution | npm registry + auto-update | npm + manual distribution for air-gapped environments |

---

## 5. What NoCowboy Actually Is (Today)

As of June 2026, NoCowboy is a working fork of KiloCode with the following state:

### 5.1 What Works

- ✅ CLI launches and connects to DeepSeek models
- ✅ Full TUI with NoCowboy branding (orange #ff6800, custom logo, custom TopBar/BottomBar)
- ✅ Session management, message handling, tool use
- ✅ File editing, bash commands, git operations
- ✅ 0 type errors across the entire monorepo
- ✅ Server starts and handles all API routes
- ✅ All 11 MCP servers connectable
- ✅ Custom agents (architect, PRD, ralph, code-reviewer, explorer, planner)
- ✅ 16 slash commands
- ✅ NoCowboy theme (grayscale + orange accent)

### 5.2 What Does Not Work Yet

- ❌ MiMo memory system not ported yet
- ❌ MiMo workflow/compose mode not ported
- ❌ Dream/distill commands not ported
- ❌ Goal judge not ported
- ❌ VS Code extension not rebranded (still says "Kilo Code")
- ❌ JetBrains plugin not rebranded
- ❌ No Russian language interface
- ❌ No production deployment infrastructure
- ❌ No 152-FZ compliance audit completed
- ❌ No user documentation in Russian

### 5.3 What We Intentionally Removed

- Kilo Cloud (app.kilo.ai) dependencies
- Kilo Gateway (replaced with direct DeepSeek API routing)
- KiloCode branding, telemetry, PostHog analytics
- Kilo-specific update/upgrade mechanisms

---

## 6. Honest Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| **DeepSeek API becomes inaccessible from Russia** | HIGH | Self-hosted model deployment as fallback. Monitor Chinese policy changes. |
| **KiloCode changes license from MIT** | MEDIUM | Fork is frozen at MIT-licensed commit. Can continue independently. |
| **Upstream KiloCode diverges too far to merge** | MEDIUM | Accept as eventual outcome. Plan for independent development within 6-12 months. |
| **Russian competitor launches first** | MEDIUM | Speed of execution. Our 12-month head start on extensions/instructions is a moat. |
| **DeepSeek model quality plateaus** | MEDIUM | Multi-model architecture supports any provider. Can switch to Russian models (GigaChat, YandexGPT) when they improve. |
| **152-FZ enforcement action** | LOW (if compliant) | Follow the law. Store data in Russia. File Roskomnadzor notification. Publish privacy policy. |
| **Single developer / bus factor** | HIGH | Document everything. This document exists for this reason. |
| **Effect framework complexity** | MEDIUM | Effect v4 is deeply embedded in KiloCode. Replacing it is impractical. Must learn and maintain it. |
| **MiMo-Code modules stale** | LOW | MiMo is a Xiaomi research project, not a maintained product. We port the code, not the dependency. |

---

## 7. Why This Is Worth It

The honest case, without marketing language:

1. **The market exists.** 1.7 million developers in Russia have no access to a modern AI coding agent. The ones using VPN workarounds are violating ToS and risking account termination. Companies cannot officially adopt tools they cannot legally pay for.

2. **The technology exists.** KiloCode + MiMo-Code + DeepSeek together provide every component needed for a competitive product. We are not inventing new AI research — we are assembling existing open-source components into a product that works in a market where nothing else does.

3. **The timing is right.** Russian developers are acutely aware of what they are missing. Every Habr article about Claude Code generates hundreds of comments from people who cannot use it. The demand is proven and unsatisfied.

4. **The moat is real.** Even if Sber or Yandex builds a competing tool, they will build it from scratch. Our 12 months of custom agents, instructions, MCP servers, and behavioral rules cannot be replicated quickly. And our 152-FZ compliance templates, Russian law instructions, and Russian market customizations are work that no Western fork will ever do.

5. **The model landscape favors us.** DeepSeek V4 is competitive with Claude Sonnet and GPT-4o on coding tasks. It is accessible from Russia. It is cheap. The gap between "best Western model" and "best accessible model" has narrowed from enormous (2023) to manageable (2026).

**What could go wrong:** DeepSeek access is cut off. A Russian BigTech (Sber, Yandex, VK) ships a competitive tool first. The single-developer risk materializes. The Effect framework becomes unmaintainable. The upstream fork diverges beyond reconciliation.

**What we are betting on:** None of those things happen in the next 12 months. And 12 months is enough to establish the product, build a user base, and become self-sustaining.

---

## 8. Technical Reference

For the complete technical fork playbook (what to copy from where, file paths, integration points, execution steps), see:

**`~/.config/kilo/docs/plans/kilocode-fork-playbook.md`** — 493 lines covering three source repos, 6 MiMo modules, 11 MCP servers, 13 instruction files, 16 commands, 6 agents, 8 skills, and step-by-step execution order.

---

*This document was written to be read by someone who understands software engineering and can distinguish between a working prototype and a shipping product. NoCowboy is the former. The path to the latter is documented here and in the technical playbook. The question is whether the market opportunity justifies the investment required to walk that path.*
