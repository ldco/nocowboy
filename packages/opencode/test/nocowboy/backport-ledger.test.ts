import { describe, expect, it, test } from "bun:test"
import { readFileSync } from "fs"
import path from "path"
import {
  BACKPORT_LEDGER_SCHEMA_VERSION,
  duplicateUpstreamShas,
  validateBackportLedger,
  type BackportLedger,
} from "@/nocowboy/backport/ledger"

const entry = (over: Partial<BackportLedger["entries"][number]> = {}): BackportLedger["entries"][number] => ({
  id: "T0.1",
  upstream_shas: ["bf7848cb48"],
  need: "reviewer result was empty",
  contracts: ["packages/opencode/src/tool/task.ts"],
  adaptation: "92e1ecd83f",
  verify: "bun test test/tool/task.test.ts",
  status: "done",
  ...over,
})

const ledger = (entries: BackportLedger["entries"]): BackportLedger => ({
  schemaVersion: BACKPORT_LEDGER_SCHEMA_VERSION,
  entries,
})

describe("validateBackportLedger", () => {
  test("accepts a complete ledger", () => {
    expect(validateBackportLedger(ledger([entry()]))).toEqual([])
  })

  test("rejects a wrong schema version and an empty ledger", () => {
    expect(validateBackportLedger({ schemaVersion: 2, entries: [entry()] }).join(" ")).toContain("schemaVersion")
    expect(validateBackportLedger(ledger([])).join(" ")).toContain("non-empty")
  })

  test("requires the five-part record per entry", () => {
    const problems = validateBackportLedger(
      ledger([{ id: "x", upstream_shas: ["abc"], need: "", contracts: [], adaptation: "", verify: "", status: "done" }]),
    )
    const joined = problems.join(" ")
    expect(joined).toContain("missing need")
    expect(joined).toContain("missing contracts")
    expect(joined).toContain("missing adaptation")
    expect(joined).toContain("missing verify")
  })

  test("rejects an invalid status", () => {
    expect(validateBackportLedger(ledger([entry({ status: "shipped" as never })])).join(" ")).toContain("invalid status")
  })

  test("a done port must name its upstream SHAs", () => {
    expect(validateBackportLedger(ledger([entry({ upstream_shas: [] })])).join(" ")).toContain("must record upstream_shas")
  })

  test("a duplicated upstream SHA is a violation (a port is recorded once)", () => {
    const problems = validateBackportLedger(ledger([entry({ id: "a" }), entry({ id: "b" })]))
    expect(problems.join(" ")).toContain("duplicate upstream SHA bf7848cb48")
  })

  test("a duplicated entry id is a violation", () => {
    const problems = validateBackportLedger(
      ledger([entry({ id: "dup" }), entry({ id: "dup", upstream_shas: ["ffffffff"] })]),
    )
    expect(problems.join(" ")).toContain("duplicate entry id")
  })

  test("sentinels (local/none) are not treated as backport SHAs", () => {
    const problems = validateBackportLedger(
      ledger([entry({ id: "a", upstream_shas: ["none"] }), entry({ id: "b", upstream_shas: ["local"] })]),
    )
    expect(problems).toEqual([])
  })
})

describe("duplicateUpstreamShas", () => {
  test("reports the shared SHA and the entries that use it", () => {
    const dup = duplicateUpstreamShas(ledger([entry({ id: "a" }), entry({ id: "b" }), entry({ id: "c", upstream_shas: ["cafe"] })]))
    expect(dup).toEqual([{ sha: "bf7848cb48", ids: ["a", "b"] }])
  })
})

describe("committed backport-ledger.json", () => {
  const root = path.resolve(import.meta.dir, "../../../..")
  const committed = JSON.parse(readFileSync(path.join(root, "backport-ledger.json"), "utf-8")) as BackportLedger

  test("the committed ledger is valid", () => {
    expect(validateBackportLedger(committed)).toEqual([])
  })

  it("--check passes against the committed ledger", () => {
    const result = Bun.spawnSync(["bun", "run", "scripts/backport-ledger.ts", "--check"], { cwd: root })
    expect(result.exitCode).toBe(0)
  })
})
