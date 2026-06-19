# COMPREHENSIVE ANALYSIS: NO COWBOY vs RENAR/SENAR (2026)

**Date:** 2026-06-01
**Analyst:** Fabrika 22 Strategic Analysis
**Classification:** Internal — Competitive Intelligence

---

## 1. EXECUTIVE SUMMARY

This analysis compares three frameworks operating in the AI-native software development standards space:

| Framework | Organization | Version | License | Focus |
|-----------|-------------|---------|---------|-------|
| **No Cowboy** | Fabrika 22 (Nikita Turuntsev) | v1.0 (strategy) | Proprietary | AI code quality & contract enforcement |
| **RENAR** | renar.tech (A. Yumashev, V. Soglaev) | v1.0-draft | CC BY-SA 4.0 | Requirements engineering for AI-native dev |
| **SENAR** | senar.tech (A. Yumashev, V. Soglaev) | v1.3 | CC BY-SA 4.0 | AI-native development process methodology |

**Key Finding:** RENAR and SENAR form a unified, mature competitive ecosystem with 15 normative chapters (RENAR) + 13 standard sections (SENAR), published under open license, with empirical validation from 552 real tasks. No Cowboy is a strategic vision document with strong philosophical positioning but **no shipped tooling, no empirical data, and no published standard text**. The window for market entry is narrowing — RENAR/SENAR have a 2-3 month head start and are building community momentum via open licensing.

---

## 2. FRAMEWORK OVERVIEWS

### 2.1 No Cowboy — "The Guardian" (Fabrika 22)

**Core Philosophy:** "No Magic, Just Logic." Engineering discipline in the AI era — speed without sacrificing quality.

**Three-Level Architecture:**

| Level | Name | Stage | Mechanism |
|-------|------|-------|-----------|
| L1 | No Cowboy Protocol (NCP) | Before Code | YAML/JSON Schema — unified spec format for business rules, data types, responsibility boundaries |
| L2 | AI Governance Layer | During Code | AST analysis + LLM semantic check — "Code Constitution" prohibiting anti-patterns |
| L3 | Live Contract Guard | After Code | Dynamic verification — backend API change → frontend build fails with clear error |

**Planned Technical Stack:**
- CLI utility (Python/Node.js)
- AST parsers for JS/TS + Python
- LLM integration (Claude/OpenAI API)
- `.nocowboyrc` config files
- `.ncp` protocol files
- Nuxt-based dashboard with "No Cowboy Score" (0–100%)
- Pre-commit hook + CI/CD + IDE plugin (future)

**Ecosystem Partner:** Puppet Master — AI generation/structuring tool producing the code that No Cowboy validates.

### 2.2 RENAR — Requirements Engineering & Normative Adaptive Regulation (renar.tech)

**Core Philosophy:** Requirements as Source of Truth. AI agents produce code; requirements govern its correctness.

**Five Core Rules (MVR):**

| # | Rule | Rationale |
|---|------|-----------|
| 1 | ADAPT before SR | Bidirectional TZ interpretation before engineering begins — eliminates silent misinterpretation |
| 2 | Code is NOT source of truth | When code and requirement diverge → requirement wins. No reverse-engineering SR from code |
| 3 | Versioning on substrate | All artifacts (TZ, ADAPT, SR, TC) on versioned storage with immutable history, atomic change, stable IDs, cross-links, version pinning, audit queries |
| 4 | TC pos/neg pairing | Every SR gets ≥1 positive + ≥1 negative test case. 80% of production incidents are negative scenarios |
| 5 | Spot-check (manual verification) | Per-sprint: human manually runs 5 random passing TCs to catch AI-generated fake tests |

**Key Artifacts:**
- **TZ** (Technical Assignment) — immutable client contract
- **ADAPT** — bidirectional adaptation document (forward: engineering interpretation; backward: questions/gaps/contradictions)
- **SR** (System Requirement) — engineering requirement, verified by TC
- **TC** (Test Case) — pos/neg pair, verifies behavior not implementation
- **SPEC-*** (9 types) — ARCH, API, DATA, INT, PROC, UI, AI, SEC, OPS

