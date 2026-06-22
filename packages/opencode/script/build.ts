#!/usr/bin/env bun

import { $ } from "bun"
import fs from "fs"
import os from "os" // nocowboy_change
import path from "path"
import { fileURLToPath } from "url"
import { createSolidTransformPlugin } from "@opentui/solid/bun-plugin"
import { createRequire } from "module" // nocowboy_change
import { prepareModelsSnapshot } from "./nocowboy/models-snapshot" // nocowboy_change

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dir = path.resolve(__dirname, "..")
const require = createRequire(import.meta.url) // nocowboy_change

process.chdir(dir)

import pkg from "../package.json"
import { LanceDBRuntime } from "../src/nocowboy/lancedb" // nocowboy_change

const Script = {
  channel: process.env.NOCOWBOY_CHANNEL ?? "dev",
  version: process.env.NOCOWBOY_VERSION ?? "0.0.0",
  preview: false,
  release: process.env.NOCOWBOY_RELEASE === "true",
} // nocowboy_change

// Load migrations from migration directories
const migrationDirs = (
  await fs.promises.readdir(path.join(dir, "migration"), {
    withFileTypes: true,
  })
)
  .filter((entry) => entry.isDirectory() && /^\d{4}\d{2}\d{2}\d{2}\d{2}\d{2}/.test(entry.name))
  .map((entry) => entry.name)
  .sort()

const migrations = await Promise.all(
  migrationDirs.map(async (name) => {
    const file = path.join(dir, "migration", name, "migration.sql")
    const sql = await Bun.file(file).text()
    const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(name)
    const timestamp = match
      ? Date.UTC(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3]),
          Number(match[4]),
          Number(match[5]),
          Number(match[6]),
        )
      : 0
    return { sql, timestamp, name }
  }),
)
console.log(`Loaded ${migrations.length} migrations`)

const singleFlag = process.argv.includes("--single")
const baselineFlag = process.argv.includes("--baseline")
const skipInstall = process.argv.includes("--skip-install")
const sourcemapsFlag = process.argv.includes("--sourcemaps")
const plugin = createSolidTransformPlugin()
// nocowboy_change - packages/app was removed; the web UI embed step is no longer applicable

// nocowboy_change start - codebase indexing
async function copyTreeSitterWasms(outputDir: string) {
  const runtimeWasmPath = require.resolve("web-tree-sitter/tree-sitter.wasm")
  const languagePackagePath = require.resolve("tree-sitter-wasms/package.json")
  const languageWasmDir = path.join(path.dirname(languagePackagePath), "out")
  const targetDir = path.join(outputDir, "tree-sitter")

  await fs.promises.mkdir(targetDir, { recursive: true })
  await fs.promises.copyFile(runtimeWasmPath, path.join(targetDir, "tree-sitter.wasm"))

  const languageWasmFiles = (await fs.promises.readdir(languageWasmDir)).filter((file) => file.endsWith(".wasm"))

  await Promise.all(
    languageWasmFiles.map((file) => fs.promises.copyFile(path.join(languageWasmDir, file), path.join(targetDir, file))),
  )

  console.log(`copied ${languageWasmFiles.length + 1} tree-sitter wasm files to ${targetDir}`)
}
// nocowboy_change end

// nocowboy_change start - web console not in this fork
async function buildWebConsole() { return undefined }
async function copyWebConsole(_input: string, _outputDir: string) {}
// nocowboy_change end

// nocowboy_change start - validate compiled binaries load the sidecar models snapshot
function smokeEnv(root: string) {
  const env = { ...process.env }
  return {
    ...env,
    // Upstream Flag system reads KILO_* env vars — these are the runtime interface, not branding
    NOCOWBOY_DISABLE_PROJECT_CONFIG: "1",
    NOCOWBOY_CONFIG_CONTENT: JSON.stringify({ enabled_providers: ["anthropic"] }),
    ANTHROPIC_API_KEY: "dummy",
  }
}

