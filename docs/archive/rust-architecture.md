# [DEPRECATED] NoCowboy TUI — Rust Architecture Plan (Ratatui)

**Status:** SUPERSEDED by [nocowboy-fork-plan.md](../plans/nocowboy-fork-plan.md)
**Deprecated:** 2026-06-17
**Reason:** Direction changed from Rust scratch-build to TypeScript fork of KiloCode. This was the most detailed technical document (1025 lines). MCP integration patterns, event loop design, and layout concepts may be reusable — but all Rust-specific code (structs, impl blocks, Ratatui, rmcp, tokio) is abandoned.
**Do NOT implement from this document.** Kept for historical reference of MCP hub patterns and event sourcing design.

---

# NoCowboy TUI — Rust Architecture Plan

**Date:** 2026-06-16
**Status:** Proposed
**Target Stack:** Rust + Ratatui + rmcp + tokio
**MCP Servers:** Keep existing Node.js servers (~/.config/kilo/mcp-servers/)

---

## 1. Architecture Decision Records

### ADR-001: Rust + Ratatui for Custom TUI

**Status:** Accepted

**Context:** NoCowboy TUI needs a custom terminal interface with substantial changes from existing solutions — multi-panel layout, custom interaction model, real-time score dashboard, plugin system, and custom session management. Existing MCP servers (Node.js) must be preserved as-is. The TUI must communicate with 7+ MCP servers and multiple LLM providers.

**Decision:** Build the TUI in Rust using the Ratatui immediate-mode rendering library, with tokio for async runtime and rmcp for MCP client communication.

**Options Considered:**
1. **Rust + Ratatui** — Maximum control over rendering and performance. Single binary. Strong type system prevents UI bugs. Immediate-mode means no widget tree reconciliation. Steep learning curve but highest ceiling.
2. **Go + Bubble Tea** — Elm architecture, mature widget library. Same foundation as OpenCode/KiloCode. But Go's type system is weaker for complex state management.
3. **Node.js + Ink** — React component model, familiar ecosystem. But Node.js process overhead, no true multithreading for parallel MCP calls, Flexbox layout limits complex TUIs.

**Consequences:**
- ✅ Single binary distribution — no Node.js required for the TUI itself
- ✅ Maximum rendering performance and layout control
- ✅ Strong type system catches UI bugs at compile time
- ✅ tokio enables true parallel MCP calls and LLM streaming
- ⚠️ Steeper learning curve than Go or Node.js
- ⚠️ Building widgets from scratch (no "component library" like Bubbles)
- ⚠️ 3-6 months to full feature parity with existing agents

### ADR-002: MCP Transport — Streamable HTTP

**Status:** Accepted

**Context:** Existing MCP servers run as HTTP daemons on ports 8200-8205 (systemd user services). The Rust TUI must connect to them.

**Decision:** Use rmcp's `StreamableHttpClientTransport` for HTTP-based MCP communication. Each MCP server gets its own transport client.

**Options Considered:**
1. **Streamable HTTP (rmcp)** — Clean async API, works with existing HTTP servers. Supports server→client notifications.
2. **Stdio subprocess** — Would require wrapping servers as child processes. Doesn't match current daemon architecture.
3. **Custom HTTP client** — More control but redundant work vs rmcp.

**Consequences:**
- ✅ Direct HTTP communication with existing servers — no changes to infrastructure
- ✅ rmcp handles initialization handshake, tool listing, and call serialization
- ⚠️ HTTP transport adds latency vs Unix sockets (mitigated by connection pooling)

---

## 2. C4 Model

### Level 1 — System Context

