import { afterEach, describe, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { PuppetMaster } from "../../src/nocowboy/puppetmaster"

const dirs: string[] = []

function project(): string {
  const dir = mkdtempSync(join(tmpdir(), "pm-detect-"))
  dirs.push(dir)
  return dir
}

function write(root: string, file: string, content: string) {
  const target = join(root, file)
  mkdirSync(join(target, ".."), { recursive: true })
  writeFileSync(target, content)
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe("PuppetMaster.isProject", () => {
  test("detects the PM4 typed config marker", () => {
    const root = project()
    write(root, "src/project/pm.config.ts", "export const PM_CONFIG = {}")
    expect(PuppetMaster.isProject(root)).toBe(true)
  })

  test("detects the PM4 ModuleManifest marker", () => {
    const root = project()
    write(root, "src/lib/config/modules.ts", "export const MODULE_MANIFEST = []")
    expect(PuppetMaster.isProject(root)).toBe(true)
  })

  test("detects the puppetmaster-4 package name", () => {
    const root = project()
    write(root, "package.json", JSON.stringify({ name: "puppetmaster-4" }))
    expect(PuppetMaster.isProject(root)).toBe(true)
  })

  test("rejects the deleted v2/v3 config path", () => {
    const root = project()
    write(root, "project/puppet-master.config.ts", "export default {}")
    expect(PuppetMaster.isProject(root)).toBe(false)
  })

  test("rejects an unrelated project and a malformed package.json", () => {
    const empty = project()
    expect(PuppetMaster.isProject(empty)).toBe(false)

    const broken = project()
    write(broken, "package.json", "{not json")
    expect(PuppetMaster.isProject(broken)).toBe(false)

    const unrelated = project()
    write(unrelated, "package.json", JSON.stringify({ name: "puppetmaster-3" }))
    expect(PuppetMaster.isProject(unrelated)).toBe(false)
  })
})

describe("PuppetMaster.contextText", () => {
  test("joins text parts and ignores non-text content", () => {
    expect(
      PuppetMaster.contextText({
        content: [
          { type: "text", text: "PM4 rules" },
          { type: "image" },
          { type: "text", text: "MODULES: faq=ON" },
        ],
      }),
    ).toBe("PM4 rules\nMODULES: faq=ON")
  })

  test("returns an empty string for missing content", () => {
    expect(PuppetMaster.contextText(undefined)).toBe("")
    expect(PuppetMaster.contextText({})).toBe("")
    expect(PuppetMaster.contextText({ content: [{ type: "image" }] })).toBe("")
  })
})

describe("PuppetMaster.promptBlock", () => {
  const content = { content: [{ type: "text", text: "PM4 RULES" }] }

  test("renders the block only for a connected server", () => {
    expect(PuppetMaster.promptBlock("connected", content)).toBe("## PuppetMaster 4 Project Context\n\nPM4 RULES")
    expect(PuppetMaster.promptBlock("disabled", content)).toBeUndefined()
    expect(PuppetMaster.promptBlock("failed", content)).toBeUndefined()
    expect(PuppetMaster.promptBlock(undefined, content)).toBeUndefined()
  })

  test("omits the header when the server returns no text", () => {
    expect(PuppetMaster.promptBlock("connected", { content: [] })).toBeUndefined()
    expect(PuppetMaster.promptBlock("connected", undefined)).toBeUndefined()
  })
})
