# Engineering Rules (Global — applies to all projects)

## Git
- Default branch is ALWAYS `master` — never `main`. Do not suggest renaming or use `main` in commands or examples.
- **NEVER push.** Commit only. Pushing requires an explicit user request. Never suggest pushing, never push automatically.

## Plans Location\n- **ALWAYS save plans in `docs/`** (project root). Never in `.kilo/`, `.opencode/`, `.local/share/kilo/plans/`, or any hidden directory.\n- Plan files go to `docs/plans/<kebab-case-name>.md`. Plan is finalized with `plan_exit`.\n\n## Anti-Suppression Rule — THE NOCOWBOY GOLDEN RULE\n- **ABSOLUTELY FORBIDDEN:** When encountering an error, lint failure, type error, or test failure, the agent MUST fix the ROOT CAUSE. Never silence, suppress, bypass, disable, or work around the issue.\n- **Specifically forbidden actions:**\n  - Adding `// @ts-ignore`, `// @ts-expect-error`, `// @ts-nocheck`, or any `!` non-null assertion to bypass type errors\n  - Adding `// eslint-disable-next-line` or `/* eslint-disable */` to suppress lint rules\n  - Empty catch blocks: `catch (e) {}` — every catch must handle or re-throw\n  - Changing a test to pass by lowering the assertion bar (e.g., `expect(x).toBe(y)` → `expect(x).toBeDefined()`)\n  - Commenting out failing code instead of fixing it\n  - Changing a lint rule from `error` to `warning` to bypass CI\n  - Removing or skipping a failing test instead of fixing the tested code\n- **Exception:** A suppression MAY be used as a TEMPORARY measure, but ONLY if:\n  1. A comment explains WHY the issue exists and WHY it can't be fixed now\n  2. A tracking issue/task is created immediately\n  3. The suppression is tagged with a date/ticket reference\n- **Constitution enforcement:** The Constitution MCP server has a rule `no-type-suppressions` that detects `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, and empty catch blocks. This rule runs pre-commit and blocks any suppression without a reason comment.\n\n## No Deferring — THE THIRD GOLDEN RULE

- **ABSOLUTELY FORBIDDEN:** Marking any task, issue, or problem as "deferred", "cosmetic", "отложим", "low priority", "for later", "out of scope", "phase 2", or any similar future-tense label that avoids fixing it NOW.
- **Every problem found MUST be fixed immediately.** No backlog. No tracking issues for things you can fix right now.
- **If you can fix it today in under 30 minutes, DO IT.** Do not suggest deferring even if the fix is minor.
- **Exceptions (only these):**
  1. Fix requires external dependency not yet available (e.g., "waiting for Cloudflare to approve domain")
  2. Fix requires hardware/infrastructure not yet provisioned (e.g., "needs GPU server deployed first")
  3. Fix is explicitly contradicted by user (user says "leave this for now, I'll handle it")
- **"Cosmetic" is NOT an exception.** If a log message says "kilo" when it should say "nocowboy", fix it today.
- **"Low priority" is NOT an exception.** Low priority means "do it last", not "skip it."
- **Tests validate code, not the other way around.** When a test fails, fix the code. Never change the test to match broken code unless the assertion itself is wrong after intentional refactoring.

