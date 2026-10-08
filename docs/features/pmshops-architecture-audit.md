# PMSHOPS architecture audit — domain isolation, dependency hygiene, boundary contracts

> Roadmap id: `pmshops-architecture-audit` — status is tracked in `docs/roadmap.json`.
> Implemented in the **PMSHOPS** repository, not in NoCowboy.

## Scope

PMSHOPS is a separate SvelteKit + Drizzle project (sibling checkout at
`../PMSHOPS/app`). This roadmap item audits it against three non-negotiable
invariants and enforces them with fitness functions:

1. **Pure Domain Isolation** — no business/calculation logic in `.svelte`; all of
   it in framework-agnostic pure TS under `src/lib/domain/*`.
2. **Framework-Agnostic Dependencies** — no `svelte-*` / `@sveltejs/*` wrappers for
   non-UI concerns (dates, currencies, numbers, validation); use `Intl`/`zod`/`date-fns`.
3. **Strict Boundary Contracts** — every Drizzle table/payload validated via
   `zod` / `drizzle-zod`; server endpoints parse input through a schema.

Plus DB entity leakage: tables map to typed DTO/domain entities, no raw entities
with secrets in client responses.

## Result

Implemented in PMSHOPS commit
`09d5f04343435d3ca8720b7810411926243f1ebb` — *refactor(domain): isolate pure domain
layer + strict zod boundaries + fitness tests* (2026-10-08).

- Pure domain modules: `src/lib/domain/{cart,checkout,pricing,health-metrics}.ts`
  (framework-agnostic; the older pure modules under `src/lib/utils/*` are held to
  the same contract).
- Fitness functions: `tests/architecture/domain-boundaries.test.ts` (domain purity,
  component purity, non-vacuity) and `tests/architecture/svelte-runes.test.ts`.
- Boundary parsing: server endpoints read `request.json()` / `formData()` into
  `unknown` and validate with zod schemas.

## Evidence (run inside the PMSHOPS checkout)

- `npx vitest run tests/architecture/` → **2 files, 14 tests passed**.
- `npm run check` (svelte-kit sync + svelte-check) → **0 errors, 0 warnings**.
- `npm run lint` (`eslint . --max-warnings=0`) → **exit 0**.
- Domain purity grep — `src/lib/domain/**` contains **no** `svelte` /
  `@sveltejs/*` / `$app/*` imports.

## Notes

- The PMSHOPS working tree was dirty with unrelated in-progress admin-UI work at
  the time of verification; those files do not touch `src/lib/domain/` or
  `tests/architecture/`, and the audit was verified against the committed HEAD
  (`09d5f04`). Nothing in the PMSHOPS repository was modified by this stage.
