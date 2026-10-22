import type { PmTool } from './index.js'
import { getProjectRoot, loadConfig, PM_CONFIG_FILE, type PmProject } from './utils.js'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

function moduleLines(project: PmProject | null): string[] {
  if (!project) return ['MODULES: unavailable (pm.config.ts was not loaded)']
  const modules = project.modules.filter((module) => module.moduleId !== undefined)
  if (modules.length === 0) return ['MODULES: none declared in the ModuleManifest']
  return [`MODULES: ${modules.map((module) => `${module.moduleId}=${(module.moduleEnabled ?? true) ? 'ON' : 'OFF'}`).join(', ')}`]
}

// Self-check names track the PM4 project rename: `validate:pm3` → `validate:pm4`.
// The PM4 package keeps a deprecated `validate:pm3` shim, so an older checkout
// still answers the legacy name; a checkout that predates the rename does not
// know `validate:pm4` — update the PM4 project in step with this MCP when the
// self-check instructions fail with "missing script".
const TOPICS: Record<string, string[]> = {
  css: [
    'CSS SYSTEM: Tailwind CSS v4 via @tailwindcss/vite; the design system is PM4-owned, not Tailwind stock.',
    'src/app.css = @theme tokens (~190: --color-pm-*, --text-fluid-*, shadow/radius/z/container/breakpoint) + @layer base :root variables (~85) + framework infrastructure only.',
    '4 brand primitives live in src/project/theme.css (--p-brand, --p-black, --p-white, --p-accent), mirrored in src/lib/config/theme.ts (BRAND_COLORS); every other token derives via color-mix/light-dark.',
    'Component markup uses token-reference brackets: [var(--token)], optionally inside calc()/min()/max()/clamp() with token refs only.',
    'FORBIDDEN: literal colors and literal px/rem/%/ch bracket values, e.g. text-[14px], bg-[#334155], max-w-[800px]. Promote a token first (docs/design-tokens.md).',
    'NO token-bridge utility classes (px-container, max-w-container) and NO BEM/component classes (.btn-primary, .section-hero).',
    'Reusable visual patterns are Svelte components (src/lib/components/ui/**), never @utility classes; only browser-fix @utility exceptions remain (min-h-dvh, backdrop-blur-glass).',
    'Dark mode is class-based: @custom-variant dark (&:where(.dark, .dark *)); token derivations use light-dark(), components consume bg-pm-*/text-pm-*.',
    'Fluid typography: --text-fluid-xs … --text-fluid-hero; section spacing: --pt-section, --px-container, --max-w-container, --h-header-total.',
    'RTL: Tailwind logical properties (ms-/me-/ps-/pe-/start-/end-).',
    'No <style> blocks in .svelte files.',
  ],
  components: [
    'SVELTE 5 RUNES: $state(), $derived(), $props(), $effect(); snippets instead of slots; lowercase native events (onclick).',
    'Component hierarchy: src/lib/components/ui/** (headless primitives + design system), atoms/ (single responsibility), molecules/ (compose atoms), complex/ (page regions), sections/ (full-viewport anchors), plugins/ (project overrides).',
    'Import NEW primitives from the barrel src/lib/components/ui/index.ts — never a deep primitive path.',
    'class prop contract: every visible root accepts class?: string and merges base classes via twMerge(clsx(base, className)).',
    'Canonical primitives are mandatory (docs/contributing/canonical-primitives.md): Button, IconButton, ActionLink, FormField, Checkbox, Container/PageShell, Card, Badge, Section, EmptyState, AdminBackButton/AdminCreateButton/AdminRowActions/AdminEditorPage/FormActions.',
    'Native elements (<button>, <input>, <a>, <form>, <table>) are allowed only in files registered in NATIVE_OWNERS (src/lib/design-system/registry.ts).',
    'Overlay lifecycle is owned by ui/Dialog, ui/AlertDialog, ui/Sheet, ui/Drawer, ui/Select; consumers never add their own Escape handler, focus trap, scroll lock, z-index or portal.',
    'Every exported component carries JSDoc: one-line description, @props (real props with types/defaults), @example (validator check #13).',
    'Loading/empty/error states are required for data-dependent components (LoadingBase/LoadingCard/LoadingTable/EmptyState).',
    'SectionHero is the only HOMEPAGE_SECTIONS entry not in SECTION_REGISTRY — rendered directly by the homepage orchestrator; never register it.',
    'Inline SVG/Tabler icons only through the icon layer; never hand-roll canonical class bundles.',
  ],
  state: [
    'STATE: $state() + $derived() + $derived.by(); no Svelte stores except genuinely global state (theme, i18n overrides).',
    'SSR data via SvelteKit load: +layout.server.ts (translations, legal, session), +page.server.ts (typed load) → $page.data / $props().',
    'Auth: locals.session from cookies via hooks.server.ts; RBAC master→admin→editor per admin page.',
    'Admin forms use SvelteKit form actions with Zod + fail(400, { fieldErrors }); sveltekit-superforms is NOT used.',
    'Public forms: Zod schema → $state fields → CSRF header → POST /api/<entity>/submit; submit button gates on createFormValidity (ADR-1).',
    'Theme: class-based .dark on <html>, bootstrapped before paint (docs/architecture/theme-and-startup.md); no FOUC.',
    'Overlay history/Back contract lives in src/lib/utils/overlay-history.svelte.ts; scroll/focus owners are shared utils.',
    'Module gates: FEATURES/MODULES from $lib/config/site; a module switch must gate admin page + public route + every nav link together.',
    'There is NO customer account domain (removed with commerce): no /account, customers or customer_sessions.',
  ],
  database: [
    'Database: async SQLite at data/sqlite.db via @libsql/client (libSQL), behind the DB_DRIVER adapter seam in src/lib/server/db/client.ts (sqlite default; postgres tier throws until implemented).',
    'Drizzle ORM 0.45; every query is async: await, queryOne, await db.transaction(async () => …).',
    'better-sqlite3 is tooling-only (migration runner, ops scripts, tests) — never import it from application code.',
    'Schema: Drizzle; 39 framework tables — auth (roles/users/sessions/user_2fa), config (settings/translations), content (portfolios + portfolio_translations + portfolio_items + portfolio_item_translations, posts + post_translations, faq_items + translations, contact_submissions, optional testimonials/team/pricing/clients/features + translations), media (media_files/media_collections), taxonomy (taxonomies/tags + translations + assignments), governance (legal_documents/consent_records/audit_logs/notification_outbox/job_leases/tenants).',
    'Per-entity translation convention: every translatable entity has a *_translations table; joins MUST filter by the current locale.',
    'Migrations: drizzle/0000 baseline, 0005 legacy page CMS (superseded), 0006 portfolios reset (drops pages/projects), 0007 portfolios.display_mode (grid|fullscreen), consent_records append-only triggers.',
    'Commands: npm run db:push, npm run db:seed, npm run db:reset (recreates + seeds), npm run db:generate, npm run db:migrate, npm run db:studio.',
    'Media is generic: media_files/media_collections + generic (ownerType, ownerId) assignment joins; modules own NO media/taxonomy tables.',
    'Redis (ioredis) is optional infrastructure for rate limits/cache; the default deployment is single-writer SQLite.',
  ],
  api: [
    'SVELTEKIT SERVER: src/routes/api/** (public) and src/routes/admin/** (form actions + admin API); server-only code in $lib/server/.',
    'Route files import $lib/server/services/* only — never $lib/server/db (validator check #18, no allowlist). Each service owns one entity.',
    'Zod validation is mandatory on ALL inputs: public POST/PUT/PATCH bodies and GET query params.',
    'Error contract: { success: false, error: { code, message } }; statuses 400 validation, 401 auth, 403 forbidden, 404 not found, 500 server; never expose stack traces.',
    'Public success envelope: { success: true, data }.',
    'CSRF: crypto.randomBytes(32) token → pm-csrf cookie (HttpOnly Secure SameSite=Strict) → x-csrf-token header → timingSafeEqual.',
    'Rate limiting: login/contact POST → 5 per 15 min per IP via createLoginRateLimiter/createContactRateLimiter.',
    'Admin editing surfaces: dedicated AdminEditorPage for multi-section forms, AdminModal for small single-record forms.',
    'Every module-backed feature keeps ONE switch across admin page, public route (404 when disabled) and nav links.',
  ],
  config: [
    `Typed project config: ${PM_CONFIG_FILE} exports PM_CONFIG — { mode, site, storage, mail, admin, security }. mode: unconfigured|build|develop; site: name/url/defaultLocale/locales/themeSource/defaultTheme; storage: local|s3 (+publicUrlEnv, localDir); mail: console|smtp (+fromEnv); admin: masterEmailEnv/twoFactor; security.requiredEnv (ENV NAMES, never values).`,
    'It is deliberately dependency-free (no $lib imports) because svelte.config.js imports it for the media CSP origin — never add $lib imports or secrets to pm.config.ts.',
    'Site instance: src/project/site-config.ts — SITE (site mode onepager|spa), FEATURES, HOMEPAGE_SECTIONS, locales; MODULES is re-exported from the manifest.',
    'ModuleManifest (ADR-04): src/lib/config/modules.ts is the ONE declarative module source; MODULES, ADMIN_CONFIG, ADMIN_NAV_REGISTRY and ADMIN_PAGE_DEFS are derived views. Add a module by adding ONE entry + schema/route/service.',
    'Framework modules: faq, contact (public form), contacts (inquiries), portfolio, blog. Optional disabled-by-default: testimonials, team, pricing, clients, features. There is NO page/CMS module.',
    'Admin pages: dashboard, health, portfolio, blog, faq, contacts, users, roles, translations, settings, legal, audit, security, logs; grouped by navGroup overview/content/system.',
    'Site modes: onepager (default) stacks active sections on / with anchors; spa renders each section at its own route; resolveNavItemHref maps nav items.',
    'Locales: ru (default) + en in this instance; adding a locale follows docs/architecture/i18n-database-owned-translations.md §4 (site-config → Paraglide → messages → legal → seed → validator).',
    'Framework ↔ project boundary: src/lib/** and src/routes/** are framework; src/project/** is the replaceable instance layer (docs/framework-project-boundary.md).',
    'AGENTS.md is authoritative project guidance; pm_knowledge is a cache of its rules.',
  ],
  rtl: [
    'RTL: Tailwind logical properties — ms-/me-/ps-/pe-/start-/end-; never left/right physical spacing.',
    'dir is set on <html> from the active Paraglide locale text direction.',
    'Paraglide locales: ru (default) + en in this instance; RTL is framework-supported, not enabled by default.',
    'Fonts via @fontsource: Inter (Latin), Montserrat, JetBrains Mono; declared in the theme layer.',
    'Nav/locale switching lives in the header; isNavItemEnabled gates module nav items in header, sheet and footer.',
  ],
  rules: [
    'PM4 RULES — SvelteKit 2 + Svelte 5 runes + Tailwind v4. AGENTS.md is authoritative; canonical rulebook: docs/contributing/pm4-style-rules.md.',
    '1. NO literal design values in markup — token-reference brackets [var(--token)] only; consult docs/design-tokens.md before inventing a token.',
    '2. NO BEM/global component classes and NO <style> blocks; reusable patterns are components.',
    '3. MANDATORY primitive contract: use canonical ui/ primitives (import from ui/index.ts) and the class prop + twMerge(clsx(...)).',
    '4. NO any, @ts-ignore/@ts-expect-error/@ts-nocheck, non-null assertions (!) or eslint-disable of @typescript-eslint rules.',
    '5. NO empty catches: log, rethrow with context, or return a typed error.',
    '6. Dark mode: class-based .dark + light-dark() derivations; never light-dark() inside component classes.',
    '7. Config-driven: FEATURES/MODULES from $lib/config/site; module state from the ModuleManifest (src/lib/config/modules.ts); one switch gates admin + route + nav.',
    '8. Database: async libSQL only; routes import services, never $lib/server/db; Drizzle ORM only, no raw SQL.',
    '9. Zod on ALL inputs; error envelope { success: false, error: { code, message } }.',
    '10. i18n: every user-facing string via t(); literal UI strings fail validator check #10.',
    '11. Every exported component has JSDoc description + @props + @example.',
    '12. Translations: every join filters by locale; content entities use *_translations tables.',
    '13. Self-check: npm run check → 0 errors; npm run validate:pm4; npm run lint; npm test.',
  ],
  security: [
    'HTTP Security Headers: CSP, X-Frame-Options: DENY, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP, CORS allowlist (docs/architecture/security-headers.md).',
    'A01 Broken Access Control — requireAuth(), requireRole(), requirePageAccess(), verify ownership before mutation',
    'A02 Cryptographic Failures — scrypt for passwords, AES-256-GCM for secrets, timingSafeCompare',
    'A03 Injection — Drizzle ORM (no raw SQL), Zod validation, sanitizeHtml(), magic byte file validation',
    'A04 Insecure Design — rate limiting, CSRF tokens, account lockout (5 fails → 30 min), audit logging',
    'A05 Security Misconfiguration — env validation plugin, setup guard, no default passwords, HTTPS/HSTS/CSP in prod',
    'A06 Vulnerable Components — npm audit, Renovate auto-merge security patches',
    'A07 Auth Failures — HttpOnly Secure SameSite cookies, TOTP 2FA, password policy (8+ chars, upper, lower, digit, special)',
    'A08 Data Integrity — ClamAV virus scanning, magic byte validation for uploads',
    'A09 Logging & Monitoring — audit login/login_failed/password_change/role_change/user CRUD, Sentry strip secrets',
    'A10 SSRF — validate user-supplied URLs, restrict internal network access',
    'CSRF: crypto.randomBytes(32) token → pm-csrf cookie (HttpOnly Secure SameSite=Strict) → x-csrf-token header → timingSafeEqual verify',
    'Auth guards: requireAuth(event) for 401, requireRole(user, "admin") for 403, requirePageAccess(user, route) for admin UI',
    'Input: Zod validate ALL API inputs, sanitizeHtml() for user content, escapeHtml() for attributes',
    'File upload: validateImageFile() for magic bytes, scanFileForViruses() via ClamAV',
    'Password: scryptSync(password, salt, 64, {N:16384, r:8, p:1}) — store hex(salt):hex(hash) — verify with timingSafeEqual',
    'Encryption: AES-256-GCM, key from PM_SETTINGS_ENCRYPTION_KEY env var (64+ hex chars), format: enc:v1:{iv}:{authTag}:{cipher}',
    'CSP production: script-src "self" "nonce-{random}" "strict-dynamic", style-src "self" "unsafe-inline", img-src "self" data: blob: https:, frame-ancestors "none", form-action "self", upgrade-insecure-requests',
    'Rate limiting: POST /api/auth/login/contact → 5 per 15 min per IP, use createLoginRateLimiter() / createContactRateLimiter()',
    'Security checklist for new features: auth guard? Zod validation? CSRF? rate limit? sanitizeHtml? file upload scan? audit log? encryption? no raw SQL? no stack traces? HttpOnly/Secure/SameSite cookies?',
  ],
  compliance: [
    '152-ФЗ Art. 9 — consent must be specific, informed, conscious (конкретное, информированное, сознательное). Any form: written, electronic, implicit. Proof of consent on operator.',
    '152-ФЗ Art. 21 — data localization: primary database on RF territory. Cross-border transfer allowed AFTER first storage in RF.',
    '152-ФЗ Art. 22 — notify Roskomnadzor before processing starts. Include: operator details, purpose, categories, subjects, legal basis, protection measures, DPO name, cross-border info, RF database confirmation.',
    '152-ФЗ Art. 14 — DSAR response within 10 working days. Subject may demand rectification, blocking, destruction of inaccurate/illegal/excessive data.',
    '152-ФЗ Art. 24 / KoAP 13.11 — fines: processing without consent 150K RUB, no published policy 30K RUB, no DSAR response 45K RUB, localization violation first 6M RUB / repeat 18M RUB.',
    'Cookie consent: no separate cookie law in RF, but consent required per Art. 9. Essential cookies may not need consent. Analytics/marketing REQUIRE consent. Banner with accept/decline, link to privacy policy.',
    'Consent withdrawal: operator must stop processing and destroy data within 30 days unless contract obligations apply.',
    'Cross-border: countries with adequate protection (CoE Convention 108, EU). Others require WRITTEN consent.',
    'Consent template: "Я даю согласие на обработку моих персональных данных, указанных в данной форме, в соответствии с ФЗ от 27.07.2006 № 152-ФЗ. Цель: [purpose]. Состав: [data]. Срок: [term]. Согласие может быть отозвано в любой момент."',
    'PM compliance before launch: publish privacy policy, cookie consent banner, consent proof storage, RKN notification (unless exempt), RF database location, DPO appointed, data protection measures documented.',
    'PM compliance ongoing: DSAR procedure (10 days), consent withdrawal (30 days), annual policy review, employee training, audit log review, threat analysis updates.',
    'Admin panels: admin user data (email, name, role, login history) IS personal data. Must be in policy. Access must be role-limited and logged.',
  ],
}

