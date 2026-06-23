# Tausik JS Port Guide

## Overview

Tausik is a web search and browsing MCP server. Currently in Python, tightly coupled to Claude's subscription (web search via Claude API proxy). Needs porting to TypeScript as `@nocowboy/mcp-tausik` — a first-class NoCowboy MCP server.

**Current Python version:** `~/.kilo/mcp-servers/tausik/` (Kilocode setup).  
**Target:** standalone `@nocowboy/mcp-tausik` npm package, published independently, auto-detected via `require.resolve`.

## Core features

From the source structure (bootstrap/, server.py, AGENTS.md, CLAUDE.md):

- **Web search** — queries external search APIs (Google, Bing, etc.), returns ranked results
- **Web page fetching** — fetches and extracts content from URLs (readability, markdown conversion)
- **Search result caching** — caches recent searches to avoid redundant API calls
- **Conversation context** — maintains context across sequential searches (user asks follow-up questions)
- **Claude subscription integration** — uses Claude API proxy for search (current), should be decoupled for NoCowboy

## Architecture for JS port

```
┌──────────────────────────────────────┐
│         nocowboy mcp start           │
│  spawns @nocowboy/mcp-tausik via    │
│  embedded proxy on port 9204         │
└──────────┬───────────────────────────┘
           │ HTTP SSE (http://127.0.0.1:9204/mcp)
┌──────────▼───────────────────────────┐
│         @nocowboy/mcp-tausik         │
│  ┌────────────────────────────────┐  │
│  │  WebSearchProvider (abstraction)│  │
│  │  ├── TavilySearchAPI           │  │
│  │  ├── GoogleCustomSearch        │  │
│  │  ├── BingSearch                │  │
│  │  └── BraveSearch               │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  WebPageFetcher                │  │
│  │  ├── @mozilla/readability      │  │
│  │  ├── turndown (HTML→MD)        │  │
│  │  └── JSDOM / Cheerio           │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  ResultCache (lru-cache)       │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

## MCP Tools

### `tausik_search`

```
Arguments:
  query        string  — search query
  count        number  — results count (default: 10)
  region       string  — region/country code (optional)

Returns:
  results[] — { title, url, snippet, source }
  source    — the search provider that returned this result
```

### `tausik_fetch`

```
Arguments:
  url         string   — URL to fetch and extract
  format      string   — "markdown" | "text" | "html" (default: markdown)

Returns:
  title       string   — page title
  content     string   — extracted content
  url         string   — resolved URL (after redirects)
```

### `tausik_cache_clear`

Clears the local search result cache.

## Provider abstraction

The search provider MUST be abstracted behind an interface. NoCowboy supports multiple providers, not just Claude.

```typescript
interface SearchProvider {
  search(query: string, options: { count?: number; region?: string }): Promise<SearchResult[]>
}
```

Default implementations:

| Provider | Where | How |
|---|---|---|
| **Tavily** | `tavily.com` | API key in config, most reliable and similar to Claude's proxy |
| **Google** | Custom Search JSON API | Needs `GOOGLE_API_KEY` + `GOOGLE_CX` (search engine ID) |
| **Brave** | `api.search.brave.com` | Free tier available, good for initial launch |
| **Bing** | Azure Cognitive Services | Paid, requires subscription |
| **Kilo proxy** | internal | Use if available (same as current Claude subscription path) |

## Config format

```json
{
  "provider": "tavily",
  "tavily": { "apiKey": "tvly-..." },
  "resultsPerPage": 10,
  "cacheTTL": 300000,
  "fetchTimeout": 10000
}
```

Config is stored in `~/.nocowboy/nocowboy.json` — same as other MCP servers.  
Provider selection allows users to choose their search backend, no longer tied to Claude.

## Steps to port

### 1. Project scaffold

```bash
mkdir -p packaging/mcp-servers/tausik/src
cd packaging/mcp-servers/tausik
cat > package.json << 'EOF'
{
  "name": "@nocowboy/mcp-tausik",
  "version": "0.1.0",
  "private": false,
  "publishConfig": { "access": "public" },
  "type": "module",
  "main": "dist/index.js",
  "files": ["dist/"],
  "scripts": {
    "build": "tsc",
    "postinstall": "nocowboy mcp install tausik || true"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.15.0",
    "cheerio": "^1.0.0",
    "@mozilla/readability": "^0.5.0",
    "jsdom": "^25.0.0",
    "turndown": "^7.2.0",
    "lru-cache": "^11.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
EOF
```

### 2. Provider implementations

Implement `SearchProvider` for each engine. Start with Tavily (simplest, closest to Claude proxy behavior).  
Each provider reads its config from the tool arguments or process.env.

### 3. Web page fetching

Use existing npm packages — no need to implement from scratch:
- `@mozilla/readability` — extract main content from HTML
- `turndown` — convert HTML to Markdown (what the LLM prefers)
- `cheerio` / `jsdom` — parse and traverse HTML

### 4. MCP server entry

Standard NoCowboy MCP server layout:

```
src/
├── index.ts          — MCP server entry, registers tools
├── providers/
│   ├── types.ts      — SearchResult, SearchProvider interface
│   ├── tavily.ts     — Tavily search provider
│   ├── google.ts     — Google Custom Search
│   └── brave.ts      — Brave Search
├── fetcher.ts        — Web page fetch + content extraction
└── cache.ts          — LRU cache implementation
```

### 5. Package.json postinstall

Already documented — `postinstall` runs `nocowboy mcp install tausik || true`.  
`McpInstallCommand` handles auto-config (add to config.mcp + launch.json + start).

## Testing

```bash
# Start the server directly (without nocowboy proxy)
npm run build && node dist/index.js

# Test via npx
npx @nocowboy/mcp-tausik

# Test via nocowboy lifecycle
nocowboy mcp install tausik
# → auto-detects, adds to config, starts on port 9204
nocowboy mcp status
# → tausik running — http://127.0.0.1:9204/mcp
```

## Publishing

```bash
# After build:
npm publish
```

Will be auto-detected by NoCowboy's `launcher.ts` via `require.resolve("@nocowboy/mcp-tausik/dist/index.js")`.

## Status

| Item | Status |
|---|---|
| Provider abstraction layer | 🟡 design complete, needs implementation |
| Tavily provider | 🔴 not started |
| Google provider | 🔴 not started |
| Brave provider | 🔴 not started (good for free tier) |
| Web page fetcher | 🔴 not started |
| Cache layer | 🔴 not started |
| MCP server entry | 🔴 not started |
| `postinstall` script | 🟢 ready in template |
| Launcher auto-detect | 🟢 already works (require.resolve) |
| Port assignment | 🟢 already works (9200+, MeCpLifecycle) |