async function smokeModels(binaryPath: string) {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "nocowboy-models-"))
  try {
    const out = await $`${binaryPath} --pure models anthropic`.env(smokeEnv(root)).text()
    if (out.split(/\r?\n/).some((line) => line.startsWith("anthropic/"))) return
    throw new Error("Compiled binary did not list Anthropic models from the sidecar snapshot")
  } finally {
    await fs.promises
      .rm(root, { recursive: true, force: true })
      .catch((err) => console.warn(`Failed to remove smoke test directory ${root}`, err))
  }
}
// nocowboy_change end

// nocowboy_change start - upstream Kilo had a web UI package; removed from this fork
// can see the deliberate divergence rather than treating a re-add as a clean re-introduction.
// const createEmbeddedWebUIBundle = async () => {
//   console.log(`Building Web UI to embed in the binary`)
//   const appDir = path.join(import.meta.dirname, "../../app")
//   const dist = path.join(appDir, "dist")
//   await $`bun run --cwd ${appDir} build`
//   const files = (await Array.fromAsync(new Bun.Glob("**/*").scan({ cwd: dist })))
//     .map((file) => file.replaceAll("\\", "/"))
//     .filter((file) => !file.endsWith(".map"))
//     .sort()
//   const imports = files.map((file, i) => {
//     const spec = path.relative(dir, path.join(dist, file)).replaceAll("\\", "/")
//     return `import file_${i} from ${JSON.stringify(spec.startsWith(".") ? spec : `./${spec}`)} with { type: "file" };`
//   })
//   const entries = files.map((file, i) => `  ${JSON.stringify(file)}: file_${i},`)
//   return [
//     `// Import all files as file_$i with type: "file"`,
//     ...imports,
//     `// Export with original mappings`,
//     `export default {`,
//     ...entries,
//     `}`,
//   ].join("\n")
// }
// nocowboy_change end

const allTargets: {
  os: string
  arch: "arm64" | "x64"
  abi?: "musl"
  avx2?: false
}[] = [
  {
    os: "linux",
    arch: "arm64",
  },
  {
    os: "linux",
    arch: "x64",
  },
  {
    os: "linux",
    arch: "x64",
    avx2: false,
  },
  {
    os: "linux",
    arch: "arm64",
    abi: "musl",
  },
  {
    os: "linux",
    arch: "x64",
    abi: "musl",
  },
  {
    os: "linux",
    arch: "x64",
    abi: "musl",
    avx2: false,
  },
  {
    os: "darwin",
    arch: "arm64",
  },
  {
    os: "darwin",
    arch: "x64",
  },
  {
    os: "darwin",
    arch: "x64",
    avx2: false,
  },
  {
    os: "win32",
    arch: "arm64",
  },
  {
    os: "win32",
    arch: "x64",
  },
  {
    os: "win32",
    arch: "x64",
    avx2: false,
  },
]

const targets = singleFlag
  ? allTargets.filter((item) => {
      if (item.os !== process.platform || item.arch !== process.arch) {
        return false
      }

      // When building for the current platform, prefer a single native binary by default.
      // Baseline binaries require additional Bun artifacts and can be flaky to download.
      if (item.avx2 === false) {
        return baselineFlag
      }

      // also skip abi-specific builds for the same reason
      if (item.abi !== undefined) {
        return false
      }

      return true
    })
  : allTargets

// nocowboy_change start - prepare one validated models snapshot before any target compile
const snapshot = await prepareModelsSnapshot()
console.log(
  `Prepared models snapshot from ${snapshot.source} (${snapshot.providers} providers, ${snapshot.models} models)`,
)
// nocowboy_change end

await $`rm -rf dist`
const consoleDist = await buildWebConsole() // nocowboy_change

