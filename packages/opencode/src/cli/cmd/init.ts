import { cmd } from "./cmd"
import * as prompts from "@clack/prompts"
import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"

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
      mcp: {},
    }
    if (provider !== "none") config["provider"] = { [provider]: { enabled: true } }

    fs.mkdirSync(configDir, { recursive: true })
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n")

    prompts.log.success(`Configuration → ${configPath}`)

    if (startMcp) {
      prompts.log.info("Run: nocowboy mcp start")
    }

    prompts.outro("Ready. Run `nocowboy` to start coding.")
  },
})
