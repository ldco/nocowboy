# Plan: Constitution MCP Server (AST Analyzer)

**Goal:** Build the first NoCowboy MCP server — a Code Constitution rule engine that plugs into the existing Kilo Code framework immediately. Rules live in pluggable Language Modules. Uses tree-sitter for AST parsing. Zero LLM calls. Follows the proven ralph MCP pattern.

**Target:** `~/.config/kilo/mcp-servers/constitution/`

---

## Architecture — Language Module System

The Constitution server has a thin core and pluggable language modules. Each language module is a self-contained directory with its tree-sitter grammar + rules. A project config declares which modules to load. If you never use Elixir, the Elixir module never loads, never allocates memory, and its npm dependencies are optional.

```
constitution-mcp-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                  # MCP server entry, stdio transport
│   ├── types.ts                  # Shared types
│   │
│   ├── core/                     # Language-agnostic infrastructure
│   │   ├── parser.ts             # Generic tree-sitter wrapper (language arg)
│   │   ├── walker.ts             # AST walker, dispatches to language rules
│   │   ├── violations.ts         # Violation struct, formatting
│   │   └── module-loader.ts      # Loads Language Modules based on config
│   │
│   ├── tools/                    # MCP tool handlers
│   │   ├── index.ts
│   │   ├── check-file.ts         # Detects language from extension, routes to module
│   │   ├── check-project.ts
│   │   ├── list-rules.ts
│   │   └── constitution-status.ts
│   │
│   └── modules/                  # Language Modules (one directory per language)
│       │
│       ├── _template/            # Template for creating new language modules
│       │   ├── grammar.ts        # tree-sitter-<lang> init
│       │   ├── rules.ts          # Rule set for this language
│       │   └── module.json       # { name, extensions, grammarPackage }
│       │
│       ├── typescript/           # Language Module: TypeScript/TSX
│       │   ├── grammar.ts        # tree-sitter-typescript + tree-sitter-tsx
│       │   ├── rules.ts          # Registry: all TS rules
│       │   ├── module.json       # { name: "typescript", extensions: [".ts",".tsx"], ... }
│       │   └── rules/
│       │       ├── no-any-type.ts
│       │       ├── no-raw-sql.ts
│       │       ├── no-hardcoded-secrets.ts
│       │       ├── no-console-log.ts
│       │       ├── no-eval.ts
│       │       ├── max-function-lines.ts
│       │       ├── max-complexity.ts
│       │       ├── require-null-check.ts
│       │       ├── require-error-handling.ts
│       │       └── require-csrf-decorator.ts
│       │
│       └── python/               # Language Module: Python (future)
│           ├── grammar.ts        # tree-sitter-python
│           ├── rules.ts
│           ├── module.json       # { name: "python", extensions: [".py"], ... }
│           └── rules/
│               ├── no-bare-except.ts
│               ├── no-eval.ts
│               └── ...
│
└── test/
    ├── fixtures/
    │   ├── typescript/
    │   │   ├── any-type.ts
    │   │   ├── raw-sql.ts
    │   │   ├── hardcoded-secret.ts
    │   │   └── clean.ts
    │   └── python/
    │       └── (future)
    └── typescript-rules.test.ts
```

### Language Module Contract

Each module exports:

```typescript
interface LanguageModule {
  name: string;                           // "typescript"
  extensions: string[];                   // [".ts", ".tsx"]
  grammar: Parser;                        // tree-sitter Parser instance
  rules: Rule[];                          // All rules for this language
}

interface Rule {
  id: string;                             // "no-any-type"
  language: string;                       // "typescript"
  severity: "error" | "warning";
  description: string;
  auto_fixable: boolean;
  check(tree: Tree, source: string, filename: string): Violation[];
}
```

### Module Loader

```typescript
// src/core/module-loader.ts
// Reads project config, loads only declared modules

interface ConstitutionConfig {
  modules: string[];  // ["typescript", "python"]
}

async function loadModules(config: ConstitutionConfig): Promise<Map<string, LanguageModule>> {
  const modules = new Map();
  for (const name of config.modules) {
    const mod = await import(`../modules/${name}/rules.js`);
    modules.set(name, mod);
  }
  return modules;
}
```

### Project Configuration

```jsonc
// .nocowboyrc (project root)
{
  "constitution": {
    "modules": ["typescript"]   // Only load what you use
  }
}
```

No Python project? Omit `"python"`. No dependency on tree-sitter-python ever loaded. No Elixir? Same. Third-party language modules: drop a directory into `modules/`, declare in config, active immediately.