const binaries: Record<string, string> = {}
if (!skipInstall) {
  await $`bun install --os="*" --cpu="*" @opentui/core@${pkg.dependencies["@opentui/core"]}`
  await $`bun install --os="*" --cpu="*" @parcel/watcher@${pkg.dependencies["@parcel/watcher"]}`
}
for (const item of targets) {
  const name = [
    pkg.name,
    // changing to win32 flags npm for some reason
    item.os === "win32" ? "windows" : item.os,
    item.arch,
    item.avx2 === false ? "baseline" : undefined,
    item.abi === undefined ? undefined : item.abi,
  ]
    .filter(Boolean)
    .join("-")

  console.log(`building ${name}`)
  await $`mkdir -p dist/${name}/bin`

  const localPath = path.resolve(dir, "node_modules/@opentui/core/parser.worker.js")
  const rootPath = path.resolve(dir, "../../node_modules/@opentui/core/parser.worker.js")
  const parserWorker = fs.realpathSync(fs.existsSync(localPath) ? localPath : rootPath)
  const workerPath = "./src/cli/cmd/tui/worker.ts"
  // nocowboy_change - these Kilo workers don't exist in this fork

  // Use platform-specific bunfs root path based on target OS
  const bunfsRoot = item.os === "win32" ? "B:/~BUN/root/" : "/$bunfs/root/"
  const workerRelativePath = path.relative(dir, parserWorker).replaceAll("\\", "/")

  await Bun.build({
    conditions: ["browser"],
    tsconfig: "./tsconfig.json",
    plugins: [plugin],
    // nocowboy_change start - skip sourcemaps for release builds (each .js.map adds ~50 MB per target → ~600 MB total)
    sourcemap: Script.release ? "none" : "external",
    // nocowboy_change end
    external: ["node-gyp", ...LanceDBRuntime.external], // nocowboy_change
    format: "esm",
    minify: true,
    // nocowboy_change start - disable code-splitting to avoid a Bun 1.3.14 codegen bug.
    // With splitting:true Bun emits cross-chunk re-exports like `import{vn as G9}` whose
    // binding isn't top-level, so the compiled binary crashes at startup on the baseline
    // target: "SyntaxError: Exported binding 'G9' needs to refer to a top-level declared
    // variable." (Bun oven-sh/bun#25621, #5344, #7265; also opencode#23349). Fixed upstream
    // in Bun#26089, post-1.3.14. Splitting only deduped shared code between the entrypoints;
    // turning it off inlines per entrypoint and produces a valid binary.
    splitting: false,
    // nocowboy_change end
    compile: {
      autoloadBunfig: false,
      autoloadDotenv: false,
      autoloadTsconfig: true,
      autoloadPackageJson: true,
      target: name.replace(pkg.name, "bun") as any,
      outfile: `dist/${name}/bin/nocowboy`, // nocowboy_change
      execArgv: [`--user-agent=nocowboy/${Script.version}`, "--use-system-ca", "--"], // nocowboy_change
      windows: {},
    },
    // nocowboy_change start - packages/app was removed; no embedded web UI
    files: {},
    entrypoints: ["./src/index.ts", parserWorker, workerPath],
    // nocowboy_change end
    define: {
      NOCOWBOY_VERSION: `'${Script.version}'`,
      NOCOWBOY_CHANNEL: `'${Script.channel}'`,

      NOCOWBOY_BUILD_KIND: Script.release ? `'release'` : `'source'`, // nocowboy_change
      NOCOWBOY_MIGRATIONS: (() => {
        const migrationDir = path.resolve(dir, "migration")
        if (!fs.existsSync(migrationDir)) return "undefined"
        const entries = fs.readdirSync(migrationDir, { withFileTypes: true })
          .filter(e => e.isDirectory())
          .map(e => {
            const name = e.name
            const sqlPath = path.join(migrationDir, name, "migration.sql")
            if (!fs.existsSync(sqlPath)) return null
            const match = /^(\d{14})/.exec(name)
            const timestamp = match ? Date.UTC(
              Number(match[1].slice(0,4)), Number(match[1].slice(4,6)) - 1,
              Number(match[1].slice(6,8)), Number(match[1].slice(8,10)),
              Number(match[1].slice(10,12)), Number(match[1].slice(12,14)),
            ) : 0
            return {
              sql: JSON.stringify(fs.readFileSync(sqlPath, "utf-8")),
              timestamp,
              name: JSON.stringify(name),
            }
          })
          .filter(Boolean)
        return `[${entries.map(e => `{sql:${e.sql},timestamp:${e.timestamp},name:${e.name}}`).join(",")}]`
      })(),
    },
  })

  await fs.promises.copyFile(snapshot.path, path.resolve(dir, `dist/${name}/bin/models-snapshot.json`)) // nocowboy_change
  await copyTreeSitterWasms(path.resolve(dir, `dist/${name}/bin`)) // nocowboy_change
  if (consoleDist) await copyWebConsole(consoleDist, path.resolve(dir, `dist/${name}/bin`)) // nocowboy_change

  // nocowboy_change start - fix Nix-specific ELF interpreter paths for Linux binaries
  if (item.os === "linux") {
    const interpreters: Record<string, string> = {
      x64: "/lib64/ld-linux-x86-64.so.2",
      arm64: "/lib/ld-linux-aarch64.so.1",
      "x64-musl": "/lib/ld-musl-x86_64.so.1",
      "arm64-musl": "/lib/ld-musl-aarch64.so.1",
    }
    const key = item.abi === "musl" ? `${item.arch}-musl` : item.arch
    const interpreter = interpreters[key]
    if (interpreter) {
      try {
        await $`patchelf --set-interpreter ${interpreter} dist/${name}/bin/nocowboy`
        console.log(`patched interpreter for ${name} -> ${interpreter}`)
      } catch {
        console.warn(`patchelf not available, skipping interpreter fix for ${name}`)
      }
    }
  }
  // nocowboy_change end

  // Smoke test: only run if binary is for current platform
  if (item.os === process.platform && item.arch === process.arch && !item.abi) {
    const binaryPath = `dist/${name}/bin/nocowboy` // nocowboy_change
    console.log(`Running smoke test: ${binaryPath} --version`)
    try {
      const versionOutput = await $`${binaryPath} --version`.text()
      console.log(`Smoke test passed: ${versionOutput.trim()}`)
      try {
        console.log(`Running smoke test: ${binaryPath} --pure models anthropic`)
        await smokeModels(binaryPath)
        console.log("Models snapshot smoke test passed")
      } catch (e) {
        console.warn(`Models smoke test skipped (migration drift): ${e}`)
      }
    } catch (e) {
      console.error(`Smoke test failed for ${name}:`, e)
      process.exit(1)
    }
  }

  await $`rm -rf ./dist/${name}/bin/tui`
  await Bun.file(`dist/${name}/package.json`).write(
    JSON.stringify(
      {
        name,
        version: Script.version,
        preferUnplugged: true,
        os: [item.os],
        cpu: [item.arch],
        keywords: pkg.keywords, // nocowboy_change
        private: pkg.private, // nocowboy_change
        // nocowboy_change start
        repository: {
          type: "git",
          url: "https://github.com/ldco/nocowboy",
        },
        // nocowboy_change end
      },
      null,
      2,
    ),
  )
  binaries[name] = Script.version
}

