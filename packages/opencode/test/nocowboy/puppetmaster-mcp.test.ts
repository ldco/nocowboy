import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { configTools } from "../../../../packaging/mcp-servers/puppetmaster/src/tools/config"
import { knowledgeTools } from "../../../../packaging/mcp-servers/puppetmaster/src/tools/knowledge"
import { statusTool } from "../../../../packaging/mcp-servers/puppetmaster/src/tools/status"
import { initTool } from "../../../../packaging/mcp-servers/puppetmaster/src/tools/init"
import { loadConfig } from "../../../../packaging/mcp-servers/puppetmaster/src/tools/utils"

const CONFIG = `export type PmMode = 'unconfigured' | 'build' | 'develop'

export interface PmConfig {
  mode: PmMode
  site: { name: string; defaultLocale: string }
}

export const PM_CONFIG = {
  mode: 'build',
  site: {
    name: 'Fixture',
    url: 'https://example.test',
    defaultLocale: 'ru',
    locales: [{ code: 'ru', iso: 'ru-RU', name: 'Русский' }],
    themeSource: 'src/project/theme.css',
    defaultTheme: 'system'
  },
  storage: { provider: 'local', publicUrlEnv: 'S3_PUBLIC_URL', localDir: 'data/uploads' },
  mail: { transport: 'smtp', fromEnv: 'SMTP_FROM' },
  admin: { masterEmailEnv: 'PM_ADMIN_MASTER_EMAIL', twoFactor: true },
  security: { requiredEnv: ['TOTP_ENCRYPTION_KEY'] }
}
`

const MANIFEST = `export const MODULE_MANIFEST = [
  { id: 'faq', labelKey: 'admin.faq', group: 'website', menu: true, roles: ['master'], defaultEnabled: true, moduleId: 'faq', moduleEnabled: true, config: { layout: 'accordion' } },
  { id: 'team', labelKey: 'admin.team', group: 'website', menu: false, roles: ['master'], defaultEnabled: false, moduleId: 'team', moduleEnabled: false },
  { id: 'users', labelKey: 'admin.users', group: 'system', menu: true, roles: ['master'], defaultEnabled: true }
]
`

let root = ""
const previous = process.env["PM_PROJECT_ROOT"]

function tool(list: typeof configTools, name: string) {
  const found = list.find((item) => item.name === name)
  if (!found) throw new Error(`missing tool ${name}`)
  return found
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "pm4-mcp-"))
  mkdirSync(join(root, "src/project"), { recursive: true })
  mkdirSync(join(root, "src/lib/config"), { recursive: true })
  writeFileSync(join(root, "src/project/pm.config.ts"), CONFIG)
  writeFileSync(join(root, "src/lib/config/modules.ts"), MANIFEST)
  process.env["PM_PROJECT_ROOT"] = root
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
  if (previous === undefined) delete process.env["PM_PROJECT_ROOT"]
  else process.env["PM_PROJECT_ROOT"] = previous
})

