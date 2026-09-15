import { describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { accessSync, chmodSync, constants } from "fs"
import path from "path"
import { DbPreflight } from "@nocowboy/core/nocowboy/db-preflight"
import { tmpdir } from "../fixture/tmpdir"

const writable = (file: string) => {
  try {
    accessSync(file, constants.W_OK)
    return true
  } catch {
    return false
  }
}

// Windows: chmod is a no-op; root ignores permission bits
const skip = process.platform === "win32" || process.getuid?.() === 0

function createWalDb(file: string) {
  const db = new Database(file)
  db.run("PRAGMA journal_mode = WAL")
  db.run("CREATE TABLE t (x)")
  db.run("INSERT INTO t VALUES (1)")
  db.close()
}

// leaves committed-but-uncheckpointed frames in the WAL by SIGKILLing the writer
async function createWalDbWithPendingFrames(file: string) {
  const script = [
    `const { Database } = require("bun:sqlite")`,
    `const db = new Database(${JSON.stringify(file)})`,
    `db.run("PRAGMA journal_mode = WAL")`,
    `db.run("PRAGMA wal_autocheckpoint = 0")`,
    `db.run("CREATE TABLE t (x)")`,
    `db.run("INSERT INTO t VALUES (1)")`,
    `console.log("ready")`,
    `setInterval(() => {}, 1000)`,
  ].join("\n")
  const child = Bun.spawn([process.execPath, "-e", script], { stdout: "pipe" })
  const reader = child.stdout.getReader()
  await reader.read()
  child.kill("SIGKILL")
  await child.exited
}

describe("DbPreflight (T0.8 batch)", () => {
  test("skips in-memory databases", () => {
    expect(() => DbPreflight.assertWritable(":memory:")).not.toThrow()
  })

  test("accepts a writable database", async () => {
    await using tmp = await tmpdir()
    const file = path.join(tmp.path, "nocowboy.db")
    createWalDb(file)
    expect(() => DbPreflight.assertWritable(file)).not.toThrow()
  })

  test("names the offending file for a read-only sidecar outside the data dir", async () => {
    if (skip) return
    await using tmp = await tmpdir()
    const file = path.join(tmp.path, "nocowboy.db")
    await createWalDbWithPendingFrames(file)
    chmodSync(`${file}-wal`, 0o444)
    expect(() => DbPreflight.assertWritable(file)).toThrow(`Database file is not writable: ${file}-wal`)
    chmodSync(`${file}-wal`, 0o644)
  })

  test("repairs a read-only database file it owns", async () => {
    if (skip) return
    await using tmp = await tmpdir()
    const file = path.join(tmp.path, "nocowboy.db")
    createWalDb(file)
    chmodSync(file, 0o444)
    // trusted dir === dirname(file), so the preflight may chmod it back
    expect(() => DbPreflight.assertWritable(file, tmp.path)).not.toThrow()
    expect(writable(file)).toBe(true)
  })

  test("reports a non-writable directory when sidecars are missing", async () => {
    if (skip) return
    await using tmp = await tmpdir()
    const dir = path.join(tmp.path, "readonly")
    const file = path.join(dir, "nocowboy.db")
    await Bun.write(path.join(file), "")
    await chmodSync(dir, 0o555)
    try {
      expect(() => DbPreflight.assertWritable(file, path.join(tmp.path, "other"))).toThrow(
        `Database directory is not writable: ${dir}`,
      )
    } finally {
      chmodSync(dir, 0o755)
    }
  })
})
