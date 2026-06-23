import { describe, expect, test } from "bun:test"
import { NocowboyPtySelfCommand } from "../../src/nocowboy/pty/self-command"

describe("pty self-command", () => {
  test("does not forward bundled bun entrypoints", () => {
    const proc = {
      argv: ["/tmp/kilo", "/$bunfs/root/src/index.js"],
      execArgv: ["--user-agent=kilo/test", "--use-system-ca", "--"],
      execPath: "/tmp/kilo",
      cwd: "/tmp",
    }

    const cmd = NocowboyPtySelfCommand.command(proc)
    expect(cmd).toStrictEqual({ command: "/tmp/kilo", args: [] })
    expect(NocowboyPtySelfCommand.resolve({ command: "nocowboy", cwd: "/tmp/project" }, cmd)).toStrictEqual({
      command: "/tmp/kilo",
      args: [],
      cwd: "/tmp/project",
    })
    expect(
      NocowboyPtySelfCommand.command({
        ...proc,
        argv: ["C:/tmp/kilo.exe", "B:/~BUN/root/src/index.js"],
      }).args,
    ).toStrictEqual([])
    expect(
      NocowboyPtySelfCommand.command({
        ...proc,
        argv: ["C:/tmp/kilo.exe", "b:\\~BUN\\root\\src\\index.js"],
      }).args,
    ).toStrictEqual([])
  })

  test("forwards source entrypoints", () => {
    const cmd = NocowboyPtySelfCommand.command({
      argv: ["/tmp/bun", "/tmp/kilo/src/index.ts"],
      execArgv: ["--conditions=browser", "--cwd", "packages/opencode"],
      execPath: "/tmp/bun",
      cwd: "/tmp/kilo",
    })
    expect(cmd).toStrictEqual({
      command: "/tmp/bun",
      args: ["--conditions=browser", "/tmp/kilo/src/index.ts"],
      cwd: "/tmp/kilo",
    })
    expect(NocowboyPtySelfCommand.resolve({ command: "nocowboy", cwd: "/tmp/project" }, cmd)).toStrictEqual({
      command: "/tmp/bun",
      args: ["--conditions=browser", "/tmp/kilo/src/index.ts", "/tmp/project"],
      cwd: "/tmp/kilo",
    })
  })
})