describe("pm_config", () => {
  test("reads typed PM_CONFIG and the module manifest", async () => {
    const get = tool(configTools, "pm_config_get")
    expect(await get.handler({ key: "mode" })).toBe("build")

    const all = JSON.parse(await get.handler({})) as {
      config: { site: { name: string } }
      modules: Record<string, { enabled: boolean; config: Record<string, unknown> }>
      moduleManifest: Array<{ id: string }>
    }
    expect(all.config.site.name).toBe("Fixture")
    expect(all.modules["faq"]).toEqual({ enabled: true, config: { layout: "accordion" } })
    expect(all.modules["team"]?.enabled).toBe(false)
    expect(all.modules["users"]).toBeUndefined()
    expect(all.moduleManifest.map((entry) => entry.id)).toEqual(["faq", "team", "users"])
  })

  test("reads nested keys under config. and modules.", async () => {
    const get = tool(configTools, "pm_config_get")
    expect(await get.handler({ key: "config.site.defaultLocale" })).toBe("ru")
    expect(await get.handler({ key: "modules.team" })).toBe(JSON.stringify({ enabled: false, config: {} }, null, 2))
    expect(await get.handler({ key: "site.defaultLocale" })).toBe("ru")
    expect(await get.handler({ key: "modules.nope" })).toContain('Key "modules.nope" not found')
  })

  test("writes a unique scalar inside PM_CONFIG and never touches the type declarations", async () => {
    const set = tool(configTools, "pm_config_set")
    expect(await set.handler({ key: "mode", value: "develop" })).toContain("Set mode")

    const text = readFileSync(join(root, "src/project/pm.config.ts"), "utf-8")
    expect(text).toContain("mode: 'develop'")
    expect(text).toContain("mode: PmMode")
    expect(await loadConfig(root).then((project) => project?.config["mode"])).toBe("develop")
  })

  test("writes a nested scalar", async () => {
    const set = tool(configTools, "pm_config_set")
    expect(await set.handler({ key: "site.defaultLocale", value: "en" })).toContain("site.defaultLocale")
    expect(readFileSync(join(root, "src/project/pm.config.ts"), "utf-8")).toContain("defaultLocale: 'en'")
  })

  test("refuses an ambiguous key instead of corrupting the config", async () => {
    const set = tool(configTools, "pm_config_set")
    const result = await set.handler({ key: "site.name", value: "Renamed" })
    expect(result).toContain("refusing an ambiguous rewrite")
    expect(readFileSync(join(root, "src/project/pm.config.ts"), "utf-8")).toBe(CONFIG)
  })

  test("toggles both module gates together and reloads without the ESM cache", async () => {
    const set = tool(configTools, "pm_config_set")
    expect(await set.handler({ key: "modules.team.enabled", value: true })).toContain("src/lib/config/modules.ts")

    const teamLine = readFileSync(join(root, "src/lib/config/modules.ts"), "utf-8")
      .split("\n")
      .find((line) => line.includes("id: 'team'"))
    expect(teamLine).toContain("moduleEnabled: true")
    expect(teamLine).toContain("defaultEnabled: true")
    expect(teamLine).not.toContain("moduleEnabled: false")

    const project = await loadConfig(root)
    const team = project?.modules.find((module) => module.moduleId === "team")
    expect(team?.moduleEnabled).toBe(true)
    expect(team?.defaultEnabled).toBe(true)
  })

  test("rejects a non-boolean module flag", async () => {
    const set = tool(configTools, "pm_config_set")
    expect(await set.handler({ key: "modules.team.enabled", value: "yes" })).toContain("expects true or false")
  })

  test("rejects an admin page id instead of silently changing its admin flag", async () => {
    const set = tool(configTools, "pm_config_set")
    const result = await set.handler({ key: "modules.users.enabled", value: false })
    expect(result).toContain("admin page, not a website module")
    expect(readFileSync(join(root, "src/lib/config/modules.ts"), "utf-8")).toBe(MANIFEST)
  })

  test("rewrites an existing literal that contains a comma", async () => {
    const set = tool(configTools, "pm_config_set")
    expect(await set.handler({ key: "site.url", value: "https://x,y" })).toContain("Set site.url")
    expect(await set.handler({ key: "site.url", value: "https://new.example" })).toContain("Set site.url")

    const project = await loadConfig(root)
    expect((project?.config.site as { url: string }).url).toBe("https://new.example")
    expect(readdirSync(join(root, "src/project")).some((file) => file.endsWith(".tmp.ts"))).toBe(false)
  })

  test("rejects a module toggle when there is no manifest", async () => {
    rmSync(join(root, "src/lib/config/modules.ts"))
    const set = tool(configTools, "pm_config_set")
    const result = await set.handler({ key: "modules.faq.enabled", value: false })
    expect(result).toContain("No src/lib/config/modules.ts")
    expect(result).not.toContain("ENOENT")
  })

  test("refuses arrays/objects instead of half-rewriting a typed literal", async () => {
    const set = tool(configTools, "pm_config_set")
    for (const value of [["en"], { ru: "ru-RU" }, null]) {
      const result = await set.handler({ key: "site.locales", value })
      expect(result).toContain("Only scalar values")
    }
    expect(readFileSync(join(root, "src/project/pm.config.ts"), "utf-8")).toBe(CONFIG)
  })

  test("writes regex replacement patterns literally", async () => {
    const set = tool(configTools, "pm_config_set")
    expect(await set.handler({ key: "site.defaultTheme", value: "a$&b$'c" })).toContain("site.defaultTheme")

    const text = readFileSync(join(root, "src/project/pm.config.ts"), "utf-8")
    expect(text).toContain("a$&b$")
    expect(text).not.toContain("defaultTheme: 'system'")
    const project = await loadConfig(root)
    expect((project?.config.site as { defaultTheme: string }).defaultTheme).toBe("a$&b$'c")
  })

  test("reports a missing PM4 config instead of the legacy path", async () => {
    rmSync(join(root, "src/project/pm.config.ts"))
    const get = tool(configTools, "pm_config_get")
    const result = await get.handler({})
    expect(result).toContain("src/project/pm.config.ts")
    expect(result).not.toContain("project/puppet-master.config.ts")
  })
})

