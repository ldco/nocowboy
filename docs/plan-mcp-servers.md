# Plan: NoCowboy MCP Servers (NCP + Contract Guard + Score)

**Date:** 2026-06-17
**Status:** Proposed
**Consolidates:** Former ncp-validator-mcp.md, contract-guard-mcp.md, score-engine-mcp.md

---

## 1. NCP Validator (Before Code)

**Goal:** Validate NCP (NoCowboy Protocol) `.ncp`/`.yaml` spec files. Generate typed stubs for Puppet Master integration.

### MCP Tools

| Tool | Input | Output |
|------|-------|--------|
| `ncp_validate` | `{ path: string }` | `{ valid: boolean, errors: NcpError[], entities: EntityDef[] }` |
| `ncp_list` | `{ glob?: string }` | `{ files: string[], summary: string }` |
| `ncp_diff` | `{ old: string, new: string }` | `{ breaking: Change[], compatible: Change[] }` |

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
      email: { type: email, required: true }
      name: { type: string }
endpoints:
  POST /api/auth/login:
    request:
      body: { email: email, password: string }
    response:
      200: { token: jwt }
```

### Validation Rules
- Schema conformance (required fields, valid types)
- Entity definitions match endpoint usage
- No duplicate endpoint paths
- No self-referencing entity cycles

### Location
`~/.config/kilo/mcp-servers/ncp-validator/`

---

## 2. Contract Guard (After Code)

**Goal:** Detect breaking API contract changes between backend and frontend.

### MCP Tools

| Tool | Input | Output |
|------|-------|--------|
| `contract_check` | `{ backend_file: string, frontend_file?: string }` | `{ changes: ContractChange[], pass: boolean }` |
| `contract_status` | `{}` | Last check result, watch status |

### Change Classification

| Severity | Color | Examples |
|----------|-------|----------|
| 🔴 Breaking | Red | Removed field, changed type, new required field |
| 🟡 Warning | Yellow | Added optional field, deprecated field |
| 🟢 Compatible | Green | Added endpoint, added optional field |

### Detection Approach
- Parse backend: OpenAPI/swagger.json or API route definitions
- Parse frontend: TypeScript type definitions, API client code
- Compare endpoint signatures: request shape, response shape, status codes

### Location
`~/.config/kilo/mcp-servers/contract-guard/`

---

## 3. Score Engine (Visualization)

**Goal:** Compute NoCowboy Score (0-100%) across 5 dimensions. Track history. Generate badges.

### MCP Tools

| Tool | Input | Output |
|------|-------|--------|
| `score_compute` | `{ project?: string }` | `{ score: number, dimensions: ScoredDim[], pass: boolean }` |
| `score_history` | `{ limit?: number }` | `{ scores: HistoryPoint[], trend: string }` |
| `score_badge` | `{ score: number }` | ASCII badge string |
| `score_breakdown` | `{ dimensions: object }` | Per-dimension detail |

### 5 Dimensions

| Dimension | Weight | Data source |
|-----------|--------|-------------|
| NCP Compliance | 25% | .ncp file coverage check |
| Constitution | 30% | Constitution rule violations per file |
| Contract Integrity | 20% | Contract Guard check results |
| Test Coverage | 15% | Test file existence for source files |
| Security Posture | 10% | Secrets pattern scan, security header check |

### Scoring Formula

```
Score = SUM(dimension.score * dimension.weight) / SUM(weights) * 100
dimension.score = max(0, 1 - violations / max(violations, 1))
```

### Location
`~/.config/kilo/mcp-servers/score-engine/`

---

## 4. All Servers — Transport & Ports

| Server | Transport | Port/Command | Status |
|--------|-----------|-------------|--------|
| context7 | HTTP | :8200 | ✅ Operational |
| sqlite | HTTP | :8201 | ✅ Operational |
| puppeteer | HTTP | :8202 | ✅ Operational |
| puppetmaster | HTTP | :8203 | ✅ Operational |
| tausik | HTTP | :8204 | ✅ Operational |
| git | HTTP | :8205 | ✅ Operational |
| ralph | stdio | `npx tsx ...` | ✅ Operational |
| constitution | stdio | `node dist/index.js` | ✅ Operational |
| ncp-validator | stdio | `node dist/index.js` | 🔨 Planned |
| contract-guard | stdio | `node dist/index.js` | 🔨 Planned |
| score-engine | stdio | `node dist/index.js` | 🔨 Planned |
