// Generate docs/features/<id>.md for ALL done features + add verify directives
// Usage: bun run scripts/generate-feature-docs.ts

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join, dirname } from "path"

const ROOT = process.cwd()
const ROADMAP = join(ROOT, "docs", "roadmap.json")
const FEATURES_DIR = join(ROOT, "docs", "features")

const data = JSON.parse(readFileSync(ROADMAP, "utf-8"))
const done = data.features.filter((f: any) => f.status === "done")

if (!existsSync(FEATURES_DIR)) mkdirSync(FEATURES_DIR, { recursive: true })

let updated = 0
let skipped = 0

for (const feat of done) {
  const id = feat.id
  const path = join(FEATURES_DIR, `${id}.md`)

  // Skip if doc already exists and has content (not template)
  if (existsSync(path)) {
    const existing = readFileSync(path, "utf-8").trim()
    if (existing.length > 100 && !existing.includes("> Generated after DONE")) {
      skipped++
      continue
    }
  }

  // Extract file paths from existing verify directives
  const files = (feat.verify || [])
    .filter((v: any) => v.type === "file" || v.type === "grep")
    .map((v: any) => v.path || v.pattern)
    .filter(Boolean)

  // Build doc
  const doc = `# ${feat.title}

> Generated from docs/roadmap.json — part of NoCowboy verification system.

## Description
${feat.notes || feat.changelog || "No description available."}

## Key files
${files.length > 0 ? files.map((f: string) => `- \`${f}\``).join("\n") : "_No files tracked._"}

## Verification
- File existence: ✅ ${feat.verify?.some((v: any) => v.type === "file") ? "tracked" : "not tracked"}
- Attestation for overseer: ✅ ${feat.verify?.some((v: any) => v.type === "overseer" || v.type === "agent") ? "required" : "not required"}
`

  writeFileSync(path, doc, "utf-8")
  console.log(`✅ docs/features/${id}.md`)
  updated++

  // Add docs verify directive if not present
  if (!feat.verify) feat.verify = []
  const hasDocVerify = feat.verify.some((v: any) => v.type === "file" && v.path === `docs/features/${id}.md`)
  if (!hasDocVerify) {
    feat.verify.push({ type: "file", path: `docs/features/${id}.md` })
  }
}

// Write back roadmap.json with added verify directives
writeFileSync(ROADMAP, JSON.stringify(data, null, 2) + "\n", "utf-8")

console.log(`\nDone: ${updated} docs created/updated, ${skipped} skipped (existing), ${done.length} total done features`)