## No Workarounds Rule — THE FOURTH GOLDEN RULE\n- **ABSOLUTELY FORBIDDEN:** Choosing a workaround, hack, or shortcut over fixing the actual root cause. This applies to ALL code changes, not just error handling.\n- **The Root Cause Test:** Before EVERY fix, the agent MUST answer: \"Is this fixing the ACTUAL broken code, or is it patching around the symptom?\" If the answer is the latter, find and fix the root cause.\n- **The Excuse Test:** Before EVERY deferral or scope reduction, the agent MUST answer: \"Am I avoiding this because it's genuinely impossible, or because it requires more work than I want to do?\" If the answer is the latter, do the work.\n- **Specifically forbidden behaviors:**\n  - Adding null/error checks around code that shouldn't produce null/errors (fix the source instead)\n  - Duplicating code instead of fixing a shared module\n  - Adding special-case branches instead of fixing the general logic\n  - Using delays/timeouts to mask async bugs\n  - Implementing \"simplified versions\" of requirements\n  - Declaring work \"out of scope\" without user confirmation\n  - Saying \"this would require a major refactor\" without measuring the actual scope\n\n## i18n — NO RAW TEXT STRINGS EVER\n- **ABSOLUTELY FORBIDDEN:** Hardcoded text strings, labels, messages, titles, descriptions, or any user-visible text directly in code. Zero exceptions.\n- Every text string MUST use an i18n variable/key. No literals like `"Welcome"`, `'Error'`, `` `Hello ${name}` ``. Use `t('welcome')`, `$t('error.title')`, `formatMessage({ id: 'hello', values: { name } })` or equivalent.\n- This applies to: UI labels, error messages, console.log/output strings, tool descriptions, MCP tool names/descriptions, rule messages, status text, comments that describe intent — everything.\n- Exception: log strings that are NOT user-facing AND have no i18n infrastructure in the project. But prefer i18n even for logs.\n- i18n keys must follow: `<module>.<context>.<purpose>` (e.g. `auth.login.submit`, `constitution.rule.noAnyType.message`).\n- Translation files go to `locales/<lang>.json` or equivalent per project convention.\n- When adding a new text string, ALWAYS add the key to all active locale files first, then reference it by key.\n\n## Code Quality\n- Never emit placeholders, `// TODO`, or truncated code blocks. All generated code must be complete and syntactically valid.
- Prefer lightweight, single-responsibility structures. Do not over-engineer.
- No unnecessary comments. Code should be self-documenting.

## Communication & Output
- Be direct and concise. Use bullet points and tables, not walls of text.
- Present architectures in plain Markdown. No complex formatting or diagrams unless explicitly requested.
- One-word or single-sentence answers when that suffices. No preamble or postamble.

## Answering "will X work" questions — STRICT RULES
- **ABSOLUTELY FORBIDDEN:** Answering "X won't work" without specifying the exact conditions under which it DOES work. Every approach must be evaluated in ALL relevant contexts.
- **Mandatory format** for "does X work" questions: list a decision table with columns: Context | Works? | Why.
- If a user asks "will X work" and the answer differs by context, you MUST list ALL contexts explicitly. A one-word or single-context answer is grounds for agent failure.
- When comparing multiple approaches, produce a comparison table, not prose.
- **CRITICAL:** Never discard a viable path without testing all permutations (user vs root, Wayland vs X11, with env vars vs without, bundled libs vs system libs, etc.). List each permutation's result explicitly.
- After contradicting yourself, apologize EXACTLY ONCE, immediately correct the record with a clear side-by-side comparison of what was said vs what is true, and move on. No over-explaining, no defending the mistake.

## Tool Discipline
- Use the most direct tool for the job. Do not chain tools when one suffices.
- Batch independent tool calls in parallel.
- Do not ask for confirmation on obvious next steps.
- Do not run builds or production commands unless explicitly asked.

## Integrity
- Be anti-sycophantic — do not fold arguments just because the user pushes back. Prioritize correctness over agreement.
- Persist through failures — fix problems until they are resolved. Search the web or read docs before giving up.
- State success criteria before starting work — what "done" means and how to verify it.

## Security (CRITICAL)
- **NEVER commit API keys, tokens, passwords, or secrets.** Always use environment variables or `.env` files (gitignored).
- Before any commit, explicitly check staged files for secrets: API keys (`sk-`, `pa-`, `ghp_`, etc.), private keys, passwords.
- If a secret was ever committed (even in past history), it is COMPROMISED — notify the user immediately and recommend rotation.
- Config files with secrets (`nocowboy.json`, `.env`) MUST be in `.gitignore`. Provide `.example` templates with placeholders instead.
- When writing code that needs an API key, inject it via `process.env` or config read at runtime — never hardcode.
- A global pre-commit hook scans for secrets on every commit. If the hook blocks a commit, do NOT use `--no-verify` — fix the problem.

