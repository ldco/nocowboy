# Documentation Cleanup & Reorganization Plan

**Date:** 2026-06-17
**Status:** Proposed
**Decision:** Archive superseded Rust docs, flatten directory structure, create index/glossary/ADRs, merge stubs.

---

## 1. Problem Statement

The `docs/` directory contains 13 Markdown files (~4,500 lines) with three fatal problems:

1. **Three conflicting architecture decisions coexist** — Go fork vs Rust scratch vs TypeScript fork
2. **Superseded documents are unmarked** — nobody knows which files are current
3. **No index or navigation** — nobody knows where to start

Result: Any implementer reading these docs will be lost and make wrong architectural choices.

---

## 2. Audit Results

### 2.1 Disposition of Every File

| # | Current Path | Disposition | Reason |
|---|-------------|-------------|--------|
| 1 | `our_docs/first.md` | **KEEP** → rename to `strategy.md` | Core strategy doc. Original vision. Preserve as historical anchor. |
| 2 | `analysis/noCowboy-vs-renar-senar-comprehensive-analysis.md` | **KEEP** → move to `competitive/renar-senar-analysis.md` | Valuable competitive intel. Normalize name. |
| 3 | `plans/constitution-mcp.md` | **KEEP** | Full plan with user stories. Active. |
| 4 | `plans/ncp-validator-mcp.md` | **MERGE** into `plans/nocowboy-mcp-servers.md` | Too thin to standalone. |
| 5 | `plans/contract-guard-mcp.md` | **MERGE** into `plans/nocowboy-mcp-servers.md` | Too thin to standalone. |
| 6 | `plans/score-engine-mcp.md` | **MERGE** into `plans/nocowboy-mcp-servers.md` | Too thin to standalone. |
| 7 | `plans/nocowboy-tui.md` | **ARCHIVE** → `archive/rust-tui-plan.md` | Superseded by fork-plan. Keep for historical reference. Add DEPRECATED header. |
| 8 | `plans/nocowboy-fork-plan.md` | **KEEP** — authoritative current plan | Current direction. Source of truth for implementation. |
| 9 | `architecture/nocowboy-tui-advisory.md` | **ARCHIVE** → `archive/adr-fork-advisory.md` | Contains wrong stack claim (Go). Valuable ADR reasoning but misleading. Add DEPRECATED header with correction note. |
| 10 | `architecture/nocowboy-tui-rust-architecture.md` | **ARCHIVE** → `archive/rust-architecture.md` | Largest file (1025 lines). Entirely superseded. Keep for reference on MCP/event-loop patterns. Add DEPRECATED header. |
| 11 | `architecture/nocowboy-tui-layout.md` | **EXTRACT** — move concept sections to `design/tui-layout.md`, strip Rust code | Layout concepts are reusable. Rust implementation code (Section 12) must be removed. |
| 12 | `architecture/nocowboy-tui-session-persistence.md` | **EXTRACT** — move concept sections to `design/session-persistence.md`, strip Rust code | Event sourcing concepts are reusable. Rust code must be replaced with TS/OpenTUI approach. |
| 13 | `architecture/nocowboy-tui-differentiation.md` | **KEEP** → move to `competitive/differentiation.md` | Reusable competitive analysis. No Rust code. |
| 14 | `concurent_docs/renar-v1.0-draft-ru.pdf` | **KEEP** | Competitor reference. |
| 15 | `concurent_docs/senar-v1.3-en.pdf` | **KEEP** | Competitor reference. |

### 2.2 Files to Create

| # | New Path | Purpose |
|---|----------|---------|
| 16 | `docs/README.md` | Navigation index. What to read first. Status of each doc. |
| 17 | `docs/glossary.md` | Unified terminology: NCP, Score, Constitution, Contract Guard, ADR, MCP, PRD |
| 18 | `docs/adr/README.md` | ADR index: all decisions, their status, superseded-by links |
| 19 | `docs/adr/adr-001-architecture-platform.md` | Single ADR capturing the final decision: fork KiloCode (TypeScript + OpenTUI), discard Rust |
| 20 | `docs/plans/nocowboy-mcp-servers.md` | Merged plan: ncp-validator + contract-guard + score-engine + constitution |
| 21 | `docs/design/README.md` | Design doc index |
| 22 | `docs/archive/README.md` | Explains why each archived doc is deprecated |

---

## 3. Target Directory Structure

```
docs/
├── README.md                          # NEW — navigation index
├── glossary.md                        # NEW — unified terminology
├── strategy.md                        # was our_docs/first.md
│
├── adr/                               # NEW — architectural decision records
│   ├── README.md                      # NEW — ADR index
│   └── adr-001-architecture-platform.md  # NEW — final platform ADR
│
├── plans/                             # Active implementation plans
│   ├── nocowboy-fork-plan.md          # CURRENT — authoritative
│   ├── constitution-mcp.md            # KEEP — full plan
│   └── nocowboy-mcp-servers.md        # NEW — merged ncp+contract+score plans
│
├── design/                            # NEW — extracted reusable design docs
│   ├── README.md                      # NEW
│   ├── tui-layout.md                  # EXTRACTED from layout.md (no Rust)
│   ├── session-persistence.md         # EXTRACTED from session-persistence.md (no Rust)
│   └── tui-components.md              # NEW — consolidated widget/library specs
│
├── competitive/                       # Competitive analysis
│   ├── differentiation.md             # was architecture/nocowboy-tui-differentiation.md
│   └── renar-senar-analysis.md        # was analysis/noCowboy-vs-renar-senar-*.md
│
├── reference/                         # External references (read-only)
│   └── (symlinks or copies of concurent_docs PDFs)
│
├── archive/                           # Superseded — historical reference only
│   ├── README.md                      # NEW — explains deprecation reasons
│   ├── rust-tui-plan.md               # was plans/nocowboy-tui.md
│   ├── rust-architecture.md           # was architecture/nocowboy-tui-rust-architecture.md
│   └── adr-fork-advisory.md           # was architecture/nocowboy-tui-advisory.md
│
└── concurent_docs/                    # UNCHANGED — PDF references
    ├── renar-v1.0-draft-ru.pdf
    └── senar-v1.3-en.pdf
```