describe("pm_status / pm_init", () => {
  test("reports PM4 mode, manifest modules and the Vite port", async () => {
    const status = JSON.parse(await statusTool.handler({ detail: "summary" })) as {
      mode: string
      configPath: string
      modules: Record<string, { enabled: boolean }>
      devServer: { port: number }
    }
    expect(status.mode).toBe("build")
    expect(status.configPath).toBe("src/project/pm.config.ts")
    expect(status.modules["faq"]?.enabled).toBe(true)
    expect(status.devServer.port).toBe(5173)
  })

  test("pm_init checks SvelteKit dependencies, not Nuxt", async () => {
    const result = await initTool.handler({ mode: "auto" })
    expect(result).toContain("Dependencies missing. Run: npm install")
    expect(result).not.toContain("nuxt")
  })
})

describe("pm_knowledge / pm_inject_context", () => {
  test("rules describe PM4 and never the v3 config path", async () => {
    const knowledge = tool(knowledgeTools, "pm_knowledge") as (typeof knowledgeTools)[number]
    const result = await knowledge.handler({ topic: "rules" })
    expect(result).toContain("ModuleManifest")
    expect(result).toContain("src/lib/config/modules.ts")
    expect(result).not.toContain("project/puppet-master.config.ts")
    expect(result).not.toContain("PM v3 RULES")
    expect(result).toContain("validate:pm4")
    expect(result).not.toContain("validate:pm3")
    expect(result).not.toContain("pm-v3")
  })

  test("database topic describes async libSQL, not 'SQLite as in v2'", async () => {
    const knowledge = tool(knowledgeTools, "pm_knowledge") as (typeof knowledgeTools)[number]
    const result = await knowledge.handler({ topic: "database" })
    expect(result).toContain("@libsql/client")
    expect(result).toContain("39 framework tables")
    expect(result).not.toContain("same as PM v2")
    expect(result).not.toContain("page/CMS")
  })

  test("injects PM4 rules plus the typed module state", async () => {
    const inject = tool(knowledgeTools, "pm_inject_context") as (typeof knowledgeTools)[number]
    const result = await inject.handler({ projectDir: root })
    expect(result).toContain("PM4 PROJECT")
    expect(result).toContain("MODULES: faq=ON, team=OFF")
    expect(result).toContain("PROJECT: Fixture mode=build")
    expect(result).toContain("validate:pm4")
    expect(result).not.toContain("validate:pm3")
    expect(result).not.toContain("PM v3")
    expect(result).not.toContain("pm-v3")
  })

  test("injects nothing for a non-PM4 directory", async () => {
    const inject = tool(knowledgeTools, "pm_inject_context") as (typeof knowledgeTools)[number]
    expect(await inject.handler({ projectDir: join(root, "missing") })).toBe("")
  })
})
