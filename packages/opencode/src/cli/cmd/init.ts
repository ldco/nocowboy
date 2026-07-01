import { cmd } from "./cmd"
import * as prompts from "@clack/prompts"
import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"
import { ConfigMCP } from "@/config/mcp"
import { McpLifecycle } from "@/nocowboy/mcp/lifecycle"
import { Launcher } from "@/nocowboy/mcp/launcher"

// nocowboy_change — first-run global setup wizard
const configDir = path.join(os.homedir(), ".config", "nocowboy")
const configPath = path.join(configDir, "nocowboy.json")

function configExists(): boolean {
  return fs.existsSync(configPath)
}

export const InitCommand = cmd({
  command: "init",
  describe: "first-run setup — configure NoCowboy globally (system-wide)",
  builder: (yargs: any) => yargs,
  async handler() {
    if (configExists()) {
      const overwrite = await prompts.confirm({
        message: "Configuration exists. Overwrite?",
        initialValue: false,
      })
      if (!overwrite) {
        prompts.log.info(`Config at ${configPath} — edit manually or run 'nocowboy init' again.`)
        return
      }
    }

    prompts.intro("NoCowboy — global setup")

    // 1. Provider
    const provider = await prompts.select({
      message: "Default LLM provider?",
      options: [
        { label: "Local (Ollama)", value: "ollama", hint: "free, private, offline" },
        { label: "Anthropic", value: "anthropic", hint: "Claude models" },
        { label: "OpenAI", value: "openai", hint: "GPT models" },
        { label: "DeepSeek", value: "deepseek", hint: "cheapest code agent" },
        { label: "OpenRouter", value: "openrouter", hint: "200+ models, one key" },
        { label: "None — offline only", value: "none", hint: "MCP + repomap + indexing work without LLM" },
      ],
    }) as string

    // 2. Start MCP servers
    const startMcp = await prompts.confirm({
      message: "Start MCP servers for codebase intelligence? (recommended)",
      initialValue: true,
    })

    // 3. Indexing
    const enableIndexing = await prompts.confirm({
      message: "Enable codebase indexing for semantic search?",
      initialValue: true,
    })

    // Default MCP servers (first-party + third-party)
    const mcpServers: Record<string, Record<string, unknown>> = {}

    if (startMcp) {
      const N = ConfigMCP.VENDOR.NOCOWBOY
      const C = ConfigMCP.VENDOR.COMMUNITY

      const defaultNames = [
        "plugin-registry", "context7", "sqlite", "puppeteer",
        "tausik", "git", "puppetmaster", "ralph",
        "constitution", "ncp-validator", "contract-guard", "score-engine",
        "hooks",
      ]

      const defaultVendors: Record<string, string> = {
        "plugin-registry": N, "context7": C, "sqlite": C, "puppeteer": C,
        "tausik": N, "git": C, "puppetmaster": N, "ralph": N,
        "constitution": N, "ncp-validator": N, "contract-guard": N, "score-engine": N,
        "hooks": N,
      }

      for (let i = 0; i < defaultNames.length; i++) {
        const name = defaultNames[i]
        const port = 9200 + i
        mcpServers[name] = { type: "remote", vendor: defaultVendors[name], url: `http://127.0.0.1:${port}/mcp`, enabled: true }
      }
    }

    // Write global config
    const config: Record<string, unknown> = {
      lsp: true,
      indexing: enableIndexing ? {
        enabled: true,
        provider: "voyage",
        model: "voyage-code-3",
        vectorStore: "lancedb",
      } : { enabled: false },
      permission: {
        "*": "ask",
        read: "allow", glob: "allow", grep: "allow", semantic_search: "allow",
        bash: { "^(sudo\\s+)?rm\\s+-rf\\s+/": "ask", "^git\\s+push\\s+.*(--force|-f)": "ask", "*": "allow" },
        edit: "allow", mcp: "allow", skill: "allow",
      },
      mcp: mcpServers,
    }
    if (provider !== "none") config["provider"] = { [provider]: { enabled: true } }

    fs.mkdirSync(configDir, { recursive: true })
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n")

    prompts.log.success(`Configuration → ${configPath}`)

    if (startMcp) {
      prompts.log.info("Starting MCP servers...")
      const names = Object.keys(mcpServers)
      let started = 0
      for (let i = 0; i < names.length; i++) {
        const name = names[i]
        const cmd = await Launcher.command(name).catch(() => null)
        if (!cmd) {
          prompts.log.warn(`  ${name} — no launch command, install via:  npm install -g @nocowboy/mcp-${name}`)
          continue
        }
        const port = 9200 + i
        try {
          const r = await McpLifecycle.startOne(name, cmd, port)
          if (r.running) {
            prompts.log.info(`  ✓ ${name} — ${r.url}`)
            started++
          } else {
            prompts.log.warn(`  ○ ${name} — failed to start`)
          }
        } catch {
          prompts.log.warn(`  × ${name} — error starting`)
        }
      }
      if (started > 0) {
        const totalMcpMsg = started === names.length ? `All MCP servers started` : `${started}/${names.length} MCP servers started`
        prompts.log.success(totalMcpMsg)
      }
    }

    prompts.outro("Ready. Run `nocowboy` to start coding.")
  },
})
