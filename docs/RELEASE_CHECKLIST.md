# Public-release checklist

Status: public source review with original-code license pending. Do not interpret unchecked items as completed.

## Owner decisions

- [ ] Owner approves the code license and copyright attribution.
- [ ] Owner approves making this reviewed snapshot public.
- [ ] Description, homepage and topics match the intended public project.
- [ ] A usable private security-reporting route is available.

## Snapshot hygiene

- [ ] Only the explicit source allowlist is included.
- [ ] No old Git history, credentials, runtime state, account identifiers, logs, private records or recovery bundles are included.
- [ ] Production datasets, review samples, poster/media archives and personal images are excluded.
- [ ] Every included binary/font/asset has a documented redistribution basis.
- [ ] Third-party notices are retained; code/data/art license boundaries are explicit.
- [ ] Synthetic data is visibly labeled and never presented as real rating/playback evidence.

## Technical verification

- [ ] A clean install from package-lock.json succeeds, or any environmental block is disclosed.
- [ ] Type checking passes.
- [ ] The documented automated test suite passes.
- [ ] The production build passes.
- [ ] Lint findings have been reviewed and any remaining backlog is explicitly disclosed.
- [ ] Built output is scanned for excluded identifiers and credential patterns.
- [ ] Mobile/desktop and all three language entry routes render with sample data.
- [ ] Forged identity headers cannot enable private data or writes in the standalone demo.
- [ ] Provider calls cannot accidentally query live services with synthetic IDs.
- [ ] Dependency vulnerability and license checks have been reviewed with their limitations recorded.

## Publication

- [ ] A separate reviewer approves the exact export tree.
- [ ] A new clean commit is uploaded; production history is not pushed.
- [ ] Remote file manifest/commit matches the approved snapshot.
- [ ] Repository visibility matches the owner's decision; pending license status is clearly disclosed.
- [ ] If a public release is approved, verify its visibility and exact commit afterward.

## Validation record

Local validation on 2026-10-14: clean dependency install, TypeScript, 123 unit tests, build/CSS and 14 HTTP checks on both development and production-local servers passed. Production-dependency audit: 0; full toolchain audit: 12 (0 critical), documented. ESLint: 263 errors and 72 warnings, unresolved. The owner created a public repository; GitHub CI and remote verification are tracked separately against the uploaded commit. Independent archive review is performed separately against the final archive checksum. This is not a complete legal/security clearance.

## CI template

.github/workflows/ci.yml runs a clean install, source hygiene checks, type checking, tests, build, production-classified dependency audit and local HTTP smoke checks; it also gates the full dependency graph against a narrow advisory/package allowlist for the two documented upstream development-tool issues. It has read-only repository permissions, does not persist checkout credentials, and does not deploy or publish. The pinned checkout/setup-node v7 references were verified from their official GitHub tag endpoints during preparation. Inherited lint diagnostics are also explicitly non-blocking until the documented cleanup backlog is resolved. Remote CI results must be checked on the exact uploaded commit before being reported as passed.
