# Concept review: cross-model review cascade

Question from the owner: is a two-phase cross-model review worth the API tokens,
or is it just burning money?

## What the concept is

- Phase 1: reviewer model is chosen from the author's model family
  (DeepSeek author → Qwen reviewer; Qwen author → DeepSeek reviewer).
- Phase 2: a second model reviews the phase-1 review — either a third model or
  the author's model.

## Does it work? — the mechanism

Yes, the mechanism is sound and cheap to implement:

- **Correlated errors are real.** A model reviewing work from its own family
  shares training biases, formatting habits and failure modes. An independent
  family is a genuinely different error distribution, which is the whole point
  of a second opinion.
- **Self-critique is weaker than external critique.** A single model asked to
  check itself tends to confirm its earlier conclusion. Handing the review to a
  different model breaks that loop.
- **Phase 2 on the review (not the code) is the high-value part.** The first
  review is a short artifact; verifying it is cheap relative to re-reading the
  whole diff, and it targets exactly the failure that hurts most — a confident
  false "looks good".

## Does it pay off? — the economics

- Review tokens are a small fraction of a coding task. Generation and the
  read/understand loop dominate. Doubling review roughly adds **10–25%** of the
  review slice, i.e. a low single-digit percentage of the task.
- The expensive tail is a defect that ships (security, data loss, release
  breakage). One caught bug pays for many double reviews.
- Phase 2 can reuse the **author's** model, which is already paid for and warm.

Conclusion: **not a waste for non-trivial work; waste for trivial work.**
Therefore it must be opt-in and configurable, never always-on. A two-line typo
fix does not need two reviewers.

## When to enable

- Security-sensitive changes, migrations, release/version bumps, anything
  touching auth, payments, permissions or data deletion.
- Changes to shared contracts (server routes, schemas, SDK).

## When to leave off

- Formatting, docs, comments, single-line fixes, test-only changes.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Reviewer lacks project conventions | Full context + acceptance criteria already in the task prompt |
| Extra latency on the critical path | Opt-in per settings; phase-2 failure degrades to phase-1 |
| Cost creep from always-on | Disabled by default; explicit `review.cascade.enabled` |
| Second model reviewing the first's wording, not the code | Phase-2 prompt explicitly demands independent verification against the code |
| Both models share a provider outage | Phase-2 failure is non-fatal by design |

## Implementation verdict

Implemented as configuration (`review.cascade`), disabled by default, with a
pure resolver and tests. See `docs/features/review-cascade.md`.

Recommended default for teams that opt in: enable the cascade, map author
families to a different family, and set `second_phase` to `author`.