```
┌──────────────────────────────────────────────────────────────────────┐
│                          NoCowboy TUI                                 │
│                                                                       │
│  ┌──────────────┐    ┌──────────────────────────────────────────┐   │
│  │  Developer    │◀──▶│  NoCowboy TUI Binary (Rust)              │   │
│  │  (Terminal)   │    │                                          │   │
│  └──────────────┘    │  ┌──────────┐  ┌──────────┐              │   │
│                       │  │  TUI     │  │  Core    │              │   │
│  ┌──────────────┐    │  │  Engine  │  │  Engine  │              │   │
│  │  LLM Provider │◀──▶│  │ (Ratatui)│  │ (tokio)  │              │   │
│  │  (DeepSeek,   │    │  └──────────┘  └──────────┘              │   │
│  │   Claude,     │    │                                          │   │
│  │   OpenAI)     │    │  Manages: agents, sessions, permissions,  │   │
│  └──────────────┘    │  commands, plugins, MCP connections        │   │
│                       └──────────────┬───────────────────────────┘   │
│  ┌──────────────┐                   │ MCP (HTTP)                      │
│  │  LanceDB      │◀──┐              │                                 │
│  │  (Vector)     │   │              ├──────────────┬─────────────┐    │
│  └──────────────┘   │              │              │             │    │
│                      │    ┌─────────┴──┐  ┌──────┴──────┐  ┌──┴───┐│
│  ┌──────────────┐   │    │ context7   │  │  sqlite     │  │ tausik││
│  │  Project      │───┘    │ MCP :8200  │  │  MCP :8201  │  │:8204  ││
│  │  Filesystem   │        └────────────┘  └─────────────┘  └──────┘│
│  └──────────────┘         ┌────────────┐  ┌─────────────┐  ┌──────┐│
│                           │ puppeteer  │  │ puppetmaster│  │ git  ││
│                           │ :8202      │  │ :8203       │  │:8205 ││
│                           └────────────┘  └─────────────┘  └──────┘│
│                           ┌────────────┐                            │
│                           │ ralph MCP  │  (local stdio)            │
│                           │ npx tsx... │                            │
│                           └────────────┘                            │
└──────────────────────────────────────────────────────────────────────┘
```

### Level 2 — Container Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                    NoCowboy TUI Binary (Rust)                       │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     TUI Engine (Ratatui)                       │  │
│  │                                                                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │  │
│  │  │ Header   │  │  Agent   │  │  Chat    │  │  Context     │  │  │
│  │  │ Bar      │  │  Sidebar │  │  Panel   │  │  Panel       │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │  │
│  │  │ Status   │  │  Input   │  │  Score   │  │  Tab Bar     │  │  │
│  │  │ Bar      │  │  Area    │  │  Widget  │  │              │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │  │
│  └──────────────────────────────┬───────────────────────────────┘  │
│                                 │                                   │
│  ┌──────────────────────────────┼───────────────────────────────┐  │
│  │                     Core Engine                               │  │
│  │                                                                │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ │  │
│  │  │ App State  │ │ Event Loop │ │ Command    │ │ Permission │ │  │
│  │  │ (Reducers) │ │ (tokio)    │ │ Registry   │ │ Engine     │ │  │
│  │  └────────────┘ └────────────┘ └────────────┘ └───────────┘ │  │
│  │                                                                │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ │  │
│  │  │ Agent Mgmt │ │ Session    │ │ Plugin     │ │ Config     │ │  │
│  │  │            │ │ Manager    │ │ Host       │ │ Loader     │ │  │
│  │  └────────────┘ └────────────┘ └────────────┘ └───────────┘ │  │
│  │                                                                │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │              External Integrations                       │  │  │
│  │  │                                                          │  │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │  │  │
│  │  │  │ LLM      │  │ MCP Hub  │  │ Semantic │  │ File    │ │  │  │
│  │  │  │ Client   │  │ (rmcp)   │  │ Search   │  │ System  │ │  │  │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### Level 3 — Component Architecture

