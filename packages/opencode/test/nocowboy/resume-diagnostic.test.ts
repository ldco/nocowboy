import { describe, expect, test } from "bun:test"
import { resumeDiagnostic } from "@/nocowboy/tool/resume"

describe("resumeDiagnostic", () => {
  test("no task_id is a fresh subagent — allowed, no notice", () => {
    expect(resumeDiagnostic({ found: false })).toEqual({ ok: true })
  })

  test("an unknown/expired task_id warns (resume-or-create, never silent)", () => {
    const result = resumeDiagnostic({ taskID: "ses_abc", found: false })
    expect(result.ok).toBe(true)
    expect(result.warning).toContain("ses_abc")
    expect(result.warning).toContain("not found")
    expect(result.error).toBeUndefined()
  })

  test("a session from another parent is a hard error", () => {
    const result = resumeDiagnostic({ taskID: "ses_abc", found: true, parentMatches: false })
    expect(result.ok).toBe(false)
    expect(result.error).toContain("not a child")
  })

  test("a matching child resumes with no notice", () => {
    expect(resumeDiagnostic({ taskID: "ses_abc", found: true, parentMatches: true })).toEqual({ ok: true })
  })

  test("parent match is not required when it was not evaluated", () => {
    expect(resumeDiagnostic({ taskID: "ses_abc", found: true })).toEqual({ ok: true })
  })
})
