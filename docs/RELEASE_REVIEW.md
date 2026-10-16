# Source-release review

Review date: 2026-10-14 UTC.

## Decision

The release candidate is a newly assembled source edition with synthetic data. It is not a copy of the production database, production Git history or live service configuration. The reviewed source is being uploaded to the owner-created public repository https://github.com/hubeiqiao/tiaofan. The original-code license remains pending the owner's decision; public visibility is not a general open-source license grant.

## Resolved export risks

- Production catalog dumps, compressed/generated copies, real reviewer material, real viewing inventories and source HTML fixtures were excluded.
- Personal portraits, author/profile branding, anime-character derivative fan art, old promotional media and artwork masters were excluded. Two subsequently requested public-product screenshots are included only as documentation, with capture provenance and an explicit third-party-rights exception; no private account state is visible.
- Neutral SVGs and six fictional records replace those materials. Demo ratings, reviews and playback evidence are empty, with a visible synthetic-data notice.
- No credentials, auth sessions, private watchlists, platform project identifiers, Cloudflare account identifiers or live database contents were supplied.
- Original platform identity cannot be safely assumed on another host. The source demo ignores caller-supplied identity and disables private storage, authentication and AI operations.
- Third-party notices were preserved, including HeroUI's shipped Apache-2.0 text and Lucide's ISC plus Feather MIT notice. The project license remains separate from these rights.

## Rights limitations

Bangumi wiki licensing does not blanket-license posters or user reviews. Kitsu and MAL content-reuse terms could not be conclusively confirmed. Production artwork includes documented recognizable-character fan art. Original production files are omitted; documentation screenshots include incidental artwork and the hosted branding. Omission of the originals is not a legal clearance for their separate use on the live site.

No exhaustive copyright/contributor-history investigation or deployment penetration test was performed. A pattern scan and a successful build are not guarantees of legal clearance or absence of security defects. See DATA_SOURCES.md and ../SECURITY.md.

## Dependency review

The original lockfile's registry audit reported 30 dependency entries: 1 critical, 21 high, 7 moderate and 1 low. These are package-level advisory classifications, including development tooling, not 30 demonstrated exploitable application bugs.

The critical Next.js advisory requires the Node next/og ImageResponse path with attacker-controlled SVG. That path was not found in the inspected application. No wired server-action handler was found in the narrow React Server Components trace. The source candidate updates the affected Next, React/RSC, Vinext, Vite and Cloudflare toolchain versions and rechecks compatibility.

The upgraded lockfile was installed with a clean npm ci. Its full npm audit reports 12 affected package entries (0 critical, 8 high, 4 moderate), all tracing to two development-tool advisory roots: braces 3.0.3 (no upstream patched release available at review time) and drizzle-kit's nested esbuild 0.18.20. The audit with --omit=dev reports zero findings. The latter follows npm package classification, not a complete inventory of code bundled into a deployed Worker; the RSC copies were checked separately.

CI gates the production-classified audit and separately checks the full dependency graph. The latter accepts only the two named advisory/package pairs, fails on any new high/critical advisory or unresolved chain, and prints accepted residuals. This is a documented residual risk, not an assertion that all dependencies are vulnerability-free. Do not expose development servers or run builds on untrusted projects. Revisit the two advisories before enabling a public development service or shipping compiled/binary artifacts. See DEPENDENCY_REVIEW.md for the exact versions and advisory links.

## Verification scope

Tested with Node.js 24.19.0. The integrated server bundles contain React 19.2.9; the separately inspected plugin fallback is 19.3.0.

Integrated upgraded source-demo checks passed: TypeScript, production build with CSS verification, 123 unit tests and all 14 HTTP checks against both the development server and the built local Worker. HTTP checks include all three languages, current/historical detail pages, synthetic catalog/MCP data, anonymous and forged-identity rejection, disabled AI/live ratings, no scheduled-update claims and crawler exclusion.

The final build-output pattern scan inspected 181 text files and found no excluded hosting identifiers, supported token patterns, production origin or excluded author/social artwork paths. It does not replace an exhaustive secret scanner or source security review.