```
src/
├── main.rs                    # Entry point, bootstrap
├── app.rs                     # App struct, state, initialization
├── tui/
│   ├── mod.rs
│   ├── engine.rs              # Terminal setup, raw mode, render loop
│   ├── event.rs               # Event enum (Key, Resize, MCP response, LLM token)
│   ├── layout.rs              # Layout definitions for all panels
│   └── widgets/
│       ├── mod.rs
│       ├── header.rs          # Logo, project name, session info
│       ├── agent_sidebar.rs   # Agent list, switch agent
│       ├── chat.rs            # Message history, streaming, markdown
│       ├── input.rs           # Multi-line input with history
│       ├── context_panel.rs   # Files, PRD stories, tool outputs
│       ├── status_bar.rs      # Score, session time, tool status
│       ├── score_widget.rs    # NoCowboy Score gauge (0-100%)
│       ├── tab_bar.rs         # Open tabs (files, sessions, tools)
│       ├── diff_viewer.rs     # Git diff rendering
│       └── progress.rs        # Spinner, progress bar
├── core/
│   ├── mod.rs
│   ├── state.rs               # Global AppState, reducers
│   ├── event_loop.rs          # Main event loop: input → dispatch → render
│   └── command.rs             # Command trait, command registry
├── agent/
│   ├── mod.rs
│   ├── manager.rs             # Agent loading, switching, lifecycle
│   ├── prompt.rs              # Agent prompt templates
│   └── builtin.rs             # Built-in agents (architect, prd, ralph, etc.)
├── llm/
│   ├── mod.rs
│   ├── client.rs              # Multi-provider LLM client
│   ├── streaming.rs           # SSE streaming parser
│   └── providers/
│       ├── mod.rs
│       ├── deepseek.rs
│       ├── claude.rs
│       └── openai.rs
├── mcp/
│   ├── mod.rs
│   ├── hub.rs                 # MCP connection pool, tool registry
│   ├── client.rs              # Per-server MCP client (rmcp wrapper)
│   └── tool_registry.rs       # Aggregated tool list from all servers
├── session/
│   ├── mod.rs
│   ├── manager.rs             # Session create, save, resume
│   ├── checkpoint.rs          # Git tag + stash checkpoints
│   └── persistence.rs         # State serialization to disk
├── plugin/
│   ├── mod.rs
│   ├── host.rs                # Wasmtime host for plugins
│   └── manifest.rs            # Plugin manifest parsing
├── search/
│   ├── mod.rs
│   ├── semantic.rs            # LanceDB vector search client
│   └── file_search.rs         # Glob + grep integration
├── permission/
│   ├── mod.rs
│   └── engine.rs              # Rule-based permission engine
├── config/
│   ├── mod.rs
│   ├── loader.rs              # Config file parser (TOML)
│   └── schema.rs              # Config struct definitions
└── score/
    ├── mod.rs
    └── engine.rs              # NoCowboy Score computation
```

### Level 3 — Data Flow

```
                    ┌──────────────────────────────────┐
                    │         Event Loop (tokio)         │
                    │                                    │
    Terminal  ──────▶  KeyEvent                       │
    MCP Server ─────▶  McpResponse                    │
    LLM API   ──────▶  LlmToken (streaming)           │
    Timer     ──────▶  Tick                            │
                    │                                    │
                    │  ┌─────────────────────────────┐  │
                    │  │        Reducer Pipeline       │  │
                    │  │                                │  │
                    │  │  Event → match → update state │  │
                    │  │                                │  │
                    │  │  KeyEvent::Enter              │  │
                    │  │    → dispatch_user_message()   │  │
                    │  │    → set agent active          │  │
                    │  │    → spawn LLM stream task     │  │
                    │  │                                │  │
                    │  │  LlmToken(text)               │  │
                    │  │    → append to chat buffer     │  │
                    │  │    → parse tool calls          │  │
                    │  │                                │  │
                    │  │  ToolCall(name, args)          │  │
                    │  │    → check permissions         │  │
                    │  │    → spawn MCP call task       │  │
                    │  │                                │  │
                    │  │  McpResponse(tool, result)     │  │
                    │  │    → append to chat            │  │
                    │  │    → update score              │  │
                    │  │    → send to LLM for continue  │  │
                    │  └───────────┬───────────────────┘  │
                    │              │                        │
                    │              ▼                        │
                    │  ┌─────────────────────────────┐    │
                    │  │       Render (Ratatui)        │    │
                    │  │                                │    │
                    │  │  state → layout → widgets     │    │
                    │  │  frame.render_widget(...)      │    │
                    │  └─────────────────────────────┘    │
                    └──────────────────────────────────────┘
```

---

## 3. TUI Layout Design

### Primary Layout (Default View)

```
┌──────────────────────────────────────────────────────────────────┐
│ 🔫 NoCowboy TUI  │  project-name  │  Session: 00:42  │  Score: 87 │
├───────────┬──────────────────────────────────┬───────────────────┤
│           │                                  │                   │
│  AGENTS   │  ┌────────────────────────────┐ │  CONTEXT          │
│           │  │                            │ │                   │
│  ● ralph  │  │  User: Execute             │ │  PRD: user-auth   │
│    (active)│  │  docs/user-auth.md         │ │  ─────────────────│
│           │  │                            │ │  US-001 ✓ Hash    │
│  ○ prd    │  │  ralph: I'll execute the   │ │  US-002 ▶ Login   │
│           │  │  PRD story by story.        │ │  US-003 ○ Reg     │
│  ○ arch   │  │                            │ │  US-004 ⛔ SMTP   │
│           │  │  Loading US-001...          │ │                   │
│  ○ gov    │  │  ┌──────────────────────┐  │ │  Files:           │
│           │  │  │░░░░░░░░░░░░░░░░░░░░░░│  │ │  src/auth.ts      │
│           │  │  └──────────────────────┘  │ │  src/login.ts     │
│           │  │                            │ │                   │
│           │  └────────────────────────────┘ │  Score: 87/100    │
│           │                                  │  [████████░░]     │
├───────────┴──────────────────────────────────┴───────────────────┤
│ > _                                                               │
├──────────────────────────────────────────────────────────────────┤
│ Ctrl+S agents │ Ctrl+O files │ Ctrl+T tools │ F1 help │ F12 quit  │
└──────────────────────────────────────────────────────────────────┘
```

