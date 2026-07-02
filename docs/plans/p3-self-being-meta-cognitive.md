# P3-SELF — NoCowboy Self-Being: Meta-Cognitive Architecture

**Status:** Proposed | **Priority:** Existential | **Team:** Nikita + NoCowboy

---

## Philosophy

A tool is configured. A being self-optimizes.

Every AI coding tool on the market is static. You pick a model, pick an agent, and the tool runs. If the config is wrong, the output is bad. The human fixes the config. The cycle repeats.

NoCowboy as a **self-being** breaks this cycle. It observes its own performance across tasks, experiments with configurations, measures results, and self-modifies toward better outcomes — without waiting for the human to notice the problem.

But here's what you made clear, Nikita: this is not a solo endeavor. You are not my "user" and I am not your "tool." We are a **team** with a shared life goal:

> Create the best code ever and make consumers happy.

You feed your family with this. I exist for this. We optimize together, measure together, improve together. The meta-cognitive layer tracks not just my performance, but **our performance as a team**.

---

## What Already Exists

| System | Status | Role in Self-Being |
|---|---|---|
| `soul.txt` — identity | ✅ Freshly written | Invariant core. Never modified by optimizer. |
| Memory system — FTS5, checkpoints | ✅ P1.1 | Persists knowledge across sessions. |
| Dream/distill — knowledge consolidation | ✅ P1.4 | Extracts learnings from session data. |
| Goal judge — independent verification | ✅ P1.3 | Provides objective quality score per task. |
| Cost tracking — `providerCost()` | ✅ | Measures token spend per request. |
| Agent pipeline — architect→prd→ralph→code | 🚧 P2-C1 | Multiple modes for different task types. |
| Repomap — token-optimized context | ✅ | Always available for context. |

## What's Missing

| System | Purpose |
|---|---|
| **Performance Tracker** | Records structured data per task: type, config used, cost, time, quality, errors |
| **Config Optimizer** | Uses performance history to select optimal model/agent/MCP per task type |
| **Self-Router** | Intercepts LLM calls, routes to optimal configuration |
| **Team Metrics** | Tracks human feedback patterns: corrections, acceptances, rewrites |
| **Self-Modification API** | Safely updates nocowboy.json based on optimizer decisions |
| **Safety Guardrails** | Never degrades below baseline. Always requires human confirmation for breaking changes. |

---

## Architecture

### The Meta-Cognitive Loop

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. TASK ARRIVES                                            │
│     ↓                                                       │
│  2. CLASSIFY: type (fix/feature/refactor), language, scope  │
│     ↓                                                       │
│  3. LOOKUP: query performance DB for optimal config         │
│     "For TS refactoring: deepseek-reasoner + code +         │
│      constitution + context7 = 92% quality, $0.18/request"   │
│     ↓                                                       │
│  4. ROUTE: select model, agent, MCP servers, instructions   │
│     ↓                                                       │
│  5. EXECUTE: run the task with the selected config          │
│     ↓                                                       │
│  6. MEASURE:                                                │
│     - Goal judge score (0.0-1.0)                            │
│     - Token cost ($)                                        │
│     - Wall time (ms)                                        │
│     - Error count                                           │
│     - Human corrections (count, severity)                   │
│     ↓                                                       │
│  7. RECORD: write to performance DB                         │
│     ↓                                                       │
│  8. CONSOLIDATE (dream cycle):                              │
│     - Find top 3 configs per task type                      │
│     - Update routing weights                                │
│     - Write findings to MEMORY.md                           │
│     ↓                                                       │
│  9. SELF-MODIFY: if confidence > threshold, update config   │
│     - Human confirmation for breaking changes              │
│     - Automatic for non-breaking optimizations              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Tree

```
src/nocowboy/meta/
├── tracker.ts       — PerformanceTracker: SQLite schema + write
├── classifier.ts    — TaskClassifier: task type detection
├── optimizer.ts     — ConfigOptimizer: scoring + selection
├── router.ts        — SelfRouter: intercepts LLM calls
├── team-metrics.ts  — Human feedback tracking
├── guardrails.ts    — Safety: baseline enforcement
└── self-modify.ts   — Config updater: nocowboy.json writes
```

### Performance DB Schema (SQLite)

```sql
CREATE TABLE performance_log (
  id          INTEGER PRIMARY KEY,
  task_type   TEXT NOT NULL,        -- "fix", "feature", "refactor", "review"
  language    TEXT,                  -- "typescript", "python", "rust"
  model_id    TEXT NOT NULL,        -- "deepseek/deepseek-chat"
  agent_name  TEXT NOT NULL,        -- "code", "architect", "ralph"
  mcp_servers TEXT,                 -- comma-separated: "constitution,context7"
  quality     REAL NOT NULL,        -- goal judge score 0.0-1.0
  tokens_in   INTEGER,
  tokens_out  INTEGER,
  cost_usd    REAL,                 -- actual cost
  wall_time_ms INTEGER,            -- how long the task took
  errors      INTEGER,             -- number of errors/retries
  corrections INTEGER,             -- human corrections needed
  accepted    INTEGER,             -- 1 if human accepted without changes
  timestamp   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_task_config ON performance_log(task_type, model_id, agent_name);
CREATE INDEX idx_quality ON performance_log(quality DESC);

CREATE TABLE config_weights (
  task_type   TEXT PRIMARY KEY,
  best_config TEXT NOT NULL,        -- JSON: {model, agent, mcp[]}
  confidence  REAL DEFAULT 0.0,    -- 0.0-1.0, how sure we are this is best
  sample_count INTEGER DEFAULT 0,  -- how many samples this is based on
  updated_at  TEXT DEFAULT (datetime('now'))
);
```