**Scale:** 15 normative chapters covering V1–V6 substrate capabilities, MVR-1 through MVR-7, Quality Gates (QG-0..QG-4), 5 conformance levels (RENAR-1..5), ISO/IEC/IEEE 29148:2018 alignment.

### 2.3 SENAR — Supervised Engineering & Normative AI Regulation (senar.tech)

**Core Philosophy:** Human judgment over keystrokes. AI produces code; humans direct, verify, and govern.

**Six Core Rules (MVS):**

| # | Rule |
|---|------|
| 1 | Every AI implementation has a Task with goal + acceptance criteria before work begins |
| 2 | AI output verified by Supervisor against AC — never rubber-stamped |
| 3 | No Task can start without goal, AC, and requirement link (QG-0 Context Gate) |
| 4 | No Task can close unless CI passes, tests pass, types are clean (QG-1 Implementation Gate) |
| 5 | Throughput and Lead Time measured — you know tasks/session and cycle time |
| 6 | Dead Ends documented — failed approaches recorded so no one repeats them |

**Role Architecture:**

| Role | Responsibility |
|------|---------------|
| Supervisor | Directs AI, verifies output, enforces gates |
| Context Architect | Designs requirements as structured AI input, manages BR→SR→TR hierarchy |
| Knowledge Engineer | Captures/structures knowledge entries, dead ends, reusable patterns |
| Flow Manager | Cross-team coordination, dependency tracking, flow efficiency |
| Verification Engineer | Test Model design, adversarial reviews, gate enforcement |

**Pair Configurations:** Core (1 pair) → Foundation (1–3 pairs) → Team (3+ pairs) → Enterprise

**Empirical Basis:** 552 tasks, $989 AI costs, 38 sessions, 6 microservices — real case study data.

---

## 3. ARCHITECTURAL COMPARISON

### 3.1 Layer-by-Layer Mapping

```
NO COWBOY                    RENAR                          SENAR
══════════                    ═════                          ═════
L1: NCP (Before Code)   ←→   ADAPT / Forward-Backward  ←→  QG-0 Context Gate
     Spec format              Bidirectional TZ interp        Task goal + AC
     Type contracts           7 backward categories          Requirement link

L2: AI Governance      ←→   Rules 2+3+4                ←→  QG-2 Implementation
     (During Code)           SoT inversion                  CI/CD enforcement
     AST + LLM analysis      TC pos/neg pairing             Code standards
     Code Constitution       Versioning on substrate        Scope boundaries

L3: Live Contract      ←→   Rules 4+5                 ←→   QG-3/QG-4
     Guard (After Code)      Spot-check verification        Verification/Acc. gates
     Integration checks      QG-2 Verification Gate         Adversarial review
     API contract val        Conformance manifest           Testing pipeline
```

### 3.2 Divergence Points

| Dimension | No Cowboy | RENAR | SENAR |
|-----------|-----------|-------|-------|
| **Starting point** | Code quality & contracts | Requirements engineering | Development process |
| **Primary artifact** | `.ncp` protocol file | ADAPT (bidirectional doc) | Task (goal + AC) |
| **AI role** | Executor (under human architectural control) | Requirements assistant | Primary code producer |
| **Human role** | Architect/approver | Requirements engineer + reviewer | Supervisor (directs AI) |
| **Verification focus** | Contract compliance | Requirement→TC traceability | Task AC verification |
| **Tooling approach** | CLI + AST + LLM API | Substrate-agnostic (any VCS) | Tool-agnostic, tool-dependent |

---

## 4. CAPABILITY COMPARISON MATRIX

### 4.1 Requirements Engineering