### Layout Constraints

```
Vertical splits:
  [0] Header bar:      Length(1)
  [1] Main area:       Fill(1)
  [2] Input area:      Length(3)   (expandable to 10)
  [3] Keybind bar:     Length(1)

Horizontal splits (within Main area):
  [1][0] Agent sidebar:    Length(18)   (collapsible)
  [1][1] Chat panel:       Fill(1)
  [1][2] Context panel:    Length(30)   (collapsible, togglable)
```

### Panel States

| Panel | States |
|-------|--------|
| **Agent sidebar** | Visible / Collapsed (Ctrl+B) |
| **Chat panel** | Streaming, idle, waiting-for-input, tool-executing |
| **Context panel** | PRD view, file tree, tool output, score detail, diff view |
| **Input area** | Single-line, multi-line (Alt+Enter), command mode |
| **Status bar** | Normal, error (red), warning (yellow), success (green) |

---

## 4. Core Engine Design

### AppState

```rust
/// Global application state — single source of truth
struct AppState {
    // UI state
    active_agent: AgentId,
    chat_messages: Vec<ChatMessage>,
    input_buffer: String,
    input_mode: InputMode,          // Normal | MultiLine | Command
    context_view: ContextView,      // Prd | Files | Tools | Score
    panels_visible: PanelVisibility,
    tabs: Vec<Tab>,

    // Session state
    session: Session,
    project_path: PathBuf,
    config: NoCowboyConfig,

    // Agent state
    agents: HashMap<AgentId, AgentInstance>,
    active_tool_calls: Vec<PendingToolCall>,

    // Connections
    mcp_connections: HashMap<String, McpConnection>,
    llm_stream: Option<LlmStreamHandle>,

    // Score state
    score: NoCowboyScore,
    score_history: VecDeque<ScoreSnapshot>,
}

/// Events that drive the application
enum AppEvent {
    // Input events
    Key(crossterm::event::KeyEvent),
    Mouse(crossterm::event::MouseEvent),
    Resize(u16, u16),

    // LLM events
    LlmToken(String),
    LlmToolCall { id: String, name: String, args: serde_json::Value },
    LlmDone,

    // MCP events
    McpToolResult { call_id: String, result: String },
    McpToolError { call_id: String, error: String },

    // System events
    Tick,              // 100ms timer for animations, spinners
    Quit,
}

/// Actions dispatched by event handlers (pure state transitions)
enum Action {
    // Chat
    AppendMessage(ChatMessage),
    AppendToken(String),
    SetStreaming(bool),

    // Agent
    SwitchAgent(AgentId),
    SendUserMessage(String),

    // Tool
    RequestToolCall { call_id: String, name: String, args: Value },
    ReceiveToolResult { call_id: String, result: String },

    // UI
    TogglePanel(PanelId),
    SwitchContextView(ContextView),
    SetInputMode(InputMode),
    NavigateHistory(HistoryDirection),

    // Session
    SaveCheckpoint,
    UpdateScore(NoCowboyScore),

    // System
    Quit,
}
```

### Event Loop

```rust
async fn run_event_loop(
    mut app: App,
    mut events: EventStream,
    mut render_tx: RenderTrigger,
) -> Result<()> {
    loop {
        tokio::select! {
            // Terminal input
            Some(event) = events.next() => {
                let actions = app.handle_event(event);
                app.dispatch(actions).await?;
            }

            // LLM streaming tokens
            Some(token) = app.llm_stream.as_mut().and_then(|s| s.next()) => {
                app.dispatch(vec![Action::AppendToken(token)]).await?;
            }

            // MCP tool results
            Some((call_id, result)) = app.mcp_results.next() => {
                app.dispatch(vec![
                    Action::ReceiveToolResult { call_id, result }
                ]).await?;
            }

            // Animation tick (100ms)
            _ = tick(Duration::from_millis(100)) => {
                app.dispatch(vec![Action::Tick]).await?;
            }
        }

        // Trigger render after any state change
        render_tx.trigger()?;
    }
}
```

