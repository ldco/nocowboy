/**
 * roadmap-types.ts — Shared types and validation for roadmap.json.
 *
 * Used by: generate-docs.ts, verify-roadmap.ts
 * Single source of truth for Feature interfaces.
 */

/** Valid verify directive types */
export const VALID_VERIFY_TYPES = ["file", "grep", "test", "typecheck", "cmd", "agent"] as const;
export type VerifyType = typeof VALID_VERIFY_TYPES[number];

/** Valid feature statuses */
export const VALID_STATUSES = ["done", "planned", "in_progress", "backlog", "abandoned", "blocked"] as const;
export type FeatureStatus = typeof VALID_STATUSES[number];

export interface VerifyDef {
  type: string;
  path?: string;
  pattern?: string;
  command?: string;
}

export interface Feature {
  id: string;
  title: string;
  status: string;
  version?: string;
  changelog?: string;
  notes?: string;
  blocker?: string;
  subfeatures?: string[];
  verify?: VerifyDef[];
}

export interface Version {
  tag: string;
  date?: string;
  description: string;
}

export interface RoadmapData {
  versions: Version[];
  features: Feature[];
}

/** Version sort: v0.6.1 → [0,6,1], v0.10.0 → [0,10,0], v1.0.0 → [1,0,0] */
export function parseVersionTag(tag: string): number[] {
  const parts = tag.startsWith("v") ? tag.slice(1) : tag;
  return parts.split(".").map(p => {
    const n = parseInt(p, 10);
    return isNaN(n) ? 0 : n;
  });
}

export function sortVersions(versions: Version[]): Version[] {
  return [...versions].sort((a, b) => {
    const va = parseVersionTag(a.tag);
    const vb = parseVersionTag(b.tag);
    for (let i = 0; i < Math.max(va.length, vb.length); i++) {
      const diff = (va[i] ?? 0) - (vb[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });
}

/**
 * Validate roadmap.json structure. Returns list of error messages.
 * Empty array = no errors.
 */
export function validateRoadmap(data: RoadmapData): string[] {
  const errors: string[] = [];

  // Check versions
  if (!Array.isArray(data.versions) || data.versions.length === 0) {
    errors.push("versions must be a non-empty array");
  }

  const versionTags = new Set((data.versions ?? []).map(v => v.tag));
  const seenIds = new Set<string>();

  for (let i = 0; i < (data.features ?? []).length; i++) {
    const f = data.features[i];
    const loc = `features[${i}] (id="${f.id}")`;

    // 1. ID must be unique
    if (!f.id) {
      errors.push(`${loc}: missing id`);
      continue;
    }
    if (seenIds.has(f.id)) {
      errors.push(`${loc}: duplicate id "${f.id}"`);
    }
    seenIds.add(f.id);

    // 2. Status must be valid
    if (!VALID_STATUSES.includes(f.status as any)) {
      errors.push(`${loc}: invalid status "${f.status}". Valid: ${VALID_STATUSES.join(", ")}`);
    }

    // 3. If version is specified, it must exist in versions list
    if (f.version && !versionTags.has(f.version)) {
      errors.push(`${loc}: version "${f.version}" not found in versions. Existing: ${[...versionTags].join(", ")}`);
    }

    // 4. Verify directives validation
    if (f.verify) {
      if (!Array.isArray(f.verify)) {
        errors.push(`${loc}: verify must be an array`);
      } else {
        for (let j = 0; j < f.verify.length; j++) {
          const v = f.verify[j];
          const vloc = `${loc}.verify[${j}]`;
          if (!VALID_VERIFY_TYPES.includes(v.type as any)) {
            errors.push(`${vloc}: invalid verify type "${v.type}". Valid: ${VALID_VERIFY_TYPES.join(", ")}`);
          }
          if ((v.type === "file" || v.type === "grep" || v.type === "test") && !v.path) {
            errors.push(`${vloc}: "${v.type}" requires a "path" field`);
          }
          if (v.type === "grep" && !v.pattern) {
            errors.push(`${vloc}: "grep" requires a "pattern" field`);
          }
          if (v.type === "cmd" && !v.command && !v.path) {
            errors.push(`${vloc}: "cmd" requires a "command" or "path" field`);
          }
        }
      }
    }
  }

  return errors;
}