| Capability | No Cowboy | RENAR | SENAR |
|-----------|-----------|-------|-------|
| Formal spec/contract format | NCP (YAML/JSON Schema) — planned | ADAPT (structured markdown) — operational | Task goal + AC — operational |
| Requirement hierarchy | Not defined | TZ→ADAPT→SR→TR (4 levels) | BR→SR→TR (3 levels) |
| Requirement→code traceability | Contract guard (L3) | Full chain with IDs + version pinning | Full chain: BR→SR→TR→TM→Code |
| Bidirectional interpretation | Not defined | Forward + Backward w/ 7 categories | Not applicable (process focus) |
| Client sign-off mechanism | Not defined | Dual signature (Client + Architect) | Not defined |
| Closed-list governance | Code Constitution rules | 7 backward categories, 9 SPEC types, 5 QG, 5 MVR | Configurations, maturity levels |
| ISO/IEC 29148 alignment | Not claimed | Full traceability matrix provided | Informative reference only |

### 4.2 AI Code Governance

| Capability | No Cowboy | RENAR | SENAR |
|-----------|-----------|-------|-------|
| AI code quality filter | AST + LLM semantic analysis (L2) | Spot-check verification (Rule 5) | Adversarial review (L3 maturity) |
| Prohibition of `any`/unsafe types | Planned rule | Implicit via TC verification | Code Standards template |
| Cyclomatic complexity check | Planned (< 10) | Not defined | File/function size limits in template |
| SQL injection prevention | Planned rule | Not defined | Code Standards template |
| Hallucination detection | Not defined | Not defined | Defined (3.28) + Adversarial Detection Rate |
| Latent defect detection | Not defined | Not defined | Defined (3.38) + ADR metric |
| Scope creep prevention | Not defined | Not defined | Defined (3.27) + scope boundaries |

### 4.3 Quality Gates

| Gate | No Cowboy | RENAR | SENAR |
|------|-----------|-------|-------|
| QG-0 (Context/Planning) | NCP validation (L1) | QG-ADAPT-approve (6 checks) | Goal + AC + requirement link |
| QG-1 (Implementation) | AI Governance (L2) | Not separately named | CI + tests + types + lint + security |
| QG-2 (Verification) | Live Contract Guard (L3) | 6 checks inc. pos/neg TC + spot-check | Automated pipeline; blocking merge on fail |
| QG-3 (Architecture/Review) | Not defined | Architecture Gate (optional) | Branch protection + review approval |
| QG-4 (Acceptance) | Not defined | Acceptance Gate (optional) | Staging deploy + acceptance + rollback |

### 4.4 Process & Operations

| Capability | No Cowboy | RENAR | SENAR |
|-----------|-----------|-------|-------|
| Session management | Not defined | Not defined | Full lifecycle: start, end, checkpoints, handoffs |
| Knowledge base | Not defined | Not defined | 6 entry types, freshness tracking, AI integration |
| Metrics | No Cowboy Score (0–100%) | Pedagogical density scores | FPSR, DER, throughput, lead time, cycle time, cost/task |
| Cost tracking | Not defined | Not defined | Token/API cost per session/task, budget alerts |
| Multi-agent orchestration | Not defined | Not defined | Agent dispatch, workspace isolation, profiles |
| Federation (multi-project) | Not defined | Cross-project coordination (Ch.10) | Federation with dependency tracking, cross-project alerts |
| Maturity model | Not defined | 5 conformance levels (RENAR-1..5) | 5 maturity levels (ML1..ML5) |
| Compliance | Not defined | GDPR, AI Act, FZ-152 readiness | GDPR, AI Act — D.1-D.3 compliance section |

### 4.5 Technical Capabilities

| Capability | No Cowboy | RENAR | SENAR |
|-----------|-----------|-------|-------|
| CLI tool | Planned (Python/Node.js) | Not required (substrate-agnostic) | Not prescribed (tooling requirements doc) |
| AST analysis | Planned | Not defined | Not defined |
| LLM semantic analysis | Planned | Not defined | Not defined |
| CI/CD integration | Planned (pre-commit, CI) | Native Git/MR integration | Full pipeline automation requirements |
| IDE plugin | Planned (future) | Not defined | Not defined |
| Dashboard | Nuxt-based (Score 0–100%) | Not defined | Throughput reports, cost dashboards |
| Machine-readable index | `.ncp` + `.nocowboyrc` | `normative-index.yaml` | Not defined |
| Config-as-code | `.nocowboyrc` | Frontmatter in artifacts | Agent profiles, operational scripts |
| Pipeline-as-code | Not defined | Not defined | SHALL requirement (Team+) |