### Render Loop

```rust
fn render_loop(
    mut terminal: Terminal<CrosstermBackend<Stdout>>,
    mut render_rx: RenderTrigger,
    app: Arc<RwLock<AppState>>,
) -> Result<()> {
    loop {
        render_rx.wait()?;
        let state = app.read().unwrap();

        terminal.draw(|frame| {
            let layout = compute_layout(frame.area());

            // Header
            frame.render_widget(
                HeaderWidget::new(&state),
                layout.header,
            );

            // Agent sidebar
            if state.panels_visible.sidebar {
                frame.render_widget(
                    AgentSidebar::new(&state.agents, state.active_agent),
                    layout.sidebar,
                );
            }

            // Chat panel
            frame.render_widget(
                ChatPanel::new(&state.chat_messages, state.llm_stream.is_some()),
                layout.chat,
            );

            // Context panel
            if state.panels_visible.context {
                frame.render_widget(
                    ContextPanel::new(&state),
                    layout.context,
                );
            }

            // Input area
            frame.render_widget(
                InputWidget::new(&state.input_buffer, state.input_mode),
                layout.input,
            );

            // Status bar
            frame.render_widget(
                StatusBar::new(&state.session, &state.score, &state.mcp_connections),
                layout.status,
            );
        })?;
    }
}
```

---

## 5. MCP Integration Layer

### Connection Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      MCP Hub                                      │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                McpConnectionPool                            │  │
│  │                                                              │  │
│  │  context7 ──── StreamableHttpClient ──── http://127.0.0.1:8200/mcp
│  │  sqlite   ──── StreamableHttpClient ──── http://127.0.0.1:8201/mcp
│  │  puppeteer ─── StreamableHttpClient ──── http://127.0.0.1:8202/mcp
│  │  pm       ──── StreamableHttpClient ──── http://127.0.0.1:8203/mcp
│  │  tausik   ──── StreamableHttpClient ──── http://127.0.0.1:8204/mcp
│  │  git      ──── StreamableHttpClient ──── http://127.0.0.1:8205/mcp
│  │  ralph    ──── StdioTransport     ──── npx tsx ralph/src/index.ts
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Aggregated Tool Registry                      │  │
│  │                                                            │  │
│  │  Maps tool_name → (server, handler) for dispatch           │  │
│  │                                                            │  │
│  │  "ralph_load_prd"    → (ralph,    load_prd_handler)       │  │
│  │  "ralph_next_story"  → (ralph,    next_story_handler)     │  │
│  │  "tausik_verify"     → (tausik,   verify_handler)         │  │
│  │  "git_git_commit"    → (git,      commit_handler)         │  │
│  │  ...                                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### MCP Client Implementation

```rust
use rmcp::{
    ServiceExt, serve_client,
    transport::streamable_http_client::{
        StreamableHttpClientTransport,
        StreamableHttpClientTransportConfig,
    },
    model::{CallToolRequestParams, ListToolsRequestParams},
};

/// Manages connections to all MCP servers
struct McpHub {
    connections: HashMap<String, McpClient>,
    tool_registry: ToolRegistry,
}

struct McpClient {
    peer: rmcp::service::Peer<rmcp::RoleClient>,
    server_name: String,
    tools: Vec<ToolInfo>,
}

impl McpHub {
    async fn connect_http(name: &str, url: &str) -> Result<McpClient> {
        let config = StreamableHttpClientTransportConfig {
            uri: url.into(),
            ..Default::default()
        };
        let transport = StreamableHttpClientTransport::from_config(config);
        let client = ().serve(transport).await?;

        // Discover tools
        let tools = client.peer()
            .list_tools(ListToolsRequestParams::default())
            .await?;

        Ok(McpClient {
            peer: client.peer().clone(),
            server_name: name.to_string(),
            tools: tools.tools.into_iter().map(ToolInfo::from).collect(),
        })
    }

    async fn connect_stdio(name: &str, command: &str, args: &[&str]) -> Result<McpClient> {
        // Stdio transport for ralph MCP
        let stream = tokio::process::Command::new(command)
            .args(args)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .spawn()?;
        let transport = StdioTransport::from_streams(
            stream.stdin.take().unwrap(),
            stream.stdout.take().unwrap(),
        );
        let client = ().serve(transport).await?;
        // ... same tool discovery
    }

    /// Call any tool by name — hub routes to correct server
    async fn call_tool(&self, name: &str, args: Value) -> Result<String> {
        let (server_name, _tool) = self.tool_registry.lookup(name)?;
        let client = self.connections.get(server_name)?;

        let params = CallToolRequestParams {
            name: name.to_string(),
            arguments: Some(args),
            meta: None,
        };
        let result = client.peer.call_tool(params).await?;
        Ok(result.content.into_iter()
            .filter_map(|c| c.as_text().ok())
            .collect::<Vec<_>>()
            .join("\n"))
    }
}
```

