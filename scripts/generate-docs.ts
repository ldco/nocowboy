#!/usr/bin/env bun
/**
 * generate-docs.ts — Генерирует ROADMAP.md, CHANGELOG.md, BACKLOG.md из roadmap.json.
 *
 * Запуск: bun run scripts/generate-docs.ts
 * Проверка (не пишет): bun run scripts/generate-docs.ts --check
 *
 * `--check` сравнивает файлы на диске с тем, что сгенерировал бы генератор, и
 * возвращает 1 при рассинхроне — для pre-push/CI и любых гейтов. Обычный запуск
 * пишет файлы; pre-commit вызывает его и затем `git add`, чтобы свежие доки
 * попадали в коммит, а не оставались в рабочем дереве.
 *
 * Никто не редактирует .md вручную. Единственный источник — docs/roadmap.json.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import {
  type VerifyDef,
  type Feature,
  type Version,
  type RoadmapData,
  type FeatureStatus,
  sortVersions,
  validateRoadmap,
} from "./lib/roadmap-types";

const DATA_PATH = join(import.meta.dir, "..", "docs", "roadmap.json");
const OUTPUT_DIR = join(import.meta.dir, "..", "docs");

/** Present in every generated file; its absence means the file was edited by hand. */
const GENERATED_MARKER = "AUTO-GENERATED from docs/roadmap.json";

/**
 * Write a generated file, backing up a hand-edited one first.
 * The pre-commit hook runs this on every commit, so a manual edit must never be
 * silently destroyed.
 */
function writeGenerated(name: string, content: string): void {
  const path = join(OUTPUT_DIR, name);
  if (existsSync(path)) {
    const existing = readFileSync(path, "utf-8");
    if (!existing.includes(GENERATED_MARKER)) {
      const backupName = name.replace(/\.md$/, ".backup.md");
      copyFileSync(path, join(OUTPUT_DIR, backupName));
      console.log(`⚠️  ${name} had manual edits — backed up to ${backupName}`);
    }
  }
  writeFileSync(path, content, "utf-8");
}

function formatVerify(d: VerifyDef): string {
  switch (d.type) {
    case "file": return `\`verify:file ${d.path}\``;
    case "grep": return `\`verify:grep ${d.path ?? ""} ${d.pattern ?? ""}\``;
    case "test": return `\`verify:test ${d.path}\``;
    case "typecheck": return "`verify:typecheck`";
    case "cmd": return `\`verify:cmd ${d.command ?? d.path ?? ""}\``;
    case "agent": return "`verify:agent`";
    default: return "";
  }
}

function loadData(): RoadmapData {
  const raw = readFileSync(DATA_PATH, "utf-8");
  const data: RoadmapData = JSON.parse(raw);
  
  // Validate before proceeding
  const errors = validateRoadmap(data);
  if (errors.length > 0) {
    console.error("❌ Roadmap validation errors:");
    for (const err of errors) {
      console.error(`   ${err}`);
    }
    process.exit(1);
  }

  // Sort versions by tag order (v0.6.1, v0.7.0, ..., v0.10.0, v1.0.0)
  data.versions = sortVersions(data.versions);

  return data;
}