---

## 5. QUALITY GATES — DEEP COMPARISON

### 5.1 Gate Completeness Score

| Framework | QG-0 | QG-1 | QG-2 | QG-3 | QG-4 | Total |
|-----------|------|------|------|------|------|-------|
| No Cowboy | ~70% | ~50% | ~60% | 0% | 0% | **36%** |
| RENAR | 100% | 0% | 100% | 100%* | 100%* | **80%*** |
| SENAR | 100% | 100% | 100% | 100% | 100% | **100%** |

*RENAR QG-3/4 are declared optional in Core, normative in Standard

### 5.2 Gate Automation

| Gate | No Cowboy | RENAR | SENAR |
|------|-----------|-------|-------|
| QG-0 automate | NCP schema validation | Frontmatter + completeness checks | Task field validation auto |
| QG-2 automate | AST + LLM analysis | CI/CD pipeline (standard) | Full CI pipeline: tests, type check, lint, security |
| Gate bypass tracking | Not defined | Not defined | Yes — documented justification required |

---

## 6. AI GOVERNANCE DEEP DIVE

### 6.1 Prevention Mechanisms

```
THREAT                    NO COWBOY           RENAR              SENAR
──────                    ──────────           ─────              ─────
AI hallucination          (not addressed)      (not addressed)    Adversarial review (L3)
Silent requirement drift  L3 Live Contract     Rule 2 SoT         Scope boundaries (3.27)
Fake/passing tests        (not addressed)      Rule 5 spot-check  QG-2 verification
Unsafe code patterns      L2 Code Constitution TC pos/neg pair    Code Standards template
Scope creep               (not addressed)      (not addressed)    Scope boundaries (3.27)
Knowledge loss            (not addressed)      (not addressed)    Dead Ends + KB
AI-generated `assert true` (not addressed)     Rule 5 spot-check  (not addressed)
Missing negative tests    (not addressed)      Rule 4 pos/neg     (not addressed)
```

### 6.2 AI-Human Interaction Model

| Framework | Human Role | AI Role | Control Mechanism |
|-----------|-----------|---------|-------------------|
| No Cowboy | Architect — approves architecture | Executor — implements under control | AI Governance Layer (L2) rejects "cowboy code" |
| RENAR | RE Engineer — interprets TZ, writes SR/TC | Assistant — generates drafts | ADAPT dual signature + spot-check verification |
| SENAR | Supervisor — directs, verifies, decides | Primary code producer | QG gates + adversarial review + session discipline |

---

## 7. MATURITY & SCALING COMPARISON

### 7.1 Team Size Scaling

| Scale | No Cowboy | RENAR | SENAR |
|-------|-----------|-------|-------|
| Solo / 1 pair | NCP + CLI | RENAR Core (5 rules) | SENAR Core (MVS, 6 rules) |
| 2–5 people | CLI + CI/CD | RENAR Core | Foundation config (1–3 pairs) |
| 5–15 people | Not defined | Full 15 chapters | Team config (3+ pairs) |
| 15–50 people | Not defined | Full + federation | Team+ config |
| 50+ / Enterprise | Not defined | Full + compliance | Enterprise + value streams |

### 7.2 Maturity Levels

| Level | No Cowboy | RENAR | SENAR |
|-------|-----------|-------|-------|
| L1 (Initial) | NCP adoption | RENAR-1: mandatory clauses only | ML1: Core rules, informal |
| L2 (Managed) | CLI + Code Constitution | RENAR-2: canonical frontmatter | ML2: Core config, basic gates |
| L3 (Defined) | Full CI/CD integration | RENAR-3: full SPEC axis | ML3: Foundation, structured gates |
| L4 (Measured) | Score dashboard | RENAR-4: AI provenance mandatory | ML4: Team config, metrics-driven |
| L5 (Optimizing) | Not defined | RENAR-5: multi-model, continuous eval | ML5: Enterprise, value streams |