---

## MCP Tools

| Tool | Input | Output |
|------|-------|--------|
| `constitution_check_file` | `{ path: string }` | `{ violations: Violation[], pass: boolean, file: string, language: string, rules_checked: number }` |
| `constitution_check_project` | `{ glob?: string, paths?: string[] }` | `{ files_checked: number, files_with_violations: number, violations: Violation[], pass: boolean, summary: string }` |
| `constitution_list_rules` | `{}` | `{ modules: { [lang: string]: Rule[] } }` |
| `constitution_status` | `{}` | `{ active_modules: string[], active_rules: number, config_path: string }` |

### Violation Shape

```typescript
interface Violation {
  rule: string;            // "no-any-type"
  language: string;        // "typescript"
  severity: "error" | "warning";
  file: string;
  line: number;
  column: number;
  message: string;
  suggestion?: string;
  auto_fixable: boolean;
}
```

---

## TypeScript Language Module — 10 Rules

| # | Rule | AST pattern | Severity |
|---|------|------------|----------|
| 1 | `no-any-type` | `type_annotation` with text `any` | Error |
| 2 | `no-raw-sql` | String/template containing DML with `FROM`/`JOIN`/`INTO` | Error |
| 3 | `no-hardcoded-secrets` | Variable named `api_key|token|secret|password` = string literal | Error |
| 4 | `no-console-log` | `call_expression` `console.log/warn/error` | Warning |
| 5 | `no-eval` | `eval(...)` or `new Function(...)` | Error |
| 6 | `max-function-lines` | Function body > 50 lines | Warning |
| 7 | `max-complexity` | Branch count > 10 per function | Warning |
| 8 | `require-null-check` | Access on nullable without guard | Error |
| 9 | `require-error-handling` | `await` without try/catch or `.catch()` | Warning |
| 10 | `require-csrf-decorator` | POST/PUT/DELETE handler without CSRF | Error |

### Integration with Kilo Code

```json
{
  "mcpServers": {
    "constitution": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "~/.config/kilo/mcp-servers/constitution"
    }
  }
}
```

---

## User Stories

### US-001 — Scaffold MCP server with module structure
**Priority:** 1
**Depends on:** (none)
Create the Constitution MCP server scaffold with the core/modules directory layout.

**Acceptance Criteria:**
- `~/.config/kilo/mcp-servers/constitution/` directory exists
- `package.json` with same SDK dependency and scripts as ralph MCP
- `tsconfig.json` identical to ralph MCP config
- Directory structure: `src/core/`, `src/modules/`, `src/tools/`, `src/modules/_template/` all exist
- `src/index.ts` starts MCP server on stdio transport, responds to ListToolsRequest (initially empty)
- `npm install && npm run build` succeeds with zero errors

### US-002 — Core parser and module loader
**Priority:** 1
**Depends on:** US-001
Build the language-agnostic core: generic tree-sitter wrapper and module loader.

**Acceptance Criteria:**
- `src/core/parser.ts` exports `parseFile(path, grammar): { tree, source }` — language passed as argument
- `src/core/module-loader.ts` exports `loadModules(config): Map<string, LanguageModule>` — reads project config, dynamically imports only declared modules
- `src/core/violations.ts` exports `Violation` type and `formatViolation(v): string`
- `src/core/walker.ts` exports `walkTree(tree, source, filename, rules): Violation[]` — generic AST traversal
- Config read from `.nocowboyrc` (project root), fallback to default (typescript only)

### US-003 — TypeScript Language Module: grammar + module metadata
**Priority:** 1
**Depends on:** US-002
Set up the TypeScript Language Module with tree-sitter grammar and module contract.

**Acceptance Criteria:**
- `src/modules/typescript/grammar.ts` exports `createParser(): Parser` for `.ts` and `.tsx`
- `src/modules/typescript/module.json` declares `{ name: "typescript", extensions: [".ts", ".tsx"] }`
- `src/modules/typescript/rules.ts` exports `rules: Rule[]` (initially empty)
- `test/fixtures/typescript/clean.ts` — clean TS file, parses without errors
- `test/fixtures/typescript/any-type.ts` — contains `function foo(x: any): any {}`

### US-004 — TypeScript rules: no-any-type, no-raw-sql, no-hardcoded-secrets, no-console-log, no-eval
**Priority:** 1
**Depends on:** US-003
Implement 5 text/pattern rules in the TypeScript module.