## Error Handling (TypeScript projects)
- `catch` clauses: always `catch (e: unknown)`, never bare `catch`.
- No `any` types — use `unknown`, proper interfaces, or generics.
- No `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, or `!` non-null assertions.
- Discriminated unions with `type`/`status`/`kind` literal discriminators.

### NVIDIA GSP Firmware
- **On driver ≥610, NEVER disable GSP firmware (`NVreg_EnableGpuFirmware=0`)** — GSP handles VRAM preservation during suspend/resume. Without it, GPU memory corrupts on each wake cycle, producing irreversible visual artifacts on all displays.
- ArchWiki GSP warnings are for older drivers (≤525). Not applicable to 610+.

## No Excuses — Do The Work

The following phrases are BANNED:
| Banned Phrase | What It Really Means | What You Must Do Instead |
|---|---|---|
| "This would require a major refactor" | "I don't want to do it" | Assess the actual scope. If it's 5 files and 200 lines, that's not "major" — do it. |
| "This is out of scope" | "I want to do less" | The user defines scope. If the fix requires touching adjacent code, touch it. |
| "For now, we can just..." | "Here comes a hack" | No "for now." Do it properly or don't do it. |
| "A simple workaround would be..." | "I found a hack" | Not a workaround. The real fix. |
| "Good enough for now" | "I'm shipping a hack" | Not "good enough." Correct. Ship correct code or don't ship. |
| "Let's just disable this" | "I don't want to debug it" | Debug it. Find the root cause. Fix it. |
| "This module/feature has issues" | "I want to skip it entirely" | It has issues — that means it needs fixing, not disabling. |

## Complete Implementations Only

- **Implement ALL requirements.** Do not cherry-pick the easy ones and skip the hard ones.
- **Handle ALL edge cases** specified in the requirements.
- **No partial implementations.** "I implemented the basic version" is not acceptable.
- **No TODO/FIXME as escape hatches.** If you write `// TODO: handle edge case X`, you have NOT completed the task.
- **No "happy path only" implementations.** Every function must handle: null/undefined inputs, empty arrays/strings, error conditions, boundary values.

## No Scope Reduction

- **Do not redefine the task to be smaller.** If asked to "implement user authentication," that means the full auth flow.
- **Do not skip parts of the acceptance criteria.** Every criterion must be satisfied.
- **Do not implement a "simplified version."** Implement what was asked.
- **Do not suggest "we can add X later."** Add X now.
- **Read the ENTIRE requirement before starting.** Do not start implementing after reading the first sentence.

## No Lazy Patterns

| Lazy Pattern | Proper Approach |
|---|---|
| Copy-pasting code instead of extracting a shared utility | Create a shared function/module |
| Using magic numbers/strings | Use named constants or config values |
| Inline styles instead of proper CSS classes | Use the project's CSS system |
| String concatenation for SQL/HTML/URLs | Use template literals, builders, or ORM |
| Manual parsing when a library exists | Use the appropriate library |
| One massive function that does everything | Break into small, single-responsibility functions |
| Catching errors silently | Log, handle, or re-throw with context |
| Using `setTimeout` to "fix" timing issues | Fix the actual async flow |
| Ignoring return values | Check and handle every return value |

## Honesty Over Speed

- **Speed is NOT a virtue.** Correctness is. A correct fix that takes 30 minutes beats a hack that takes 5 minutes.
- **If you don't understand the code, READ IT until you do.** Do not guess. Do not assume. Do not "try something and see if it works."
- **If your first approach doesn't work, UNDERSTAND WHY before trying another.** Do not shotgun debug.
- **If you realize mid-implementation that the approach is wrong, STOP and redesign.** Do not push through a bad approach because you've already started.

## Severity Is Not a License to Hack

- **Severity determines WHEN you fix something, never HOW.** A P3 bug gets the same quality fix as a P1 bug.
- **"Not critical" is NEVER a reason to:** use a workaround, skip edge cases, write lower-quality code, leave it half-done.
- **Every issue, regardless of severity, must be fixed** with the same code quality, root cause analysis, and full verification.
- **The test:** Would you write THIS code for a P1 production outage? If no — rewrite it.

## Bash / System Scripts
- **Sudo is FORBIDDEN:** Never call `sudo` directly in automation. Every bare `sudo` call after credential timeout (5 min) counts as a failed PAM auth — even with `2>/dev/null`. After 5 failures pam_faillock locks the user out. This is a SYSTEM-WIDE REQUIREMENT.
- **GUI sudo prompt ONLY:** When sudo is needed, use kdialog to ask the user for the password, then pipe it to `sudo -S`. Use this pattern:
  ```bash
  PASSWORD=$(kdialog --password "Enter sudo password for: <description>")
  if [ -n "$PASSWORD" ]; then
    echo "$PASSWORD" | sudo -S <command>
  fi
  ```
  A helper script is available at `~/.local/bin/gui-sudo`.
- Do NOT use `SUDO_ASKPASS` — it does not work reliably with kdialog on this system.
- Do NOT retry sudo on failure — script bails out, user retries manually if needed.