function generateRoadmap(data: RoadmapData): string {
  const lines: string[] = [];
  lines.push("# NoCowboy — Roadmap\n");
  lines.push("> **Только планируемое.** Что уже сделано → [CHANGELOG.md](CHANGELOG.md). Идеи на будущее → [BACKLOG.md](BACKLOG.md).");
  lines.push("> **Версионирование:** x.y.z — z только для багфиксов. Роадмап планирует x.y.0.");
  lines.push("> **Единственный источник:** `docs/roadmap.json`. `.md` файлы генерируются автоматически.");
  lines.push("> **Правило:** DONE-пункт обязан иметь verify-директивы. Если регрессия ломает verify — DONE недействителен.");
  lines.push("");
  lines.push("<!-- AUTO-GENERATED from docs/roadmap.json. Do not edit manually. -->");
  lines.push("");

  const activeStatuses: FeatureStatus[] = ["planned", "in_progress", "blocked"];
  const activeVersions = data.versions.filter(v => {
    const features = data.features.filter(f => f.version === v.tag && activeStatuses.includes(f.status as FeatureStatus));
    return features.length > 0;
  });

  for (const ver of activeVersions) {
    const features = data.features.filter(f => f.version === ver.tag && activeStatuses.includes(f.status as FeatureStatus));
    if (features.length === 0) continue;

    lines.push(`## ${ver.tag} — ${ver.description}`);
    lines.push("");

    for (const feat of features) {
      const prefix = feat.status === "blocked" ? "🚫" : "⬜";
      lines.push(`- ${prefix} ${feat.title}`);
      if (feat.notes) {
        lines.push(`  > ${feat.notes}`);
      }
      if (feat.blocker) {
        lines.push(`  > **Блокер:** ${feat.blocker}`);
      }
      if (feat.subfeatures) {
        for (const sub of feat.subfeatures) {
          lines.push(`  - ${sub}`);
        }
      }
      if (feat.verify && feat.verify.length > 0) {
        for (const d of feat.verify) {
          lines.push(`  ${formatVerify(d)}`);
        }
      }
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

function generateChangelog(data: RoadmapData): string {
  const lines: string[] = [];
  lines.push("# NoCowboy — Changelog\n");
  lines.push("<!-- AUTO-GENERATED from docs/roadmap.json. Do not edit manually. -->");
  lines.push("");

  const doneFeatures = data.features.filter(f => f.status === "done");

  for (const ver of data.versions) {
    const features = doneFeatures.filter(f => f.version === ver.tag);
    if (features.length === 0) continue;

    lines.push(`## ${ver.tag} — ${ver.description}${ver.date ? ` (${ver.date})` : ""}`);
    lines.push("");

    // Group by changelog section
    const sections = new Map<string, Feature[]>();
    for (const feat of features) {
      const section = feat.changelog ?? "General";
      if (!sections.has(section)) sections.set(section, []);
      sections.get(section)!.push(feat);
    }

    for (const [section, sectionFeats] of sections) {
      if (section !== "General") {
        lines.push(`### ${section}`);
        lines.push("");
      }
      for (const feat of sectionFeats) {
        lines.push(`- **DONE** ${feat.title}`);
        if (feat.verify && feat.verify.length > 0) {
          for (const d of feat.verify) {
            lines.push(`  ${formatVerify(d)}`);
          }
        }
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function generateBacklog(data: RoadmapData): string {
  const lines: string[] = [];
  lines.push("# NoCowboy — Backlog\n");
  lines.push("> Идеи, которые мы накидываем. Не в роадмапе, не в работе.");
  lines.push("> Когда идея созрела → переносим в `docs/roadmap.json` (status: planned → ROADMAP).");
  lines.push("");
  lines.push("<!-- AUTO-GENERATED from docs/roadmap.json. Do not edit manually. -->");
  lines.push("");

  const backlogItems = data.features.filter(f => f.status === "backlog");

  for (const feat of backlogItems) {
    lines.push(`## ${feat.title}`);
    if (feat.notes) {
      lines.push("");
      lines.push(feat.notes);
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

function main(): number {
  if (!existsSync(DATA_PATH)) {
    console.error(`roadmap.json not found at ${DATA_PATH}`);
    return 1;
  }

  const data = loadData();
  console.log(`Loaded ${data.features.length} features across ${data.versions.length} versions`);

  // Generate all three documents
  const roadmap = generateRoadmap(data);
  const changelog = generateChangelog(data);
  const backlog = generateBacklog(data);

  // ── --check: verify the committed docs match roadmap.json, do not write ──
  if (process.argv.includes("--check")) {
    const generated: [string, string][] = [
      ["ROADMAP.md", roadmap],
      ["CHANGELOG.md", changelog],
      ["BACKLOG.md", backlog],
    ];
    const stale = generated
      .filter(([name, content]) => {
        const path = join(OUTPUT_DIR, name);
        return !existsSync(path) || readFileSync(path, "utf-8") !== content;
      })
      .map(([name]) => name);
    if (stale.length > 0) {
      console.error(`❌ Generated docs are out of sync with docs/roadmap.json: ${stale.join(", ")}`);
      console.error(`   Regenerate and stage them:  bun run scripts/generate-docs.ts`);
      return 1;
    }
    console.log(`✅ Generated docs are in sync with docs/roadmap.json`);
    return 0;
  }

  writeGenerated("ROADMAP.md", roadmap);
  writeGenerated("CHANGELOG.md", changelog);
  writeGenerated("BACKLOG.md", backlog);

  const stats = {
    roadmap: roadmap.split("\n").length,
    changelog: changelog.split("\n").length,
    backlog: backlog.split("\n").length,
    done: data.features.filter(f => f.status === "done").length,
    planned: data.features.filter(f => f.status === "planned" || f.status === "in_progress").length,
    backlogCount: data.features.filter(f => f.status === "backlog").length,
  };

  console.log(`\nGenerated:`);
  console.log(`  ROADMAP.md   — ${stats.roadmap} lines (${stats.planned} planned)`);
  console.log(`  CHANGELOG.md — ${stats.changelog} lines (${stats.done} done)`);
  console.log(`  BACKLOG.md   — ${stats.backlog} lines (${stats.backlogCount} ideas)`);

  return 0;
}

process.exit(main());
