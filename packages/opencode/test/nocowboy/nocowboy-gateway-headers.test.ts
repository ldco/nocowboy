import { describe, it, expect, afterEach, beforeEach } from "bun:test"
import { buildHeaders, getFeatureHeader, getEditorNameHeader } from "@nocowboy/gateway"
import { HEADER_FEATURE, HEADER_EDITORNAME, ENV_FEATURE, ENV_EDITOR_NAME, ENV_VERSION, NOCOWBOY_DEFAULT_EDITOR_NAME } from "@nocowboy/gateway"

describe("getFeatureHeader", () => {
  const original = process.env[ENV_FEATURE]

  afterEach(() => {
    if (original === undefined) {
      delete process.env[ENV_FEATURE]
    } else {
      process.env[ENV_FEATURE] = original
    }
  })

  it("returns empty string when env var is not set", () => {
    delete process.env[ENV_FEATURE]
    expect(getFeatureHeader()).toBe("")
  })

  it("returns empty string when env var is set", () => {
    process.env[ENV_FEATURE] = "cloud-agent"
    expect(getFeatureHeader()).toBe("")
  })

  it("returns empty string for empty string env var", () => {
    process.env[ENV_FEATURE] = ""
    expect(getFeatureHeader()).toBe("")
  })
})

describe("getEditorNameHeader", () => {
  const originalVersion = process.env[ENV_VERSION]
  const originalEditor = process.env[ENV_EDITOR_NAME]

  beforeEach(() => {
    delete process.env[ENV_EDITOR_NAME]
  })

  afterEach(() => {
    if (originalVersion === undefined) {
      delete process.env[ENV_VERSION]
    } else {
      process.env[ENV_VERSION] = originalVersion
    }

    if (originalEditor === undefined) {
      delete process.env[ENV_EDITOR_NAME]
    } else {
      process.env[ENV_EDITOR_NAME] = originalEditor
    }
  })

  it("returns default editor name without version when NOCOWBOY_VERSION is not set", () => {
    delete process.env[ENV_VERSION]
    expect(getEditorNameHeader()).toBe(NOCOWBOY_DEFAULT_EDITOR_NAME)
  })

  it("returns default editor name without version when NOCOWBOY_VERSION is set", () => {
    process.env[ENV_VERSION] = "1.2.3"
    expect(getEditorNameHeader()).toBe(NOCOWBOY_DEFAULT_EDITOR_NAME)
  })
})

describe("buildHeaders", () => {
  const original = process.env[ENV_FEATURE]

  afterEach(() => {
    if (original === undefined) {
      delete process.env[ENV_FEATURE]
    } else {
      process.env[ENV_FEATURE] = original
    }
  })

  it("omits feature header when env var is set", () => {
    process.env[ENV_FEATURE] = "vscode-extension"
    const headers = buildHeaders()
    expect(headers[HEADER_FEATURE]).toBeUndefined()
  })

  it("omits feature header when env var is not set", () => {
    delete process.env[ENV_FEATURE]
    const headers = buildHeaders()
    expect(headers[HEADER_FEATURE]).toBeUndefined()
  })

  it("omits editor name header", () => {
    delete process.env[ENV_FEATURE]
    const headers = buildHeaders()
    expect(headers[HEADER_EDITORNAME]).toBeUndefined()
  })

  it("omits feature header for any feature value from env", () => {
    process.env[ENV_FEATURE] = "custom-feature"
    const headers = buildHeaders()
    expect(headers[HEADER_FEATURE]).toBeUndefined()
  })
})
