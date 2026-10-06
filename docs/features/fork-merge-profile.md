# Профиль merge/backport — upstream read-only reference

> Roadmap id: `fork-merge-profile` — status is tracked in `docs/roadmap.json`.

## Description
NoCowboy's upstream tooling no longer reuses the legacy Kilo genealogy blindly.
A **merge profile** registry (`script/upstream/utils/config.ts`) has two entries:

- `kilocode` — the legacy pipeline (upstream opencode, rewritten to `@kilocode/*`
  before merge).
- `nocowboy` — this repo's profile. It has **no write-time package renames**
  (`packageMappings: []`), **no branding take-theirs**, and
  `readOnlyUpstream: true`. It never rewrites `@nocowboy/*` to `@kilocode/*` and
  never merges upstream in place. This is enforced in the execution path: `merge.ts` loads the profile (`--profile`, default `nocowboy`) and refuses the in-place merge when the profile marks upstream read-only.

Because upstream is a read-only reference, package names and paths are reconciled
only at **comparison time** (`script/upstream/utils/normalize.ts`): both trees
are normalized to the NoCowboy vocabulary (`@kilocode/*` / `opencode-ai` →
`@nocowboy/*`) and repo-relative paths are canonically formatted before diffing.
Nothing on disk is modified.

`script/upstream/compare.ts` exposes both:

```
# assert the profile keeps the NoCowboy namespace and reads upstream read-only
bun script/upstream/compare.ts --profile nocowboy --report

# normalized, read-only tree comparison
bun script/upstream/compare.ts --left <upstream-dir> --right <local-dir>
```

## Key files
- `script/upstream/utils/config.ts`
- `script/upstream/utils/normalize.ts`
- `script/upstream/compare.ts`
- `script/upstream/utils/config.test.ts`
- `script/upstream/utils/normalize.test.ts`

## Verification
- `bun test script/upstream/utils/config.test.ts` — profile contract.
- `bun test script/upstream/utils/normalize.test.ts` — normalization + compare.
- `bun script/upstream/compare.ts --profile nocowboy --report` — exits 0 and
  reports `rewrites @nocowboy/* -> @kilocode/*: no`, `upstream ... read-only`.