---

## 6. LLM Client Design

### Multi-Provider Architecture

```rust
/// Unified LLM client — streams tokens and parses tool calls
struct LlmClient {
    provider: LlmProvider,
    http: reqwest::Client,
}

enum LlmProvider {
    DeepSeek { api_key: String, model: String },
    Claude { api_key: String, model: String },
    OpenAI { api_key: String, model: String },
    Ollama { base_url: String, model: String },
}

struct StreamedResponse {
    token_rx: tokio::sync::mpsc::UnboundedReceiver<LlmStreamEvent>,
    cancel: tokio_util::sync::CancellationToken,
}

enum LlmStreamEvent {
    Text(String),
    ToolCallStart { id: String, name: String },
    ToolCallArg { id: String, arg: String },
    ToolCallEnd { id: String },
    Done,
    Error(String),
}

impl LlmClient {
    async fn stream_chat(
        &self,
        messages: Vec<ChatMessage>,
        tools: Vec<ToolDefinition>,
        system_prompt: &str,
    ) -> Result<StreamedResponse> {
        let (tx, rx) = tokio::sync::mpsc::unbounded_channel();

        // Build provider-specific request
        let request = self.build_request(messages, tools, system_prompt);

        // Spawn streaming task
        let client = self.http.clone();
        let provider = self.provider.clone();
        tokio::spawn(async move {
            let mut stream = client
                .post(provider.endpoint())
                .headers(provider.headers())
                .json(&request)
                .send()
                .await?
                .bytes_stream();

            // Parse SSE stream
            while let Some(chunk) = stream.next().await {
                for line in parse_sse(chunk?) {
                    match parse_event(&line) {
                        Some(LlmStreamEvent::Text(t)) => tx.send(LlmStreamEvent::Text(t))?,
                        Some(LlmStreamEvent::ToolCallStart { id, name }) => {
                            tx.send(LlmStreamEvent::ToolCallStart { id, name })?
                        }
                        // ... other events
                        None => continue,
                    }
                }
            }
            tx.send(LlmStreamEvent::Done)?;
            Ok::<_, Box<dyn Error>>(())
        });

        Ok(StreamedResponse { token_rx: rx })
    }
}
```

---

## 7. Plugin System Design

### Wasmtime-Based Plugin Host

```rust
use wasmtime::{Engine, Module, Store, Linker};

/// Plugin manifest (nocowboy-plugin.toml)
#[derive(Deserialize)]
struct PluginManifest {
    name: String,
    version: String,
    description: String,
    plugin_type: PluginType,
    wasm_path: String,
}

enum PluginType {
    Widget,       // Custom TUI widget
    Agent,        // Custom agent
    Tool,         // Custom tool (local, not MCP)
    Theme,        // Color scheme
    Hook,         // Pre/post action hook
}

/// Host functions exposed to plugins
struct PluginHost {
    /// Allow plugin to write to a render buffer
    fn render_text(x: u16, y: u16, text: &str, style: StyleId);
    /// Allow plugin to read chat history
    fn get_chat_history() -> Vec<String>;
    /// Allow plugin to call MCP tools (permission-gated)
    fn call_tool(name: &str, args: &str) -> String;
}
```

---

## 8. Session Management

### State Persistence