function compressedRules(project: PmProject | null): string {
  const lines = [
    'PM4 PROJECT — SvelteKit 2 + Svelte 5 runes + Tailwind v4. AGENTS.md is authoritative; this is a cached rule set.',
    '1. NO literal design values in markup; use [var(--token)] refs (docs/design-tokens.md first).',
    '2. Use canonical ui/ primitives from $lib/components/ui (barrel) with class + twMerge(clsx(...)); no <style>, no BEM.',
    '3. Class-based .dark + light-dark() derivations; components use bg-pm-*/text-pm-* tokens.',
    '4. FEATURES/MODULES from $lib/config/site; ModuleManifest (src/lib/config/modules.ts) is the single module source; one switch gates admin + route + nav.',
    '5. DB is async libSQL (@libsql/client); routes import $lib/server/services/*, never $lib/server/db; Drizzle only, no raw SQL.',
    '6. Zod on ALL inputs; errors { success: false, error: { code, message } }; CSRF header on public mutations.',
    '7. i18n: every user-facing string via t(); joins filter by locale.',
    '8. Strict TS: no any, no @ts-ignore/!, no empty catch.',
    '9. Self-check: npm run check, npm run validate:pm4, npm run lint, npm test.',
  ]
  if (project) {
    const mode = String(project.config.mode ?? 'unknown')
    const site = project.config.site as Record<string, unknown> | undefined
    const name = typeof site?.name === 'string' ? site.name : 'unknown'
    const siteMode = typeof site?.defaultLocale === 'string' ? `defaultLocale=${site.defaultLocale}` : ''
    lines.push(`PROJECT: ${name} mode=${mode} ${siteMode}`.trim())
    lines.push(...moduleLines(project))
  } else {
    lines.push('CONFIG: src/project/pm.config.ts was not readable; rely on AGENTS.md.')
  }
  return lines.join('\n')
}

