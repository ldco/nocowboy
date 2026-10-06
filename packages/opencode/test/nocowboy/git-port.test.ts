import { describe, expect, test } from "bun:test"
import { createGitPort, findRepoRoot, parseGitHead, parseGitStatus, type RunGit } from "@/nocowboy/git/git-port"

describe("parseGitHead", () => {
  test("a branch ref yields the branch name", () => {
    expect(parseGitHead("ref: refs/heads/feature/x\n")).toEqual({ branch: "feature/x", detached: false })
  })

  test("a raw sha is a detached HEAD (short sha)", () => {
    expect(parseGitHead("a1b2c3d4e5f6a7b8c9d0\n")).toEqual({ branch: "a1b2c3d4e5f6", detached: true })
  })
})

describe("parseGitStatus", () => {
  test("counts untracked separately from other changes", () => {
    expect(parseGitStatus("?? new.ts\n M a.ts\n?? b.ts\nM  c.ts\n")).toEqual({ dirty: 2, untracked: 2 })
  })

  test("an empty status is a clean tree", () => {
    expect(parseGitStatus("\n")).toEqual({ dirty: 0, untracked: 0 })
  })
})

describe("findRepoRoot", () => {
  test("finds the nearest ancestor with .git/HEAD", () => {
    const exists = (p: string) => p === "/a/b/.git/HEAD"
    expect(findRepoRoot("/a/b/c", exists)).toBe("/a/b")
  })

  test("returns undefined when no ancestor is a repo", () => {
    expect(findRepoRoot("/a/b/c", () => false)).toBeUndefined()
  })
})

describe("createGitPort", () => {
  const head = "ref: refs/heads/main\n"
  const existsRepo = (p: string) => p === "/repo/.git/HEAD"
  const readFile = () => head

  test("not a git repository is unknown — not a fake clean tree", async () => {
    const port = createGitPort({ run: async () => ({ ok: true, stdout: "" }), exists: () => false, readFile })
    expect(await port.read("/tmp/x")).toEqual({ status: "unknown", reason: "not a git repository" })
  })

  test("a real repo is ok with branch and counts", async () => {
    const run: RunGit = async (args) => {
      if (args[0] === "rev-list" && args[2] === "@{upstream}..HEAD") return { ok: true, stdout: "3" }
      if (args[0] === "rev-list") return { ok: true, stdout: "1" }
      return { ok: true, stdout: "?? u.ts\n M d.ts\n" }
    }
    const port = createGitPort({ run, exists: existsRepo, readFile })
    expect(await port.read("/repo/sub")).toEqual({
      status: "ok",
      dir: "/repo",
      branch: "main",
      detached: false,
      ahead: 3,
      behind: 1,
      dirty: 1,
      untracked: 1,
    })
  })

  test("a missing upstream is 0 ahead/behind, still ok", async () => {
    const run: RunGit = async (args) =>
      args[0] === "rev-list"
        ? { ok: false, error: "no upstream configured" }
        : { ok: true, stdout: "" }
    const port = createGitPort({ run, exists: existsRepo, readFile })
    const state = await port.read("/repo")
    expect(state.status).toBe("ok")
    if (state.status === "ok") {
      expect(state.ahead).toBe(0)
      expect(state.behind).toBe(0)
      expect(state.dirty).toBe(0)
      expect(state.untracked).toBe(0)
    }
  })

  test("a git status failure is error, not a clean tree", async () => {
    const run: RunGit = async (args) =>
      args[0] === "status" ? { ok: false, error: "git not found" } : { ok: true, stdout: "0" }
    const port = createGitPort({ run, exists: existsRepo, readFile })
    expect(await port.read("/repo")).toEqual({ status: "error", dir: "/repo", reason: "git not found" })
  })

  test("an unreadable HEAD is error", async () => {
    const port = createGitPort({
      run: async () => ({ ok: true, stdout: "" }),
      exists: existsRepo,
      readFile: () => {
        throw new Error("permission denied")
      },
    })
    expect(await port.read("/repo")).toEqual({ status: "error", dir: "/repo", reason: "permission denied" })
  })
})