ESLint did not pass: 263 errors and 72 warnings remain in inherited code and test conventions. They are not hidden with blanket rule disables. CI exposes lint as a non-blocking diagnostic backlog; typecheck, tests and build remain required. The source snapshot must not be described as passing every quality check or as deployment-ready.

These results must be rerun after dependency or source changes. Local validation is complete as recorded above. GitHub CI and remote verification are tracked on the uploaded commit; no remote pass is implied by these local results.

## October 16 source synchronization

This source-only adaptation includes recommendation-card retention, header alignment, exact-part episode numbering and reviewed-platform reconciliation. Production datasets and hosting history remain excluded. Curated runtime links and part scopes default to empty input; new tests inject fictional records. Public demo identity, storage, AI and live-provider restrictions remain in place.

Local verification on 2026-10-16 with Node.js 24.19.0: clean `npm ci`, source hygiene, TypeScript, all 166 automated tests, production build/CSS checks and all 14 HTTP checks on both development and built-local Worker servers passed. A bounded compiled-output scan inspected 174 text files with no supported credential, private-reference, hosting-project, production-origin or excluded-art-path matches. These checks are not exhaustive security or rights clearance.

The production-classified dependency audit still reports zero findings. The full dependency gate accepts only the existing documented braces/esbuild advisory exceptions: 12 affected package entries, including 8 high, 4 moderate and no critical entries. Package and lockfile versions were not changed in this synchronization.

ESLint remains a non-blocking diagnostic failure: the staged run reports 262 errors and 77 warnings. The new platform helper uses `unknown` rather than untyped index signatures. Two necessary CommonJS imports have documented next-line module-format exceptions; no blanket rule suppression was added. This local record does not claim the source is deployment-ready or that remote CI has passed for a new commit.

## October 16 compatibility-test follow-on

The follow-on starts from public commit `aedf6e044939401556e9c8717f80799f4f2fca8f`. It adds ten fictional-fixture regressions for part boundaries, immutable observations, local/legacy advancement, empty failed records, three-locale rendering, metadata/directory serialization, informational links and the read-only review queue. Only tests, documentation and this source inventory change; runtime code, synthetic datasets, demo guards, dependencies and CI configuration are unchanged.

Local checks on Node.js 24.19.0 passed: clean `npm ci`, TypeScript, all 176 tests, production build/CSS verification and the 14 development-server HTTP smoke checks. Both added test files pass ESLint; the full optional lint diagnostic remains at the inherited 262 errors and 77 warnings. No separate gateway policy, provider records, private inventory or evidence logs are included. The public source-layer tests do not assert gateway-specific generic field sanitization or claim a gateway/production deployment. The unchanged dependency and built-Worker checks recorded above are not newly rerun by this test-only follow-on.

## October 16 hosted acceptance and provenance closure

Canonical v108 source commit `5f0de66ed7c8c4df436d6940bbea4bbd155461ef` was published at `2026-10-16T17:44:31.740128Z`. Final hosted acceptance passed at `2026-10-16T18:04:40.362941Z`, closing the earlier pending-deployment state. The manifest retains historical v107 source base `c4f48512dff570a6981ccd569c52565bb5d39ed2` and the reviewed 21-file patch inventory fingerprint. Public source commit `aedf6e044939401556e9c8717f80799f4f2fca8f` and compatibility-test commit `0d5effbc9f19ea8bfd10c2e70cb6190ef8f2263f` both passed their required GitHub CI checks.

Hosted acceptance covered 26 HTTP probes across primary, guest and legacy public routes and private-route canaries. Chinese, English and Japanese desktop/mobile rendering checks found no horizontal overflow or captured console errors. Exact-part provider labels and separate local progress, informational-only link semantics, original evidence dates, and false playback/region/entitlement verification flags were preserved. These checks do not establish playback, rights or regional availability.

This documentation-only closure leaves runtime code, synthetic datasets, demo guards, dependencies and CI configuration unchanged. No provider inventories, hosting identifiers, private infrastructure, screenshots or evidence logs are added. Local validation covers manifest hashes, source hygiene and the bounded diff; the unchanged full application suite was not rerun locally for this closure. The subsequent public commit must obtain its own CI result.