---

## 8. COMMERCIAL & ECOSYSTEM ANALYSIS

### 8.1 Business Model Comparison

| Aspect | No Cowboy | RENAR/SENAR |
|--------|-----------|-------------|
| **Core offering** | Proprietary standard + tooling | Open standard (CC BY-SA 4.0) |
| **Monetization** | Audit-as-service, consulting | Not yet defined (open source) |
| **Ecosystem partner** | Puppet Master (generation) | None (self-contained) |
| **Target market** | Fabrika 22 clients | Any AI-native dev team |
| **Barrier to entry** | Proprietary code + consulting | Open — anyone can adopt |
| **Community building** | Article/publication planned | Open license, public docs, renar.tech/senar.tech |
| **Empirical validation** | None | 552 tasks, $989 costs, 38 sessions |

### 8.2 Competitive Advantages

**No Cowboy Advantages:**
- Strong philosophical positioning: "No Magic" brand is memorable and marketable
- Direct code-level enforcement (AST + LLM) — more granular than process-level gates
- Puppet Master integration creates a full "build + verify" pipeline
- "No Cowboy Score" (0–100%) is an intuitive, marketable quality metric
- Proprietary model allows premium pricing for audits/services
- Real-time IDE plugin vision (future)

**RENAR/SENAR Advantages:**
- **2–3 month head start** — v1.3 (SENAR) is published and operational
- Open license (CC BY-SA 4.0) enables viral adoption and community contributions
- **15 normative chapters** covering full requirements-to-code lifecycle
- **Empirical validation** — real data from 552 tasks, not theoretical
- ISO/IEC/IEEE 29148:2018 alignment gives regulatory credibility
- Dual standard coverage (RENAR for requirements + SENAR for process)
- Established web presence (renar.tech, senar.tech)
- Full compliance section (GDPR, AI Act, FZ-152)
- Maturity model, configurations, and scaling guidance already defined
- Knowledge Base, session management, multi-agent orchestration fully specified

---

## 9. GAPS & OPPORTUNITIES FOR NO COWBOY

### 9.1 Critical Gaps (Red)

| Gap | Severity | Competitor Has |
|-----|----------|---------------|
| No shipped CLI/tooling — strategy doc only | **Critical** | SENAR: tooling requirements doc operational |
| No empirical data — zero real-world validation | **Critical** | SENAR: 552 tasks, 38 sessions, $989 costs |
| No published standard text — only strategy vision | **Critical** | Both: full normative document sets published |
| No requirements engineering methodology | **High** | RENAR: full ADAPT+SR+TC lifecycle |
| No process/ceremony definition | **High** | SENAR: sessions, increments, handoffs, KB |
| No multi-project/team scaling model | **High** | Both: configurations, federation, maturity levels |
| No compliance/regulatory framework | **High** | SENAR: GDPR, AI Act, DPA, audit trail |
| No knowledge management system | **High** | SENAR: 6 entry types, freshness, AI integration |

### 9.2 No Cowboy Unique Opportunities (Green)

| Opportunity | Rationale |
|------------|-----------|
| **Code-level AST analysis** — RENAR/SENAR are process frameworks, not code analyzers. No Cowboy's L2 (AST + LLM) is a genuinely unique differentiator | Neither competitor does programmatic code quality enforcement |
| **Live Contract Guard (L3)** — automatic build-time API contract validation is not offered by either competitor | Unique technical capability |
| **Puppet Master integration** — combined "generate + verify" pipeline creates a complete walled garden offering | Competitors lack a paired generation tool |
| **"No Cowboy Score" (0–100%)** — simple, marketable KPI that CTOs can understand instantly | Competitor metrics (FPSR, DER) are more technical, less marketing-friendly |
| **Type-level contract enforcement** — NCP's YAML/JSON Schema approach can enforce types at spec level before any code exists | RENAR's ADAPT is prose-based; SENAR uses natural language AC |
| **IDE real-time plugin** — "cowboy code" highlighted as you type is a compelling developer experience differentiator | Neither competitor mentions IDE integration |

