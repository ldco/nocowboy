import { cmd } from "./cmd"
import * as prompts from "@clack/prompts"
import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"

// nocowboy_change — zero-config setup wizard

function detectProjectType(dir: string): string[] {
  const langs: string[] = []
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8"))
    if (pkg.dependencies?.typescript || pkg.devDependencies?.typescript) langs.push("typescript")
    if (pkg.dependencies?.react || pkg.devDependencies?.react) langs.push("react")
    if (pkg.dependencies?.vue || pkg.devDependencies?.vue) langs.push("vue")
    if (pkg.dependencies?.next || pkg.devDependencies?.next) langs.push("next")
    if (pkg.dependencies?.nuxt || pkg.devDependencies?.nuxt) langs.push("nuxt")
  } catch {}
  
  if (fs.existsSync(path.join(dir, "go.mod"))) langs.push("go")
  if (fs.existsSync(path.join(dir, "Cargo.toml"))) langs.push("rust")
  if (fs.existsSync(path.join(dir, "requirements.txt")) || fs.existsSync(path.join(dir, "pyproject.toml"))) langs.push("python")
  if (fs.existsSync(path.join(dir, "pom.xml")) || fs.existsSync(path.join(dir, "build.gradle"))) langs.push("java")
  
  return langs.length ? langs : ["typescript"]
}

function detectEditor(): string {
  if (process.env.VSCODE_PID || process.env.TERM_PROGRAM === "vscode") return "vscode"
  if (process.env.JETBRAINS_IDE) return "jetbrains"
  return "tui"
}

export const InitCommand = cmd({
  command: "init",
  describe: "first-run setup wizard — configure NoCowboy in 3 questions",
  builder: (yargs: any) => yargs.option("dir", { type: "string" }),
  async handler(args: any) {
    prompts.intro("NoCowboy — first-run setup")
    
    const dir = args.dir || process.cwd()
    const home = os.homedir()
    const configPath = path.join(home, ".config", "nocowboy", "nocowboy.json")
    
    // 1. Detect project
    const projectType = detectProjectType(dir)
    
    // 2. Provider
    const provider = await prompts.select({
      message: "Which LLM provider?",
      options: [
        { label: "Local (Ollama)", value: "ollama", hint: "free, private, works offline" },
        { label: "Anthropic", value: "anthropic", hint: "Claude models" },
        { label: "OpenAI", value: "openai", hint: "GPT models" },
        { label: "DeepSeek", value: "deepseek", hint: "cheapest, good for code" },
        { label: "OpenRouter", value: "openrouter", hint: "200+ models, one key" },
        { label: "None (offline only)", value: "none", hint: "repomap, git, MCP only" },
      ],
    }) as string
    
    // 3. Editor
    const editor = await prompts.select({
      message: "Primary editor?",
      options: [
        { label: "TUI (terminal)", value: "tui", hint: "recommended" },
        { label: "VS Code", value: "vscode" },
        { label: "JetBrains", value: "jetbrains" },
      ],
      initialValue: detectEditor() as any,
    }) as string
    
    // Write config
    const config = {
      $schema: "https://raw.githubusercontent.com/ldco/nocowboy/main/schema.json",
      provider: provider !== "none" ? { [provider]: { enabled: true } } : undefined,
      // Default permissions: safe defaults
      permission: {
        "*": "ask",
        "read": "allow",
        "glob": "allow",
        "grep": "allow",
        "semantic_search": "allow",
        "bash": {
          "^(sudo\\s+)?rm\\s+-rf\\s+/": "ask",
          "^git\\s+push\\s+.*(--force|-f)": "ask",
          "*": "allow",
        },
        "edit": "allow",
        "mcp": "allow",
        "skill": "allow",
      },
      lsp: true,
      indexing: {
        enabled: true,
        provider: "voyage",
        model: "voyage-code-3",
        vectorStore: "lancedb",
      },
      mcp: {},
    }

    fs.mkdirSync(path.dirname(configPath), { recursive: true })
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n")
    
    prompts.log.success(`Configuration written to ${configPath}`)
    prompts.log.info(`Detected project: ${projectType.join(", ")}`)
    prompts.log.info(`Provider: ${provider}`)
    prompts.log.info(`Editor: ${editor}`)
    
    if (provider !== "none") {
      const confirm = await prompts.confirm({
        message: "Start MCP servers for codebase analysis?",
        initialValue: true,
      })
      if (confirm) {
        prompts.log.info("Run: nocowboy mcp start")
      }
    }
    
    prompts.outro("Setup complete! Run `nocowboy` to start coding.")
  },
})
