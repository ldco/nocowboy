#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"

let subpkg
if (process.platform === "linux" && process.arch === "x64") subpkg = "nocowboy-linux-x64"
else if (process.platform === "darwin" && process.arch === "arm64") subpkg = "nocowboy-darwin-arm64"

if (!subpkg) {
  console.error(`nocowboy: unsupported platform ${process.platform}-${process.arch}`)
  process.exit(1)
}

let binaryPath
try {
  binaryPath = createRequire(import.meta.url).resolve(subpkg + "/bin/nocowboy")
} catch {
  console.error(`nocowboy: platform package ${subpkg} not installed.`)
  console.error("This should have been installed automatically as an optionalDependency.")
  process.exit(1)
}

const result = spawnSync(binaryPath, process.argv.slice(2), { stdio: "inherit", env: process.env })
process.exit(result.status ?? 1)
