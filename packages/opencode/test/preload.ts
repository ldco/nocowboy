// IMPORTANT: Set env vars BEFORE any imports from src/ directory
// xdg-basedir reads env vars at import time, so we must set these first
import os from "os"
import path from "path"
import fs from "fs/promises"
import { afterAll } from "bun:test"
import { remove as cleanup } from "./nocowboy/cleanup" // kilocode_change

// Set XDG env vars FIRST, before any src/ imports
const dir = path.join(os.tmpdir(), "opencode-test-data-" + process.pid)
await fs.mkdir(dir, { recursive: true })

// Use the full PID for port randomization to eliminate collisions.
// PIDs on Linux are typically > 1000 and < 65535, giving a range of ~64000
// unique ports. The source reads NOCOWBOY_TEST_OAUTH_PORT to override 1455.
const basePort = 10000 + (process.pid % 50000)
process.env["NOCOWBOY_TEST_OAUTH_PORT"] = String(basePort)
process.env["NOCOWBOY_TEST_OAUTH_CALLBACK_PORT"] = String(basePort + 100)
afterAll(async () => {
  const { SessionExport } = await import("../src/nocowboy/session-export") // kilocode_change
  const { Database } = await import("../src/storage/db")
  await SessionExport.shutdown() // kilocode_change
  Database.close()
  await cleanup(dir) // kilocode_change
})

process.env["XDG_DATA_HOME"] = path.join(dir, "share")
process.env["XDG_CACHE_HOME"] = path.join(dir, "cache")
process.env["XDG_CONFIG_HOME"] = path.join(dir, "config")
process.env["XDG_STATE_HOME"] = path.join(dir, "state")
process.env["KILO_MODELS_PATH"] = path.join(import.meta.dir, "tool", "fixtures", "models-api.json")
process.env["KILO_EXPERIMENTAL_EVENT_SYSTEM"] = "true"
process.env["KILO_EXPERIMENTAL_WORKSPACES"] = "true"

// Set test home directory to isolate tests from user's actual home directory
// This prevents tests from picking up real user configs/skills from ~/.claude/skills
const testHome = path.join(dir, "home")
await fs.mkdir(testHome, { recursive: true })
process.env["KILO_TEST_HOME"] = testHome

// Set test managed config directory to isolate tests from system managed settings
const testManagedConfigDir = path.join(dir, "managed")
process.env["KILO_TEST_MANAGED_CONFIG_DIR"] = testManagedConfigDir

// Write the cache version file to prevent global/index.ts from clearing the cache
const cacheDir = path.join(dir, "cache", "kilo")
await fs.mkdir(cacheDir, { recursive: true })
await fs.writeFile(path.join(cacheDir, "version"), "21")

// Clear provider and server auth env vars to ensure clean test state
delete process.env["ANTHROPIC_API_KEY"]
delete process.env["OPENAI_API_KEY"]
delete process.env["GOOGLE_API_KEY"]
delete process.env["GOOGLE_GENERATIVE_AI_API_KEY"]
delete process.env["AZURE_OPENAI_API_KEY"]
delete process.env["AWS_ACCESS_KEY_ID"]
delete process.env["AWS_PROFILE"]
delete process.env["AWS_REGION"]
delete process.env["AWS_BEARER_TOKEN_BEDROCK"]
delete process.env["OPENROUTER_API_KEY"]
delete process.env["LLM_GATEWAY_API_KEY"]
delete process.env["GROQ_API_KEY"]
delete process.env["MISTRAL_API_KEY"]
delete process.env["PERPLEXITY_API_KEY"]
delete process.env["TOGETHER_API_KEY"]
delete process.env["XAI_API_KEY"]
delete process.env["DEEPSEEK_API_KEY"]
delete process.env["FIREWORKS_API_KEY"]
delete process.env["CEREBRAS_API_KEY"]
delete process.env["SAMBANOVA_API_KEY"]
delete process.env["KILO_SERVER_PASSWORD"]
delete process.env["KILO_SERVER_USERNAME"]

// Use in-memory sqlite. Some code paths reopen the database by path;
// fall through to per-process temp file when needed.
process.env["NOCOWBOY_DB"] = ":memory:"
process.env["NOCOWBOY_TEST_DB_PATH"] = path.join(dir, "test.db")

// Map NOCOWBOY_* to KILO_* for source code that still reads the old names.
process.env["KILO_ORG_ID"] = process.env.NOCOWBOY_ORG_ID ?? process.env.KILO_ORG_ID
process.env["KILO_API_KEY"] = process.env.NOCOWBOY_API_KEY ?? process.env.KILO_API_KEY
process.env["KILO_SESSION_EXPORT_AUTH_TOKEN"] = process.env.NOCOWBOY_SESSION_EXPORT_AUTH_TOKEN ?? process.env.KILO_SESSION_EXPORT_AUTH_TOKEN
process.env["KILO_CLIENT"] = process.env.NOCOWBOY_CLIENT ?? process.env.KILO_CLIENT
process.env["KILO_DISABLE_CODEBASE_INDEXING"] = process.env.NOCOWBOY_DISABLE_CODEBASE_INDEXING ?? process.env.KILO_DISABLE_CODEBASE_INDEXING

// Now safe to import from src/
const { Log } = await import("@opencode-ai/core/util/log")
const { initProjectors } = await import("../src/server/projectors")

void Log.init({
  print: false,
  dev: true,
  level: "DEBUG",
})

initProjectors()