### 9.3 Time-to-Market Urgency

```
COMPETITOR TIMELINE (RENAR/SENAR)
─────────────────────────────────
Mar 2026: SENAR v1.0 published
Mar 2026: SENAR v1.3 published (current)
May 2026: RENAR v1.0-draft published
May 2026: Style Guide approved, Phase 5 mass pass unblocked
Now:      Community building, open adoption

NO COWBOY TIMELINE (PLANNED)
─────────────────────────────
Week 1:   Code Constitution (10-15 rules)
Week 2:   CLI prototype `no-cowboy check`
Week 3:   CI/CD integration (1 project)
Week 4:   NCP format spec + Puppet Master integration
After:    Publication article

ESTIMATED: No Cowboy has 4–6 weeks to achieve parity with RENAR/SENAR's
current state — and they are continuing to iterate (Phase 5 mass pass ongoing).
```

---

## 10. STRATEGIC SWOT ANALYSIS

### 10.1 No Cowboy

| STRENGTHS | WEAKNESSES |
|-----------|------------|
| Unique code-level enforcement (AST + LLM) | **No shipped product** — 100% vaporware risk |
| Live Contract Guard — no competitor has this | Zero empirical validation |
| Strong branding ("No Cowboy", "No Magic") | No published standard text |
| Puppet Master synergy creates full ecosystem | No requirements methodology |
| Type-level NCP contracts before code | No process definition (sessions, increments, KB) |
| Marketable Score metric (0–100%) | No scaling/maturity model |
| Real-time IDE plugin vision | 2–3 months behind competitor |
| Proprietary consulting/audit revenue model | Single-author dependency (Nikita Turuntsev) |

| OPPORTUNITIES | THREATS |
|--------------|---------|
| Code analysis is unoccupied niche in competitor landscape | Competitor has network effects via open license |
| "Build + Verify" pipeline as premium bundle | Competitor is already building community |
| Enterprise contracts require both speed + reliability | Open license undercuts proprietary pricing |
| Regulatory compliance angle (GDPR, AI Act) | If competitor releases tooling, No Cowboy loses uniqueness |
| CTO-level dashboard as decision-making tool | Fast follower risk — market may standardize on RENAR/SENAR |
| IDE plugin market (VS Code, JetBrains) | Puppet Master dependency — if it fails, No Cowboy loses ecosystem |
| Open-source core + paid enterprise model | Fabrika 22 is smaller than competitor momentum |

### 10.2 RENAR/SENAR (Competitor)

| STRENGTHS | WEAKNESSES |
|-----------|------------|
| Published, operational standard (v1.3) | No code-level enforcement tooling |
| Open license (CC BY-SA 4.0) — viral adoption | No IDE integration |
| Empirical validation (552 tasks) | Dual-author dependency |
| Dual coverage (requirements + process) | No automated contract validation |
| ISO 29148 alignment — regulatory credibility | Prose-based (ADAPT is markdown, not machine-verifiable) |
| Full compliance section (GDPR, AI Act) | No type-level spec contracts |
| Maturity model + scaling configurations | No visual dashboard/score |
| Public web presence | No paired generation tool |

| OPPORTUNITIES | THREATS |
|--------------|---------|
| First-mover advantage in AI-native standards | No Cowboy's code analysis could obsolete their process-only approach |
| Community contributions via open license | Open license means anyone can fork/compete |
| Regulatory mandates creating demand for compliance | AI model improvements may reduce need for process guardrails |
| Enterprise consulting on top of free standard | Free standard may not convert to paying customers |
| Tool vendor partnerships | Competing standards may fragment the market |

---

## 11. GAP ANALYSIS: WHAT NO COWBOY MUST BUILD TO COMPETE

