# Known Issues — NoCowboy v0.11.0 (alpha)

Last updated: 2026-08-04

## No Critical Bugs

All critical paths pass: tests (493/493), typecheck (0 errors), dev server starts.

## Minor Issues

| Issue | Severity | Workaround |
|-------|----------|------------|
| Node.js `HeadersInit` type not found in plugin SDK | Low | DOM lib not included — does not affect runtime |
| 2 missing optional plugin packages (gitlab-auth, poe-auth) | Low | Stub declarations added — no runtime effect |
| HttpApi SDK `serverPathParity` requires provider config on raw path | Low | Fixed in tests — default path works |

## Post-Alpha

| Area | Status |
|------|--------|
| Knowledge Graph | Planned (v0.13) |
| Deep Context 2M | Planned (v0.13) |
| Agent Teams UI | Planned (v0.13) |
| Turso sync | Blocked (needs Turso production) |

## Verdict

**Ready for alpha release.** No critical bugs found.