**Acceptance Criteria:**
- `src/modules/typescript/rules/no-any-type.ts` — `function foo(x: any): any {}` → 2 violations. `const x: string` → 0.
- `src/modules/typescript/rules/no-raw-sql.ts` — `db.query("SELECT * FROM users")` → violation
- `src/modules/typescript/rules/no-hardcoded-secrets.ts` — `const apiKey = "sk-..."` → violation. `process.env.KEY` → ok.
- `src/modules/typescript/rules/no-console-log.ts` — `console.log()` in non-test file → violation
- `src/modules/typescript/rules/no-eval.ts` — `eval(...)` or `new Function(...)` → violation
- All 5 rules exported from `src/modules/typescript/rules.ts`

### US-005 — TypeScript rules: max-function-lines, max-complexity
**Priority:** 2
**Depends on:** US-003
Structural analysis rules.

**Acceptance Criteria:**
- `max-function-lines`: 55-line function → violation. 30-line → ok.
- `max-complexity`: Counts branches (if/else/for/while/switch/catch/&&/||/?). 12 branches → violation. 3 → ok.

### US-006 — TypeScript rules: require-null-check, require-error-handling, require-csrf-decorator
**Priority:** 2
**Depends on:** US-003
Safety rules for common AI-generated mistakes.

**Acceptance Criteria:**
- `require-null-check`: `users.find(...).name` without null guard → violation. With `if (!user)` → ok.
- `require-error-handling`: bare `await fetch(url)` → violation. `await fetch(url).catch(...)` → ok.
- `require-csrf-decorator`: Express `app.post(...)` without CSRF → violation. With CSRF middleware → ok.

### US-007 — MCP tools: check_file (multi-language)
**Priority:** 1
**Depends on:** US-002, US-004
Wire the core and TypeScript module to MCP tool endpoints.

**Acceptance Criteria:**
- `constitution_check_file` registered in `src/tools/check-file.ts`
- Accepts `{ path: string }` — detects language from file extension, routes to correct module
- `.ts` file → TypeScript module rules run. `.py` file (if python module loaded) → Python module rules run
- Returns `{ violations, pass, file, language, rules_checked }`
- If no module handles the extension → returns empty violations with `language: "unknown"`

### US-008 — MCP tools: check_project
**Priority:** 1
**Depends on:** US-007
Bulk file checking.

**Acceptance Criteria:**
- `constitution_check_project` accepts `{ glob?: string, paths?: string[] }`, defaults to `src/**/*.{ts,tsx}`
- Files dispatched to appropriate language module based on extension
- Processes in parallel (up to 8 concurrent)
- Returns summary: `{ files_checked, files_with_violations, violations[], pass, summary }`

### US-009 — MCP tools: list_rules, status
**Priority:** 2
**Depends on:** US-002
Informational tools showing which modules and rules are active.

**Acceptance Criteria:**
- `constitution_list_rules` returns all rules grouped by module: `{ modules: { typescript: [...rules] } }`
- `constitution_status` returns `{ active_modules: ["typescript"], active_rules: 10, config: {...} }`
- Both respond in <5ms

### US-010 — Pre-commit hook
**Priority:** 3
**Depends on:** US-008
Block commits that introduce Constitution violations.

**Acceptance Criteria:**
- Script checks staged files against loaded language modules
- Violations found → prints them with formatViolation(), exits non-zero, commit blocked
- Clean → exits zero
- Install via `node dist/index.js install-hook`

### US-011 — Module template for third-party languages
**Priority:** 3
**Depends on:** US-003
Provide a template so new language modules can be created by dropping in a directory.

**Acceptance Criteria:**
- `src/modules/_template/` contains: `grammar.ts` (skeleton), `rules.ts` (empty registry), `module.json` (template)
- `module.json` has `{ name, extensions, grammarPackage }` fields
- README section explains: "To add Elixir support: copy `_template/` → `elixir/`, add tree-sitter-elixir grammar, write rules, declare in `.nocowboyrc`"

---

## Non-Goals

- Python Language Module (separate plan — copy template, add grammar, write rules)
- Other language modules (Elixir, Go, Rust, PHP — each is a copy of `_template/` + grammar + rules)
- Auto-fix engine (deferred — rules marked `auto_fixable` but no fix engine yet)
- Score computation (separate MCP: `score-engine`)
- Contract guard (separate MCP: `contract-guard`)
- NCP protocol (separate MCP: `ncp-validator`)