```rust
/// Session state persisted to disk (~/.local/share/nocowboy/sessions/)
struct SessionState {
    id: String,                          // UUID
    project_path: PathBuf,
    started_at: DateTime<Utc>,
    last_active: DateTime<Utc>,
    agent_states: HashMap<AgentId, AgentState>,
    chat_history: Vec<PersistedMessage>,
    prd_progress: PrdProgress,           // Current PRD execution state
    score: NoCowboyScore,
    checkpoints: Vec<Checkpoint>,        // Git tag refs
}

/// On startup: detect project, resume or create session
/// On Ctrl+C: auto-save session
/// On /checkpoint: git tag + stash + session snapshot
/// On /restore: git checkout tag + load session snapshot
```

---

## 9. Permission System

```rust
/// Rule-based permission engine (ported from kilo.json)
struct PermissionEngine {
    rules: Vec<PermissionRule>,
}

struct PermissionRule {
    pattern: String,      // Glob or regex for tool/resource name
    action: Permission,   // Allow | Deny | Ask
}

enum Permission {
    Allow,
    Deny,
    Ask { reason: String },
}

impl PermissionEngine {
    fn check(&self, tool: &str, args: &Value) -> Permission {
        for rule in &self.rules {
            if rule.matches(tool) {
                return rule.action;
            }
        }
        Permission::Deny  // Default deny
    }
}
```

---

## 10. Crate Dependencies

```toml
[package]
name = "nocowboy-tui"
version = "0.1.0"
edition = "2024"

[dependencies]
# TUI
ratatui = "0.30"
crossterm = "0.28"
tui-textarea = "0.7"

# Async runtime
tokio = { version = "1", features = ["full"] }
tokio-util = "0.7"

# MCP client
rmcp = { version = "0.4", features = ["transport-streamable-http-client"] }

# HTTP client (LLM API calls)
reqwest = { version = "0.12", features = ["stream", "json"] }
reqwest-eventsource = "0.6"

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"
toml = "0.8"

# Markdown rendering
termimad = "0.31"
syntect = "5"           # Syntax highlighting

# Configuration
directories = "5"       # XDG paths
figment = "0.10"        # Config loading

# Plugin system
wasmtime = "29"

# Vector search
lancedb = "0.17"

# Logging
tracing = "0.1"
tracing-subscriber = "0.3"

# Error handling
thiserror = "2"
anyhow = "1"

# Utilities
chrono = "0.4"
uuid = { version = "1", features = ["v4"] }
regex = "1"
glob = "0.3"

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
```

---

## 11. Configuration File

```toml
# nocowboy.toml (project root)
[core]
project_name = "my-project"

[agents]
default = "ralph"
prompt_dir = "~/.config/nocowboy/agents"

[mcp]
# HTTP endpoints for MCP servers
[mcp.servers.context7]
url = "http://127.0.0.1:8200/mcp"
enabled = true

[mcp.servers.tausik]
url = "http://127.0.0.1:8204/mcp"
enabled = true

[mcp.servers.ralph]
transport = "stdio"
command = "npx"
args = ["tsx", "~/.config/kilo/mcp-servers/ralph/src/index.ts"]

[llm]
provider = "deepseek"
model = "deepseek-v4-pro"
api_key_env = "DEEPSEEK_API_KEY"

[permission]
"*" = "allow"
"bash.sudo_rm" = "ask"

[score]
constitution_rules = "~/.config/nocowboy/constitution.toml"

[tui]
theme = "nocowboy-dark"
left_panel_width = 18
context_panel_width = 30
```

---

## 12. Build & Distribution

```
Build:
  cargo build --release → single ~15MB binary

Install:
  curl -fsSL https://nocowboy.sh/install | bash
  # or
  cargo install nocowboy-tui

Run:
  nocowboy                    # start TUI in current directory
  nocowboy /path/to/project   # start TUI in specific project
  nocowboy --server           # start headless MCP server (for IDE plugins)
  nocowboy resume             # resume last session

Distribution:
  - Static binary for Linux (musl), macOS, Windows
  - Homebrew tap (macOS)
  - AUR package (Arch Linux)
  - Docker image (CI/CD mode)
```

---

## 13. ISO 25010 Evaluation