export const knowledgeTools: PmTool[] = [
  {
    name: 'pm_knowledge',
    description:
      'Load the PuppetMaster 4 framework knowledge base: CSS/tokens, components, state, async libSQL database, SvelteKit API patterns, typed config + ModuleManifest, RTL, rules, security, and compliance.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          enum: ['css', 'components', 'state', 'database', 'api', 'config', 'rtl', 'rules', 'security', 'compliance', 'all'],
          description: 'Topic to load, or all',
        },
      },
    },
    async handler(args) {
      const topic = (args.topic as string) || 'all'

      if (topic === 'all') {
        return JSON.stringify(TOPICS, null, 2)
      }

      const items = TOPICS[topic]
      if (!items) return `Unknown topic: ${topic}. Valid: ${Object.keys(TOPICS).join(', ')}`
      return `## ${topic.toUpperCase()}\n\n${items.map((item) => `- ${item}`).join('\n')}\n\nLoad the full framework reference with: pm_knowledge topic=all`
    },
  },
  {
    name: 'pm_knowledge_entrypoint',
    description:
      'Load a PM4 entrypoint document: overview (docs index), greenfield (new project quick start), or brownfield (framework ↔ project boundary for migrating an existing site).',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['greenfield', 'brownfield', 'overview'],
          description: 'Entrypoint to load',
        },
      },
    },
    async handler(args) {
      const root = getProjectRoot()
      const mode = (args.mode as string) || 'overview'

      const files: Record<string, string> = {
        overview: 'docs/README.md',
        greenfield: 'README.md',
        brownfield: 'docs/framework-project-boundary.md',
      }

      const filePath = resolve(root, files[mode])
      if (!existsSync(filePath)) {
        const docsDir = resolve(root, 'docs')
        const available = existsSync(docsDir) ? readdirSync(docsDir).filter((entry) => entry.endsWith('.md')).sort() : []
        return `Entrypoint doc not found: ${files[mode]}. The PM4 docs index is docs/README.md. Available docs: ${available.join(', ') || 'none'}`
      }

      const content = readFileSync(filePath, 'utf-8')
      return `## ${mode.toUpperCase()} ENTRYPOINT\n\n${content}\n\nOther entrypoints: pm_knowledge_entrypoint mode=greenfield|brownfield|overview`
    },
  },
  {
    name: 'pm_knowledge_contributing',
    description:
      'List or read PM4 contribution documents. Contributions are fixes/features exported from client projects for application back into the PM framework. Stored in docs/contributing/.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'read'],
          description: 'list all contribution docs, or read a specific one',
        },
        file: {
          type: 'string',
          description: 'Filename to read (only when action=read)',
        },
      },
    },
    async handler(args) {
      const root = getProjectRoot()
      const action = (args.action as string) || 'list'
      const contribDir = resolve(root, 'docs/contributing')

      if (!existsSync(contribDir)) return 'No docs/contributing/ directory found.'

      if (action === 'list') {
        const files = readdirSync(contribDir).filter((file) => file.endsWith('.md')).sort()
        if (files.length === 0) return 'No contribution documents found.'
        return files.map((file, index) => `${index + 1}. ${file}`).join('\n')
      }

      if (action === 'read') {
        const fileName = args.file as string
        if (!fileName) return 'Specify a filename with file= parameter. Use action=list first.'

        const filePath = resolve(contribDir, fileName)
        if (!existsSync(filePath)) return `Contribution "${fileName}" not found.`

        const content = readFileSync(filePath, 'utf-8')
        return `## ${fileName}\n\n${content}`
      }

      return `Unknown action: ${action}`
    },
  },
  {
    name: 'pm_inject_context',
    description:
      'Inject PuppetMaster 4 rules and the project config (typed PM_CONFIG + ModuleManifest state) into the agent context. Called automatically by NoCowboy when a PM4 project is detected.',
    inputSchema: {
      type: 'object',
      properties: {
        projectDir: {
          type: 'string',
          description: 'Project root directory path',
        },
      },
    },
    async handler(args) {
      const projectDir = (args.projectDir as string) || getProjectRoot()

      let project: PmProject | null = null
      try {
        project = await loadConfig(projectDir)
      } catch {
        project = null
      }
      if (!project) return ''

      return compressedRules(project)
    },
  },
]
