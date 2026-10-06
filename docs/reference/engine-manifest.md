# Engine manifest

`engine-manifest.json` (repo root) is the measurable provenance baseline of the
NoCowboy engine. It is **derived**, not hand-written: `scripts/engine-manifest.ts`
reads git, `package.json` and `backport-ledger.json` and writes the file; the
pre-commit/CI gate runs the same script with `--check` and fails on any drift.

```
bun run scripts/engine-manifest.ts          # regenerate
bun run scripts/engine-manifest.ts --check   # verify (exit 1 on drift/invalid)
```

## Fields

| Section | Meaning |
| --- | --- |
| `engine.name` | Engine name (`NoCowboy`). |
| `engine.rootCommit` / `rootCommitDate` | The immutable fork point — the first NoCowboy commit (`ca721a2`, 2026-06-19). This is the "NoCowboy SHA": it never changes, unlike `HEAD`. |
| `upstream.project` / `url` | The declared upstream (`Kilo Code`, `https://github.com/kilo-org/kilocode.git`). |
| `upstream.declaredVersion` / `declaredTagSha` | The declared upstream version and the SHA its git tag resolves to (`v7.3.46` → `f388b60…`). |
| `upstream.byteMatchEstablished` | Whether a byte-for-byte match between the imported snapshot and that tag/SHA was proved. Currently `false`. |
| `provenance.kind` / `confidence` / `notes` | How the snapshot entered the repo and how far the origin can be trusted. |
| `dependencies` | Engine-shaping dependency versions: OpenTUI (`@opentui/core`, `@opentui/solid`), AI SDK (`ai`, `@ai-sdk/provider`), MCP SDK (`@modelcontextprotocol/sdk`). |
| `backports` | The local upstream backport ledger (`backport-ledger.json`): entry count and status histogram. |

## Provenance confidence

The fork was imported as a **snapshot** declaring Kilo Code `v7.3.46`. It is not
backed by a preserved Git ancestry chain and no upgrade marker
(`.opencode-version`) is present, and the byte-for-byte correspondence between
the snapshot and the upstream `v7.3.46` tag was **never established**. The
manifest therefore records:

- `provenance.kind = "imported-snapshot"`
- `provenance.confidence = "declared"` (not `"verified"`)
- `upstream.byteMatchEstablished = false`

`confidence` may be `verified`, `declared`, or `unknown`. `verified` is only
admissible together with `byteMatchEstablished = true` — the validator rejects a
verified claim that has no proof. This is deliberate: a fork that cannot name its
exact origin must say so, so downstream work (ownership, backport discipline,
upgrade planning) knows which claims rest on evidence and which on a declaration.

## Drift

`--check` re-derives `engine.rootCommit`/`rootCommitDate`, every `dependencies`
version, and the `backports` histogram, and validates the schema. Any mismatch —
a dependency bump, a new backport entry, a bad root SHA — fails the gate, so the
manifest can never silently describe a different engine than the one in the tree.