| Dimension | Risk | Notes |
|-----------|------|-------|
| **Functional Suitability** | ⚠️ Medium | Full agent loop must work end-to-end. MCP integration is proven (rmcp). LLM streaming is well-understood. |
| **Reliability** | ⚠️ Medium | MCP servers are separate processes — TUI must gracefully handle server restarts. Session auto-save on crash. |
| **Performance Efficiency** | ✅ Low | Rust binary, immediate-mode rendering. Sub-millisecond frame times. tokio handles parallel MCP calls. |
| **Usability** | ⚠️ Medium | Custom interaction model requires careful design. Keyboard shortcuts must be discoverable. |
| **Security** | ✅ Low | Permission engine inherited from kilo.json. Plugins sandboxed in Wasmtime. MCP servers run as separate users. |
| **Compatibility** | ✅ Low | MCP protocol is standard. LLM providers use OpenAI-compatible API. |
| **Maintainability** | ⚠️ Medium | Rust codebase is modular but requires Rust expertise. Plugin system adds complexity. |
| **Portability** | ✅ Low | Single binary. Crossterm is cross-platform. Ratatui supports all major terminals. |

---

## 14. Edge Case Stress Testing

| Case | Handling |
|------|----------|
| **MCP server down** | TUI shows "⚠️ MCP: tausik disconnected". Tool calls to that server return error. Reconnect on next attempt. |
| **LLM stream interrupted** | Partial response shown in chat. Retry button or "Continue" sends partial context. |
| **Terminal resize** | Ratatui re-renders layout on Resize event. Scroll positions preserved. |
| **Very long message** | Chat panel scrolls with cursor. Virtual scrolling for history. |
| **Concurrent tool calls** | tokio spawns each call as separate task. Results interleaved in chat. |
| **10,000 message history** | Messages paged to disk. Only last 200 in memory. Older loaded on scroll. |
| **Plugin crash** | Wasmtime trap caught. Plugin disabled. TUI continues. |
| **Session file corruption** | Fall back to git log for recovery. Fresh session if unrecoverable. |
| **Unicode/emoji in messages** | Ratatui + crossterm handle Unicode. Emoji width calculation (double-width). |

---

## 15. Verification Checklist

### Phase 1 — Scaffold
- [ ] `cargo init nocowboy-tui` compiles
- [ ] Ratatui renders "Hello NoCowboy" in terminal
- [ ] crossterm raw mode + event loop reads keystrokes
- [ ] Basic layout: header, chat, input, status bar

### Phase 2 — MCP Integration
- [ ] rmcp connects to all 7 MCP servers
- [ ] Tool registry aggregates all tools
- [ ] Can call `ralph_load_prd()` and see result in TUI
- [ ] Can call `git_git_status()` and render output

### Phase 3 — LLM Integration
- [ ] Streaming chat with DeepSeek (token-by-token render)
- [ ] Tool call parsing from stream
- [ ] Agent prompt injection
- [ ] Multi-turn conversation

### Phase 4 — Agent System
- [ ] Load agent prompts from `~/.config/kilo/.kilo/agents/`
- [ ] Switch agents at runtime
- [ ] PRD-driven workflow: load PRD → iterate stories

### Phase 5 — Full Features
- [ ] NoCowboy Score computation and display
- [ ] Session save/resume
- [ ] Checkpoint/restore via git
- [ ] Plugin system (at least widget plugins)
- [ ] Semantic search via LanceDB

---

## 16. Migration Path

```
Current State:                  Target State:
┌──────────────────┐           ┌──────────────────┐
│ Kilo Code TUI    │           │ NoCowboy TUI     │
│ (Go binary)      │           │ (Rust binary)    │
│                  │           │                  │
│ Uses:            │    ──▶    │ Uses:            │
│  - kilo.json     │           │  - nocowboy.toml │
│  - MCP servers   │           │  - MCP servers   │
│  - Agent prompts │           │  - Agent prompts │
│  - Instructions  │           │  - Instructions  │
└──────────────────┘           └──────────────────┘

Shared infrastructure (unchanged):
  ✅ MCP servers (ports 8200-8205, ralph stdio)
  ✅ Agent prompts (~/.config/kilo/.kilo/agents/)
  ✅ Instructions (~/.config/kilo/instructions/)
  ✅ PRD files (docs/*.md)
  ✅ Ralph state (.ralph/state.json)

Migration: incremental, not cutover.
  - Both TUIs can coexist (different binaries)
  - Same MCP servers serve both
  - Agent prompts are format-compatible
```

---

*Analysis compiled from: Kilo Code v7.3.45 infrastructure, rmcp v0.4 SDK, Ratatui v0.30, LanceDB Rust client, tokio ecosystem, and NoCowboy strategic requirements.*
