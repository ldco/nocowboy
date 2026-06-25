import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { getActiveOrg, resetOrgSource, setOrgSource } from "@/nocowboy/session-export/eligibility"

const env = process.env.NOCOWBOY_ORG_ID

describe("getActiveOrg", () => {
  beforeEach(() => {
    delete process.env.NOCOWBOY_ORG_ID
  })
  afterEach(() => {
    if (env === undefined) delete process.env.NOCOWBOY_ORG_ID
    else process.env.NOCOWBOY_ORG_ID = env
  })

  afterEach(() => {
    if (env === undefined) delete process.env.KILO_ORG_ID
    else process.env.KILO_ORG_ID = env
    resetOrgSource()
  })

  test("returns undefined when no signals are active", async () => {
    setOrgSource(async () => ({ type: "personal" }))
    expect(await getActiveOrg()).toEqual({ type: "personal" })
  })

  test("returns env value when KILO_ORG_ID is set", async () => {
    setOrgSource(async () => ({ type: "org", id: "org_auth" }))
    process.env.KILO_ORG_ID = undefined
    process.env.NOCOWBOY_ORG_ID = "org_env_var"
    expect(await getActiveOrg()).toEqual({ type: "org", id: "org_env_var" })
  })

  test("returns auth-derived org id when env is absent", async () => {
    setOrgSource(async () => ({ type: "org", id: "org_auth" }))
    expect(await getActiveOrg()).toEqual({ type: "org", id: "org_auth" })
  })

  test("returns unknown when org source lookup fails", async () => {
    setOrgSource(async () => {
      throw new Error("auth failed")
    })
    expect(await getActiveOrg()).toEqual({ type: "unknown" })
  })
})