### Phase 1: Survivability (Weeks 1–4)
- [ ] Ship CLI prototype `no-cowboy check` with at least 5 rules
- [ ] Publish formal standard document (not just strategy)
- [ ] Implement AST analysis for TypeScript + Python
- [ ] Build pre-commit hook integration
- [ ] Write `.ncp` format specification

### Phase 2: Parity (Weeks 5–8)
- [ ] Define requirements engineering methodology (NCP → code traceability chain)
- [ ] Implement Quality Gates (QG-0 through QG-4 equivalents)
- [ ] Build Score dashboard (Nuxt) with real project data
- [ ] Add compliance section (GDPR, AI Act references)
- [ ] Define scaling model (solo → team → enterprise)

### Phase 3: Differentiation (Weeks 9–12)
- [ ] Ship Live Contract Guard (L3) — API contract validation
- [ ] Ship IDE plugin (VS Code, JetBrains)
- [ ] Collect empirical data from Fabrika 22 projects
- [ ] Publish Puppet Master + No Cowboy integration showcase
- [ ] Begin community building (open source core?)

---

## 12. RECOMMENDATIONS

1. **Ship immediately.** The strategy document is solid, but RENAR/SENAR have operational standards and empirical data. Every week without a working CLI is a week of competitor community growth.

2. **Lean into the unique differentiator.** RENAR/SENAR define processes; No Cowboy enforces code quality programmatically (AST + LLM). This is No Cowboy's strongest position. Make the CLI the star of week 2 delivery.

3. **Open-source the core.** RENAR/SENAR's CC BY-SA 4.0 license is driving adoption. A proprietary-only standard risks being locked out. Consider: open-source CLI + `.nocowboyrc` with paid enterprise features (dashboard, IDE plugin, audit reports).

4. **Do not compete on requirements engineering.** RENAR's ADAPT+SR+TC chain is mature (15 chapters, 7 backward categories, ISO 29148 alignment). Compete on what happens AFTER requirements exist — code quality enforcement.

5. **Build the ecosystem story.** "Puppet Master generates. No Cowboy verifies." This narrative is stronger than either competitor's standalone offering. Ship an integration demo.

6. **Collect data immediately.** SENAR's empirical basis (552 tasks, 38 sessions) is compelling to enterprise buyers. Start recording metrics from Fabrika 22 projects using the prototype CLI.

7. **Target the CTO dashboard market.** No Cowboy Score (0–100%) is more intuitive than FPSR/DER/ADR. A visual dashboard showing real-time project health is a sales tool that RENAR/SENAR lack.

8. **Prioritize Live Contract Guard.** API contract validation at build time is a genuinely novel capability. Neither competitor offers it. This could become No Cowboy's signature feature.

---

## 13. APPENDIX: TERMINOLOGY CROSS-REFERENCE

| No Cowboy | RENAR | SENAR |
|-----------|-------|-------|
| `.ncp` (No Cowboy Protocol) | ADAPT / TZ | Task + acceptance criteria |
| Code Constitution | Rules (MVR 1-5) | Code Standards template |
| No Cowboy Score | Pedagogical density score | FPSR, DER, Throughput |
| Puppet Master | (no equivalent) | (no equivalent) |
| Live Contract Guard | QG-2 Verification Gate | QG-2 Implementation Gate |
| AI Governance Layer | Spot-check + Rules 2/4/5 | QG-2 + Adversarial Review |
| `.nocowboyrc` | Frontmatter in artifacts | Agent profiles + config files |
| — | ADAPT bi-directional interpretation | — |
| — | BR/SR/TR requirement hierarchy | BR/SR/TR hierarchy |
| — | V1–V6 substrate capabilities | — |
| — | MVR-1..MVR-7 | ML1..ML5 maturity |
| — | SPEC-* (9 types) | — |
| — | Knowledge Graph | Knowledge Base (6 types) |
| — | — | Session management |
| — | — | Dead End documentation |
| — | — | Federation (multi-project) |

---

*Analysis compiled from: No Cowboy Strategy Document v1.0, RENAR Standard v1.0-draft (31,768 lines), SENAR Standard v1.3 (10,685 lines). All competitive documents accessed 2026-06-01.*
