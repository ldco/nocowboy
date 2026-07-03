import type { PmTool } from './index.js'
import { getProjectRoot } from './utils.js'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

export const knowledgeTools: PmTool[] = [
  {
    name: 'pm_knowledge',
    description:
      'Load the Puppet Master framework knowledge base. Returns CSS system, component architecture, composables, database schema, API patterns, config system, and RTL reference.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          enum: ['css', 'components', 'composables', 'database', 'api', 'config', 'rtl', 'rules', 'security', 'compliance', 'all'],
          description: 'Topic to load: css, components, composables, database, api, config, rtl, rules, security, compliance, or all',
        },
      },
    },
    async handler(args) {
      const root = getProjectRoot()
      const topic = (args.topic as string) || 'all'

      const topics: Record<string, string[]> = {
        css: ['CSS SYSTEM (Pure CSS, No Frameworks)', '5-layer architecture', '4 color primitives (OKLCH)', 'auto-calculated colors', 'typography', 'BEM naming', 'NO scoped styles'],
        components: ['Atomic Design (atoms → molecules → organisms → sections)', 'Script setup lang="ts"', 'Typed props/emits', 'Icon imports from ~icons/tabler/', 'No inline styles', 'No <style> blocks', 'Auto-import prefixes: Atoms, Molecules, Organisms, Sections'],
        composables: ['useConfig() — config access', 'useAuth() — user & login', 'useToast() — notifications', 'useConfirm() — dialogs', 'useLogo() — logo URLs', 'useI18n() — translations', 'useReveal() — scroll animations', 'useScrollSpy() — section tracking'],
        database: ['Drizzle ORM + SQLite', 'Schema in server/database/schema.ts', 'Tables: users, roles, sessions, settings, portfolios, blog_posts, team_members, testimonials, faq_items, pricing_tiers, clients, audit_logs, contact_submissions, translations', 'Migrations via npm run db:push'],
        api: ['Nitro/H3 endpoints in server/api/', 'Zod validation required', 'createError() for errors', 'requireAuth(event) for auth', 'Audit logging', 'Response: { success: true, data }', 'Admin routes: server/api/admin/', 'Auth routes: server/api/auth/'],
        config: ['Config in project/puppet-master.config.ts', 'pmMode: unconfigured | build | develop', 'entities: { website, app }', 'features: 30+ feature flags', 'modules: blog, portfolio, team, pricing, testimonials, faq, clients, features, contact', 'admin: RBAC with system + websiteModules', 'locales: multi-language with RTL support', 'colors: 4 primitives (black, white, brand, accent)'],
        rtl: ['RTL locales: he, ar, fa, ur', 'Logical properties: margin-inline-start, padding-inline-end', ':dir(rtl) selector', 'Russian: Cyrillic, Yandex', 'Japan: CJK, quality standards', 'China: Simplified Chinese, Baidu, mobile-first', 'France: GDPR, formal tone', 'Israel: RTL, startup culture, security'],
        rules: [
          'CRITICAL RULES:',
          '1. NO scoped styles in .vue — global CSS only',
          '2. BEM naming: .component__element--modifier',
          '3. CSS variables only — never hardcode colors',
          '4. light-dark() for theme switching',
          '5. No <style> blocks in .vue files',
          '6. ZERO "any" types — use "unknown"',
          '7. catch clauses: catch (e: unknown)',
          '8. No @ts-ignore, @ts-expect-error, or ! non-null',
          '9. Discriminated unions with type/status/kind literal',
          '10. switch exhaustiveness: const _exhaustive: never = value',
          '11. Zod validation on all API inputs',
          '12. Drizzle ORM only — no raw SQL',
          '13. Audit log security-sensitive actions',
          '14. NEVER touch public/madebylogos/',
          '15. No custom section CSS unless unavoidable',
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
]