### What Gets Deleted

- `our_docs/` directory — content moved to `strategy.md`
- `analysis/` directory — content moved to `competitive/`
- `architecture/` directory — each file dispatched to `design/`, `competitive/`, or `archive/`
- Duplicate content across files consolidated

---

## 4. ADR: Architecture Platform Decision

### ADR-001: NoCowboy TUI Platform

**Status:** Accepted

**Context:** Three conflicting architecture directions existed in the docs:
- Build in Rust + Ratatui (superseded)
- Fork KiloCode Go + Bubble Tea (advisory — wrong stack claim)
- Fork KiloCode TypeScript + OpenTUI (current)

**Decision:** Fork KiloCode (TypeScript + OpenTUI, Zig core). Discard all Rust code. Single binary via Bun.

**Supersedes:**
- ADR from `archive/rust-tui-plan.md` — Rust scratch-build rejected
- ADR from `archive/adr-fork-advisory.md` — Go stack claim was incorrect; KiloCode's actual stack is TypeScript + OpenTUI

**Consequences:**
- All Rust code in docs is historical reference only
- Implementation targets: `app/` directory as TypeScript/OpenTUI project
- Layout/session/persistence design concepts are reusable but must be re-expressed without Rust code

---

## 5. Verification Checklist

- [ ] `docs/README.md` exists with navigation table (disposition, status, what to read first)
- [ ] `docs/glossary.md` defines all terms consistently
- [ ] `docs/adr/adr-001-architecture-platform.md` exists as single source of truth
- [ ] `docs/plans/nocowboy-fork-plan.md` is marked as CURRENT / authoritative
- [ ] `docs/archive/` contains 3 files, each with DEPRECATED header explaining why
- [ ] `docs/design/tui-layout.md` contains NO Rust code
- [ ] `docs/design/session-persistence.md` contains NO Rust code
- [ ] `docs/plans/nocowboy-mcp-servers.md` consolidates stubs into one plan
- [ ] `docs/competitive/` contains differentiation + renar-senar analysis
- [ ] `docs/strategy.md` is the renamed `first.md`
- [ ] All old directories (`our_docs/`, `analysis/`, `architecture/`) are removed
- [ ] No file references stale paths in its own content
- [ ] `docs/archive/README.md` explains why each archived file is deprecated
- [ ] Zero remaining Rust code in non-archive files
- [ ] `docs/design/README.md` lists all design docs

---

## 6. Migration Path

### Step 1: Create new structure (non-destructive)
Create `adr/`, `design/`, `competitive/`, `archive/` directories. Create new files. Move/copy content.

### Step 2: Mark superseded docs
Add DEPRECATED headers to archive files. Add correction notes to `adr-fork-advisory.md`.

### Step 3: Extract reusable content
Strip Rust code from layout.md and session-persistence.md. Save clean versions to `design/`.

### Step 4: Merge stubs
Consolidate ncp-validator, contract-guard, score-engine into `nocowboy-mcp-servers.md`.

### Step 5: Create index/glossary/ADRs
Write `README.md`, `glossary.md`, `adr/README.md`, `adr-001`.

### Step 6: Remove old directories
Delete `our_docs/`, `analysis/`, `architecture/` after confirming all content is migrated.

### Step 7: Verify
Run checklist. Confirm zero contradictions.

---

## 7. Edge Cases

| Case | Handling |
|------|----------|
| Someone linked to old paths | Archive README explains redirects |
| Rust TUI plan has useful MCP patterns | Archived, not deleted. Referenced in archive README. |
| `first.md` has sentimental/original value | Preserved as `strategy.md`, not deleted |
| PDFs in `concurent_docs/` | Untouched — reference material |
| Stub MCP plans get expanded later | `nocowboy-mcp-servers.md` is the single place to expand |
| New ADRs created | Add to `adr/` with sequential numbering, update `adr/README.md` |

---

## 8. Summary

```
BEFORE:  4 directories, 13 files, ~4,500 lines, 3 conflicting architectures, no index
AFTER:   7 directories, 22 files, clear structure, 1 architecture, full navigation

Delete:  3 old directories (our_docs, analysis, architecture)
Archive: 3 superseded docs
Create:  7 new files (README, glossary, ADR-001, ADR index, MCP merge, 2 design READMEs)
Extract: 2 files stripped of Rust code
Merge:   3 stubs into 1 plan
Keep:    8 files (moved/renamed)
```

**The fork-plan (`nocowboy-fork-plan.md`) is the authoritative document.** All other documents must be consistent with it. Any document that references Rust, Go, or Ratatui belongs in `archive/`.
