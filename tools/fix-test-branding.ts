import { readFileSync, writeFileSync } from "fs"
import { globSync } from "glob"

interface Replacement {
  from: RegExp
  to: string
  description: string
}

const replacements: Replacement[] = [
  { from: /providerID: "kilo"/g, to: 'providerID: "nocowboy"', description: "providerID in test data" },
  { from: /providerId: "kilo"/g, to: 'providerId: "nocowboy"', description: "providerId in test data" },
  { from: /"kilo" as /g, to: '"nocowboy" as ', description: '"kilo" as const in test data' },
  { from: /@kilo/g, to: "@nocowboy", description: "npm scope" },
]

const nocowboyDir = "packages/opencode/test/nocowboy"
const files = globSync("**/*.test.ts", { cwd: nocowboyDir })

let changed = 0
for (const file of files) {
  const fpath = `${nocowboyDir}/${file}`
  const content = readFileSync(fpath, "utf-8")
  const lines = content.split("\n")
  const newLines: string[] = []
  let fileChanged = false

  for (const line of lines) {
    // Skip import lines, export lines, and namespace reference lines
    if (
      line.trimStart().startsWith("import ") ||
      line.trimStart().startsWith("import(") ||
      line.trimStart().startsWith("export ") ||
      line.trimStart().startsWith("} from ")
    ) {
      newLines.push(line)
      continue
    }

    let newLine = line
    for (const r of replacements) {
      if (r.from.test(newLine)) {
        newLine = newLine.replace(r.from, r.to)
        fileChanged = true
      }
    }
    newLines.push(newLine)
  }

  if (fileChanged) {
    writeFileSync(fpath, newLines.join("\n"), "utf-8")
    changed++
    console.log(`  ${file}`)
  }
}

console.log(`\nChanged ${changed} files`)
