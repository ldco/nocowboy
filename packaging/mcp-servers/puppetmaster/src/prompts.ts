import type { Prompt, GetPromptResult } from '@modelcontextprotocol/sdk/types.js'

export interface PmPrompt extends Prompt {
  template: (args: Record<string, unknown>) => string
}

export const prompts: PmPrompt[] = [
  {
    name: 'pm_build_and_deploy',
    description: 'Build and deploy the PuppetMaster project to VPS',
    arguments: [],
    template() {
      return `## pm_build_and_deploy

Build the PM project and deploy to VPS. Follow these steps:

1. **Build** — call \`pm_build\` to run the production build
2. **Check status** — call \`pm_status\` to verify the build succeeded
3. **Deploy** — call \`pm_deploy\` to deploy via Docker/Ansible
4. **Verify** — call \`pm_status\` again to confirm the deployment is healthy

Report: build status, deploy duration, and health check results.`
    },
  },
  {
    name: 'pm_init_project',
    description: 'Initialize a new PuppetMaster project',
    arguments: [
      {
        name: 'mode',
        description: 'Mode: develop or build',
        required: false,
      },
    ],
    template(args) {
      const mode = (args.mode as string) ?? 'develop'
      return `## pm_init_project

Initialize a new PuppetMaster project in ${mode} mode. Follow these steps:

1. **Init** — call \`pm_init\` with mode="${mode}" to set up the project
2. **Configure** — call \`pm_config_set\` for any needed settings
3. **Database** — call \`pm_db_push\` to create and push the schema
4. **Seed** — call \`pm_db_seed\` to populate initial data
5. **Status** — call \`pm_status\` to verify everything is ready

Report: init status, database state, and next steps for the user.`
    },
  },
  {
    name: 'pm_db_full_reset',
    description: 'Full database reset — wipe, push schema, seed',
    arguments: [],
    template() {
      return `## pm_db_full_reset

Reset the database completely. Follow these steps:

1. **Reset** — call \`pm_db_reset\` to delete the database and recreate it
2. **Push schema** — call \`pm_db_push\` to apply the current schema
3. **Seed data** — call \`pm_db_seed\` to populate with initial data
4. **Verify** — call \`pm_db_studio\` to confirm tables exist

⚠️ WARNING: This destroys all existing data. Confirm with the user before proceeding.

Report: reset status, tables created, seed data loaded.`
    },
  },
  {
    name: 'pm_review_full',
    description: 'Full quality review — lint, types, tests',
    arguments: [
      {
        name: 'scope',
        description: 'Review scope: full, lint, types, or tests (default: full)',
        required: false,
      },
    ],
    template(args) {
      const scope = (args.scope as string) ?? 'full'
      return `## pm_review_full

Run a full quality review (scope: ${scope}). Follow these steps:

1. **Lint** — call \`pm_review_run(scope: "${scope === 'types' ? 'lint' : scope}", fix: true)\` to run lint checks
2. **Typecheck** — call \`pm_lint\` or \`pm_review_run\` for type checking
3. **Tests** — call \`pm_test\` to run the test suite (if scope is 'full' or 'tests')
4. **Report** — format results in a table:
   \`\`\`
   | Check | Status | Details |
   |-------|--------|---------|
   | Lint | ✅ | 0 errors |
   | Types | ✅ | Clean |
   | Tests | ✅ | All passed |
   \`\`\`

If any check fails, report the specific errors and suggest fixes.`
    },
  },
  {
    name: 'pm_contribute_workflow',
    description: 'Export a fix/feature as a contribution to the PM framework',
    arguments: [
      {
        name: 'summary',
        description: 'One-line summary of the contribution',
        required: true,
      },
    ],
    template(args) {
      const summary = (args.summary as string) ?? 'untitled'
      return `## pm_contribute_workflow

Export changes as a PuppetMaster framework contribution. Follow these steps:

1. **Describe** — the contribution summary is: "${summary}"
2. **Export** — call \`pm_contribute_export(summary: "${summary}", type: "bugfix", ...)\` to generate the .pm-contribution.md doc
3. **Verify** — call \`pm_contribute_list\` to confirm the contribution was registered
4. **Read** — call \`pm_contribute_read\` on the new file to verify content

Report: contribution file path, what was exported, and the next steps for applying it back to the PM framework.`
    },
  },
]

export function resolvePrompt(name: string, args: Record<string, unknown>): GetPromptResult {
  const prompt = prompts.find(p => p.name === name)
  if (!prompt) throw new Error(`Unknown prompt: ${name}`)

  return {
    description: prompt.description,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: prompt.template(args),
        },
      },
    ],
  }
}
