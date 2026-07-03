# P2-C4: MCP Server Framework Analysis (Deferred)

**Analyzed:** 2026-07-03  
**Status:** 📋 DEFERRED — jurist agent and yolo mode prioritized

## Current First-Party MCP Servers

| Server | Type | Port | Status | Notes |
|--------|------|------|--------|-------|
| constitution | local | 9200 | ✅ running | Rules engine. Keep. |
| context7 | npx | 9201 | ✅ running | External docs lookup. Keep. |
| sqlite | npx | 9202 | ✅ running | Database. Keep. |
| puppeteer | npx | 9203 | ✅ running | Browser automation. Keep. |
| git | uvx | 9204 | ✅ running | Git operations. Keep. |
| plugin-registry | local | — | ❌ skipped | Extension discovery. Keep if plugin system used. |
| puppetmaster | local | — | ❌ skipped | PM Framework. Remove — not relevant for NoCowboy standalone. |
| ralph | local | — | ❌ skipped | Ralph TUI execution. DEPRECATED — agent removed. Remove. |
| ncp-validator | local | — | ❌ skipped | NCP spec validation. Keep. |
| contract-guard | local | — | ❌ skipped | API contract checking. Keep. |
| score-engine | local | — | ❌ skipped | NoCowboy Score compute. Keep. |
| nutausik | node | — | ❌ skipped | Project management (80+ tools). Keep — MCP port. |
| hooks | local | — | ❌ skipped | Lifecycle hooks. Keep. |

## Community MCP Servers

| Server | Command | Status | Notes |
|--------|---------|--------|-------|
| context7 | `npx @upstash/context7-mcp` | ✅ | External docs |
| sqlite | `npx mcp-sqlite-server` | ✅ | Database |
| puppeteer | `npx puppeteer-mcp-claude serve` | ✅ | Browser |
| git | `uvx mcp-server-git` | ✅ | Git |

## Recommendations

### Remove (2 servers)
| Server | Reason |
|--------|--------|
| **ralph** | Agent removed, MCP server no longer needed |
| **puppetmaster** | PM Framework specific, not for standalone NoCowboy |

### Keep (11 servers)
All others — actively used or potentially useful.

### Merge candidates
| Servers | Merge into? | Why |
|---------|-------------|-----|
| ncp-validator, contract-guard | constitution | All validation/spec tools. Same domain. |
| score-engine | nutausik | Metrics/score is project management data |

### Action items when revisiting:
1. Remove ralph MCP from config + `~/.nocowboy/mcp/launch.json`
2. Remove puppetmaster MCP from config + launch.json
3. Investigate merging ncp-validator + contract-guard into constitution
4. Investigate merging score-engine into nutausik
5. Clean up MCP port assignments (currently auto-allocated starting 9200)
