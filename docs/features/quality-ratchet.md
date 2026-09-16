# Quality ratchet

Two audit findings, guarded so they can only improve: empty `catch {}` blocks
that hide failures, and `as any` type escape hatches.

```
bun scripts/quality-ratchet.ts            # verify (exit 1 on regression)
bun scripts/quality-ratchet.ts --update   # accept the current numbers
```

It runs in the pre-commit hook (fast, blocking), after the typecheck.

## Rules

1. **An empty catch must explain itself.** Swallowing is legitimate, but the
   block has to say why — either a comment inside the braces or a trailing
   comment on the same line:

   ```ts
   try { await fs.access(upper) } catch { /* absence is the expected signal */ }
   ```

   The count of unexplained empty catches must stay at **0**.

2. **`as any` may not grow.** The current count is the baseline; a change that
   adds one fails the hook until the escape hatch is removed or the baseline is
   deliberately raised (which shows up as a reviewed diff in
   `scripts/quality-baseline.json`).

## Scope

`packages/opencode/src`, `packages/core/src`, `packages/llm/src` — the shipping
code, not tests or vendored files.

## History

The first run found 31 unexplained empty catches and 60 `as any`. Each catch was
annotated with the real reason (best-effort cleanup, a probe where absence is the
signal, fire-and-forget wiring, malformed input falling back to a generic path),
which turned "silent failure" into "documented decision" without changing
behaviour.
