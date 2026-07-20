import type { PmTool } from './index.js'
import { getProjectRoot } from './utils.js'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

export const knowledgeTools: PmTool[] = [
  {
    name: 'pm_knowledge',
    description:
      'Load the Puppet Master framework knowledge base. Returns CSS system (Tailwind v4 + PM tokens), Svelte component architecture, state/actions, database schema (Drizzle + SQLite), SvelteKit API patterns, config system, RTL, rules, security, and compliance.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          enum: ['css', 'components', 'state', 'database', 'api', 'config', 'rtl', 'rules', 'security', 'compliance', 'all'],
          description: 'Topic to load: css (Tailwind v4 + PM tokens), components (Svelte 5 pattern), state ($state + actions), database, api (SvelteKit routes), config, rtl, rules, security, compliance, or all',
        },
      },
    },
    async handler(args) {
      const root = getProjectRoot()
      const topic = (args.topic as string) || 'all'

      const topics: Record<string, string[]> = {
        css: [
          'CSS SYSTEM: Tailwind CSS v4 + PM design tokens in @theme',
          'app.css = @theme tokens + @layer base (reset + :root variables + .dark {}) + @keyframes + hamburger ONLY',
          'Class-based dark mode (.dark {}), NOT light-dark()',
          'Tailwind utilities ONLY in components — 0 CSS files in .svelte',
          '4 color primitives: brand, bg, text, border → --color-pm-* tokens',
          'Fluid typography: text-fluid-xs through text-fluid-hero (clamp-based)',
          'Semantic spacing: --h-header, --pt-section, --px-container, --gap-*',
          'CONFIG-DRIVEN widths: FEATURES.headerFooterWidthMode + FEATURES.bodyWidthMode',
          'NO global CSS classes (.btn, .card, .section) — components self-style via Tailwind',
          '@layer components: hamburger ONLY (complex pseudo-elements)',
          'RTL: Tailwind handles automatically via ms-/me-/ps-/pe-/start-/end- logical properties',
        ],
        components: [
          'SVELTE 5 RUNES API: $state(), $derived(), $props(), $effect()',
          'Component dirs: atoms/ (BackToTop, Card, Badge...) + molecules/ + complex/ + sections/ (61 total)',
          'MANDATORY PATTERN: clsx + twMerge + class prop — in EVERY component',
          '<script lang="ts"> import { clsx } from "clsx"; import { twMerge } from "tailwind-merge";',
          'let { class: className = "" }: { class?: string } = $props();',
          '<div class={twMerge(clsx("base-tailwind", className))}>',
          'NO <style> blocks — ZERO CSS in .svelte files',
          'Section components: pt-[var(--pt-section)] pb-16, max-w-container, px-[var(--px-container)]',
          'Config access: import { FEATURES, MODULES } from "$lib/config/site"',
          'SectionRenderer checks MODULES[sectionId].enabled before rendering',
          'Inline SVG for icons — NO icon libraries',
          'Actions (Svelte use: directives): use:scrollSpy, use:reveal, use:scrollytelling',
        ],
        state: [
          'STATE: $state() + $derived() — NO global Svelte stores except theme + i18n',
          'Config via $page.data: FEATURES, MODULES, config, session (from SvelteKit server load)',
          'Auth: cookies + locals.session via hooks.server.ts',
          'i18n: Paraglide t() for UI strings + DB translations table for content',
          'Conditional classes: const isContained = $derived(FEATURES.bodyWidthMode === "contained")',
          'Module gates: if (!MODULES.team.enabled) return null',
          'CookieConsent: FEATURES.cookies gate',
          'Multi-language: FEATURES.multiLangs gate in TheHeader LangSwitcher',
          'Dark mode: FEATURES.doubleTheme gate + ThemeToggle component (+ page class toggle)',
          'GSAP: timeline() in SectionHero (logo zoom-out, screen shake, TextPlugin typing)',
          'FallingLetters: Matter.js + Canvas (400 particles, chaos→order)',
          'ScrollReveal: IntersectionObserver-based in actions/',
        ],
        database: [
          'Drizzle ORM + SQLite (same as PM v2)',
          'Schema: drizzle.config.ts → data/schema/',
          'Tables (31): users, roles, sessions, settings, portfolios, blog_posts, team_members, testimonials, faq_items, pricing_tiers, clients, audit_logs, contact_submissions, translations...',
          'Migrations: npm run db:push + npm run db:migrate',
          'Seeding: npm run db:seed + npm run db:reset',
        ],
        api: [
          'SVELTEKIT SERVER ROUTES: src/routes/api/ + src/routes/admin/api/',
          'Zod validation required on ALL inputs',
          'API envelope: { success: true, data } / throw error(status, message)',
          'Auth: locals.session из cookies (hooks.server.ts)',
          'Admin: RBAC master→admin→editor per module',
          'Server-only modules: $lib/server/',
        ],
        config: [
          'Config: project/puppet-master.config.ts (same as PM v2)',
          'FEATURES: pmMode, headerFooterWidthMode, bodyWidthMode, onepager, cookies, multiLangs, doubleTheme, interactiveHeader, hideHeaderOnScroll, backToTop, footerNav, footerLegalLinks, footerMadeBy, footerMadeWith, footerCta, pageTransitions, scrollytelling, heroParallax, PWA',
          'MODULES: blog, portfolio, team, pricing, testimonials, faq, clients, features, contact',
          'Admin: RBAC with system + websiteModules, locales: multi-language with RTL',
          'Colors: 4 primitives (brand, bg, text, border) → --color-pm-* in @theme',
          'Logo: form × theme × language (3-factor system), auto-inversion dark→light theme',
        ],
        rtl: [
          'RTL: Tailwind handles automatically via logical properties',
          'Classes: ms-* (margin-inline-start), me-* (margin-inline-end), ps-*, pe-*, start-*, end-*',
          'dir="%paraglide.textDirection%" in app.html',
          'RTL locales: he, ar, fa, ur',
          'Font: Heebo (Hebrew), Geologica (Cyrillic), Inter (Latin) — in @theme',
          'LangSwitcher in TheHeader (FEATURES.multiLangs gate)',
        ],
        rules: [
          'PM v3 RULES — SvelteKit + Tailwind v4:',
          '1. NO arbitrary values [...] except CSS functions — use @theme tokens instead',
          '   ❌ text-[clamp(1.75rem,4vw,2.5rem)] → ✅ text-fluid-3xl',
          '   ❌ max-w-[1280px] → ✅ max-w-container',
          '   ❌ bg-[#901504] → ✅ bg-pm-brand',
          '2. @theme tokens for ALL reusable values',
          '   --color-pm-* → bg-pm-brand, text-pm-text, border-pm-border',
          '   --text-fluid-* → text-fluid-3xl, text-fluid-hero',
          '   --* → var(--h-header), var(--pt-section), var(--px-container)',
          '3. COMPONENT PATTERN (mandatory in EVERY .svelte):',
          '   clsx + twMerge + $props() class prop — accepts class override',
          '   NO wrapper divs — use class prop directly',
          '4. NO global CSS classes — ZERO .btn, .card, .section, .data-table',
          '5. Dark mode: .dark {} class selector — NOT light-dark()',
          '6. Config-driven widths: FEATURES.headerFooterWidthMode + bodyWidthMode',
          '7. ZERO "any" types — use "unknown"',
          '8. catch clauses: catch (e: unknown)',
          '9. No @ts-ignore, @ts-expect-error, or ! non-null assertion',
          '10. Zod validation on ALL inputs',
          '11. Drizzle ORM only — no raw SQL',
          '12. Self-check before commit:',
          '   grep -r "text-\\[" src/ --include="*.svelte" → 0 results',
          '   grep -r "max-w-\\[" src/ | grep -v "max-w-\\[min\\|max-w-\\[var" → 0',
          '   npm run check → 0 errors',
        ],
        security: [
          'HTTP Security Headers: CSP, X-Frame-Options: DENY, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP, CORS allowlist',
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

      if (topic === 'all') {
        const result: Record<string, string[]> = {}
        for (const [key, items] of Object.entries(topics)) {
          result[key] = items
        }
        return JSON.stringify(result, null, 2)
      }

      const items = topics[topic]
      if (!items) return `Unknown topic: ${topic}. Valid: ${Object.keys(topics).join(', ')}`
      return `## ${topic.toUpperCase()}\n\n${items.map(i => `- ${i}`).join('\n')}\n\nLoad the full framework skill with: pm_knowledge topic=all`
    },
  },
  {
    name: 'pm_knowledge_entrypoint',
    description:
      'Load greenfield or brownfield entrypoint documentation. Greenfield = new project from PM baseline. Brownfield = migrating existing codebase into PM.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['greenfield', 'brownfield', 'overview'],
          description: 'Entrypoint to load: greenfield (new project), brownfield (migration), or overview (decision tree)',
        },
      },
    },
    async handler(args) {
      const root = getProjectRoot()
      const mode = (args.mode as string) || 'overview'

      const files: Record<string, string> = {
        overview: 'docs/entrypoints/README.md',
        greenfield: 'docs/entrypoints/greenfield-build.md',
        brownfield: 'docs/entrypoints/brownfield-migration.md',
      }

      const filePath = resolve(root, files[mode])
      if (!existsSync(filePath)) return `Entrypoint doc not found: ${files[mode]}`

      const content = readFileSync(filePath, 'utf-8')
      return `## ${mode.toUpperCase()} ENTRYPOINT\n\n${content}\n\nOther entrypoints: pm_knowledge_entrypoint mode=greenfield|brownfield|overview`
    },
  },
  {
    name: 'pm_knowledge_contributing',
    description:
      'List or read PM contribution documents. Contributions are fixes/features exported from client projects for application back into the PM framework. Stored in docs/contributing/.',
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
        const files = readdirSync(contribDir).filter(f => f.endsWith('.md')).sort()
        if (files.length === 0) return 'No contribution documents found.'
        return files.map((f: string, i: number) => `${i + 1}. ${f}`).join('\n')
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
      'Injects Puppet Master v3 rules and project config into the agent context. Called automatically by NoCowboy when a PM project is detected. Returns compressed rules + enabled modules/features.',
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
      const { existsSync: fe, readFileSync: fr } = await import('node:fs')
      const { join } = await import('node:path')

      const projectDir = (args.projectDir as string) || getProjectRoot()
      const configPath = join(projectDir, 'project', 'puppet-master.config.ts')

      if (!fe(configPath)) return ''

      // Read config to extract enabled modules and features
      let configSummary = ''
      try {
        const configRaw = fr(configPath, 'utf-8')
        const modules: string[] = []
        const features: string[] = []

        // Extract module enabled flags
        const moduleRe = /(\w+):\s*\{\s*[^}]*enabled:\s*(true|false)/g
        let m
        while ((m = moduleRe.exec(configRaw)) !== null) {
          const name = m[1]
          const enabled = m[2] === 'true'
          if (['blog', 'portfolio', 'team', 'pricing', 'testimonials', 'faq', 'clients', 'features', 'contact'].includes(name)) {
            modules.push(`${name}=${enabled ? 'ON' : 'OFF'}`)
          }
        }

        // Extract feature flags
        const featRes = [
          { key: 'bodyWidthMode', re: /bodyWidthMode:\s*'(\w+)'/ },
          { key: 'headerFooterWidthMode', re: /headerFooterWidthMode:\s*'(\w+)'/ },
          { key: 'onepager', re: /onepager:\s*(true|false)/ },
          { key: 'cookies', re: /cookies:\s*(true|false)/ },
          { key: 'multiLangs', re: /multiLangs:\s*(true|false)/ },
          { key: 'doubleTheme', re: /doubleTheme:\s*(true|false)/ },
        ]
        for (const { key, re } of featRes) {
          const match = re.exec(configRaw)
          if (match) features.push(`${key}=${match[1]}`)
        }

        if (modules.length) configSummary += `MODULES: ${modules.join(', ')}\n`
        if (features.length) configSummary += `FEATURES: ${features.join(', ')}`
      } catch {}

      // Compressed PM v3 rules
      const rules = [
        'PM v3 PROJECT — SvelteKit + Tailwind v4:',
        '1. NO arbitrary Tailwind [...] (text-[...], max-w-[...], bg-[...]) — use @theme tokens',
        '2. MANDATORY: clsx + twMerge + $props() class prop in EVERY .svelte',
        '3. NO global CSS classes (.btn, .card, .section) — self-style via Tailwind',
        '4. Dark mode: .dark {} class, NOT light-dark()',
        '5. Config: FEATURES.bodyWidthMode, MODULES[sectionId].enabled from $lib/config/site',
        '6. State: $state() + $derived() — no stores except theme/i18n',
        '7. Sections: pt-[var(--pt-section)] pb-16, max-w-container, px-[var(--px-container)]',
        '8. Fluid typography: text-fluid-3xl (sections), text-fluid-hero (h1)',
        '9. i18n: Paraglide t() + DB translations; RTL via Tailwind ms-/me-/ps-/pe-',
        '10. ZERO any, @ts-ignore, ! — use unknown; catch(e:unknown)',
        '11. Zod on ALL inputs; Drizzle ORM only',
        '12. Self-check: grep "text-\\[" src/ → 0; npm run check → 0 errors',
      ].join('\n')

      let result = rules
      if (configSummary) result += '\n\n' + configSummary
      return result
    },
  },
]