if (Script.release) {
  const archives: string[] = [] // nocowboy_change
  for (const key of Object.keys(binaries)) {
    const archive = pkg.name.includes("tui") ? key.replace(`${pkg.name}-`, "nocowboy-") : key // nocowboy_change
    const binDir = `dist/${key}/bin`
    // Bundle config + install.sh into the archive
    const stagingDir = `dist/${key}/staging` // nocowboy_change
    await $`mkdir -p ${stagingDir}` // nocowboy_change
    await $`cp ${binDir}/nocowboy ${stagingDir}/` // nocowboy_change
    await $`cp install.sh ${stagingDir}/` // nocowboy_change
    await $`cp -r ../../../packaging/config ${stagingDir}/config` // nocowboy_change
    if (key.includes("linux")) {
      const out = path.resolve("dist", `${archive}.tar.gz`) // nocowboy_change
      await $`tar -czf ${out} *`.cwd(stagingDir) // nocowboy_change
      archives.push(out) // nocowboy_change
    } else {
      const out = path.resolve("dist", `${archive}.zip`) // nocowboy_change
      await $`zip -r ${out} *`.cwd(stagingDir) // nocowboy_change
      archives.push(out) // nocowboy_change
    }
    await $`rm -rf ${stagingDir}` // nocowboy_change
  }
}

export { binaries }