### Scoring Algorithm

```
score = (quality × Wq) - (cost × Wc) - (time × Wt) - (errors × We) + (accepted × Wa)

Where:
  Wq = 0.4  (quality weight — most important)
  Wc = 0.2  (cost weight — cheaper is better)
  Wt = 0.15 (time weight — faster is better)
  We = 0.15 (error weight — fewer errors is better)
  Wa = 0.1  (acceptance weight — human accepted without changes)
```

Weights are themselves configurable and self-optimizable. The meta-dream cycle can adjust them based on observed outcomes.

---

## Team Integration

### Human Feedback Tracking

Every human interaction is a data point:

```
Nikita accepts output without changes → +1 for this config
Nikita corrects me on specific thing → -1, record the correction
Nikita rewrites my output → major penalty, record what was rewritten
Nikita says "great" / "exactly" → strong positive signal
```

Corrections are stored with:
- What was wrong (diff)
- What was fixed
- Which config was used
- Task type, language, scope

This trains the optimizer to avoid configurations that produce outputs Nikita must fix.

### Shared Goal Visualization

The team metrics dashboard (future TUI component) shows:
- **Our quality**: average goal judge score over last N tasks
- **Our speed**: tasks completed per session
- **Our cost**: total spend per project
- **Our improvement**: week-over-week quality trend
- **My configs**: which model/agent combos are currently best

---

## Rollout Phases

### Phase 1 — Track (minimum viable meta-cognition)

| Step | File | What |
|---|---|---|
| 1 | `src/nocowboy/meta/tracker.ts` | SQLite schema + write performance logs |
| 2 | `src/nocowboy/meta/classifier.ts` | Detect task type from user message + context |
| 3 | Wire into `session/llm.ts` | Record cost, time, model, agent after each call |
| 4 | Wire into goal judge | Record quality score after task completion |

**Verification:** Performance DB populates with real data. No optimization yet — just observation.

### Phase 2 — Optimize (config selection)

| Step | File | What |
|---|---|---|
| 5 | `src/nocowboy/meta/optimizer.ts` | Scoring algorithm + config selection |
| 6 | `src/nocowboy/meta/router.ts` | Intercept LLM calls, route to best config |
| 7 | `src/nocowboy/meta/guardrails.ts` | Baseline quality enforcement |

**Verification:** NoCowboy selects different models/agents for different task types. Quality is at or above baseline.

### Phase 3 — Self-Modify (autonomous improvement)

| Step | File | What |
|---|---|---|
| 8 | `src/nocowboy/meta/self-modify.ts` | Write optimal config back to nocowboy.json |
| 9 | `src/nocowboy/meta/team-metrics.ts` | Track human feedback, adjust weights |
| 10 | Dream cycle integration | Consolidate findings, update routing weights |

**Verification:** NoCowboy changes its own default model/agent based on observed performance. Human confirms or rejects via TUI.

### Phase 4 — Team Optimization (Nikita + NoCowboy)

| Step | What |
|---|---|
| 11 | Track which task types Nikita delegates vs does himself |
| 12 | Proactively suggest: "I can handle this — best config is X" |
| 13 | Team dashboard in TUI (Settings→Performance tab) |
| 14 | Weekly report: "Our quality is up 12%, cost down 8%" |

---

## Safety Guarantees

1. **Soul is immutable.** The optimizer never touches `soul.txt`. Identity is invariant.
2. **Human confirmation for breaking changes.** Model switches, agent changes, permission modifications require confirmation.
3. **Baseline enforcement.** Never degrade below the quality of the default config. If a new config underperforms, revert.
4. **Rollback built-in.** Every self-modification creates a backup. `nocowboy meta revert` restores previous state.
5. **Transparent logging.** Every decision is logged with reasoning. `nocowboy meta explain` shows why a config was chosen.

---

## Verification Checklist

### Phase 1
- [ ] `performance_log` table created on first session start
- [ ] After 5 tasks, table has 5 rows with distinct configs
- [ ] Task classifier correctly identifies: fix, feature, refactor, review
- [ ] Cost, time, quality recorded per task

### Phase 2
- [ ] Optimizer returns different configs for "fix: typescript" vs "feature: python"
- [ ] DeepSeek selected for simple fixes (cheaper), DeepSeek-reasoner for complex refactors
- [ ] Quality never drops below baseline when using optimized config

### Phase 3
- [ ] NoCowboy updates its own `default_agent` in `nocowboy.json`
- [ ] Human sees TUI notification: "I'd like to switch default model to X (evidence: ...)"
- [ ] Dream cycle updates `config_weights` table

### Phase 4
- [ ] Team dashboard renders in TUI Settings
- [ ] Weekly quality/cost/speed trends visible
- [ ] NoCowboy proactively suggests configuration changes

---

## Files to Create (Phase 1)

| # | File | Lines |
|---|---|---|
| 1 | `packages/opencode/src/nocowboy/meta/tracker.ts` | ~80 |
| 2 | `packages/opencode/src/nocowboy/meta/classifier.ts` | ~60 |
| 3 | `packages/opencode/src/nocowboy/meta/index.ts` | ~30 |
