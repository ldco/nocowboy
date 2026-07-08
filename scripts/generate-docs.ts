#!/usr/bin/env bun
/**
 * generate-docs.ts — Генерирует ROADMAP.md, CHANGELOG.md, BACKLOG.md из roadmap.json.
 *
 * Запуск: bun run scripts/generate-docs.ts
 * Выполняется в pre-commit: сначала генерация, потом verify.
 *
 * Никто не редактирует .md вручную. Единственный источник — docs/roadmap.json.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DATA_PATH = join(import.meta.dir, "..", "docs", "roadmap.json");
const OUTPUT_DIR = join(import.meta.dir, "..", "docs");

interface VerifyDirective {
  type: string;
  path?: string;
  pattern?: string;
  command?: string;
}

interface Feature {
  id: string;
  title: string;
  status: "done" | "planned" | "in_progress" | "backlog" | "abandoned" | "blocked";
  version?: string;
  changelog?: string;
  notes?: string;
  blocker?: string;
  subfeatures?: string[];
  verify?: VerifyDirective[];
}

interface Version {
  tag: string;
  date?: string;
  description: string;
}

interface RoadmapData {
  versions: Version[];
  features: Feature[];
}

function formatVerify(d: VerifyDirective): string {
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

function versionDate(v: Version): string {
  return v.date ?? "";
}

function loadData(): RoadmapData {
  const raw = readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
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

  // Group planned/in_progress/blocked features by version
  const activeStatuses = ["planned", "in_progress", "blocked"];
  const activeVersions = data.versions.filter(v => {
    const features = data.features.filter(f => f.version === v.tag && activeStatuses.includes(f.status));
    return features.length > 0;
  });

  for (const ver of activeVersions) {
    const features = data.features.filter(f => f.version === ver.tag && activeStatuses.includes(f.status));
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

  // Sort versions by release order
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

  writeFileSync(join(OUTPUT_DIR, "ROADMAP.md"), roadmap, "utf-8");
  writeFileSync(join(OUTPUT_DIR, "CHANGELOG.md"), changelog, "utf-8");
  writeFileSync(join(OUTPUT_DIR, "BACKLOG.md"), backlog, "utf-8");

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
