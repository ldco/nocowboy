import { describe, expect, test } from "bun:test"
import { detect, isBuiltin, load, loadDefault } from "../../../src/cli/registry"

describe("registry.detect", () => {
  test("finds the first positional token", () => {
    expect(detect(["serve"])).toBe("serve")
    expect(detect(["debug", "agent", "build"])).toBe("debug")
    expect(detect(["roll-call", "gpt"])).toBe("roll-call")
  })

  test("skips boolean global flags", () => {
    expect(detect(["--pure", "models", "anthropic"])).toBe("models")
    expect(detect(["--print-logs", "serve"])).toBe("serve")
  })

  test("skips the value of a global flag that takes one", () => {
    expect(detect(["--log-level", "DEBUG", "serve"])).toBe("serve")
    expect(detect(["--log-level=DEBUG", "serve"])).toBe("serve")
  })

  test("does not mistake a TUI option value for a command", () => {
    // The TUI is the `$0` command, so `nocowboy --prompt run` must stay the TUI and not become
    // `nocowboy run`.
    expect(detect(["--prompt", "run"])).toBeUndefined()
    expect(detect(["-m", "anthropic/claude", "--prompt", "serve"])).toBeUndefined()
    expect(detect(["-s", "ses_123"])).toBeUndefined()
  })

  test("returns undefined when there is no command", () => {
    expect(detect([])).toBeUndefined()
    expect(detect(["--version"])).toBeUndefined()
    expect(detect(["--help"])).toBeUndefined()
  })

  test("honours the end-of-options marker", () => {
    expect(detect(["--", "serve"])).toBe("serve")
  })
})

describe("registry.load", () => {
  test("resolves a known command to a yargs module", async () => {
    const module = await load("serve")
    expect(module?.command).toBe("serve")
  })

  test("returns undefined for an unknown command", async () => {
    expect(await load("definitely-not-a-command")).toBeUndefined()
  })

  test("the default command is the TUI thread", async () => {
    const module = await loadDefault()
    expect(module.command).toBe("$0 [project]")
  })

  test("yargs built-ins are not treated as loadable modules", async () => {
    expect(isBuiltin("completion")).toBe(true)
    expect(isBuiltin("serve")).toBe(false)
    expect(await load("completion")).toBeUndefined()
  })

  test("aliases resolve to their command", async () => {
    expect((await load("providers"))?.command).toBe("auth")
    expect((await load("plug"))?.command).toBe("plugin <module>")
  })

  test("command string, aliases and description match the real modules", async () => {
    // The registry duplicates this metadata so `--help` can print the command list without
    // importing every command. This test is what keeps the copy honest.
    const registry = await import("../../../src/cli/registry")
    for (const entry of registry.entries()) {
      const module = await entry.load()
      expect(module.command).toBe(entry.command)
      expect(module.aliases ?? []).toEqual(entry.aliases ?? [])
      if (entry.describe !== undefined) expect(module.describe).toBe(entry.describe)
    }
  }, 60000)
})
