# Exact resource matching in the source demo

The source edition includes exact-identity platform-link reconciliation and part-relative episode numbering. Its default data remains synthetic. No production provider inventory, playback observations, official film-link overlay or account data is included.

## Default boundaries

- `scripts/prepare-demo-data.mjs` writes an empty `data/curated-platforms.json` and `data/watch-part-scopes.json` on each preparation run.
- Authentication, private storage, AI operations and automatic live-data refresh remain disabled in the standalone demo.
- Runtime curated links and exact-part rules are deployment-specific. Operators must review their sources, rights, identity matches and evidence dates before supplying their own data, and preserve the attribution and safeguards described in `DATA_SOURCES.md` and `DEPLOYMENT.md`.
- This export deliberately omits an opt-in production-data example. Tests use local fictional identities and reserved example domains, and do not contact providers.

## Implemented behavior

Part-scoped listings retain original provider episode labels and URLs while projecting separate part-relative ordinals. Ingestion, last-good projection and high-water comparisons share one pure scope helper. A numbering migration preserves the original observation time and does not fabricate a new episode advancement.

The curated platform resolver matches exact numeric identities, merges only explicitly reviewed entries, respects replacement upstream arrays, deduplicates exact URLs and preserves upstream access restrictions. Revocation suppresses the exact URL. Provider title-page evidence is separate from playback, regional access and entitlement proof.

Review-due entries appear in a read-only status queue; the queue does not fetch providers or renew observation dates. An expired curated-only viewing link becomes explicitly labeled historical information while retaining its original evidence date. It is no longer offered as a current curated viewing link. A separately present upstream link retains the upstream source's own evidence and restrictions.

The same resolver serves metadata responses and current and historical detail documents. Regression tests inject synthetic source data to exercise these paths without publishing real production datasets or enabling provider requests.

## Verification

Run the repository's documented source checks after changes: source hygiene, TypeScript, the full automated suite, production build and local HTTP smoke tests. A successful source-demo check does not verify any third-party playback or real-world availability.

### Source compatibility regressions

The synthetic compatibility suites exercise inclusive part boundaries, immutable last-good projection, one-time progress migration, legacy responses without optional part fields, and failed identities without an earlier successful observation. Three-locale rendering checks preserve provider labels, links and observation dates alongside translated part-local counts.

Metadata and directory-route tests verify that optional part fields and dated advancements survive public source-layer serialization. Informational metadata and the read-only review queue retain evidence dates without asserting playback, regional access or entitlement. These tests use the existing fictional fixtures; they do not import a gateway response-policy module or claim generic field sanitization for a separate gateway.
