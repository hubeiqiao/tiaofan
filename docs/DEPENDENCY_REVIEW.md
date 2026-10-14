# Dependency remediation review

Checked: 2026-10-14. Scope: isolated synthetic-data source release candidate. No canonical project or live deployment changed.

## Results

- Baseline full audit: 30 affected package entries (1 critical, 21 high, 7 moderate, 1 low).
- Updated full audit: 12 affected package entries (0 critical, 8 high, 4 moderate, 0 low), representing two root advisories and their dependency chains.
- Updated `npm audit --omit=dev`: zero registry-known findings. This classification-based audit is not a complete runtime reachability guarantee.
- Final clean `npm ci` passed (729 installed packages). No forced audit fixes or downgrade suggestions were applied.
- Full application typecheck, tests, build and local smoke checks are required on the integrated source candidate; those results are recorded separately.

## Selected versions

- next: 16.3.4 → 16.3.8
- react: 19.2.6 → 19.2.9
- react-dom: 19.2.6 → 19.2.9
- @cloudflare/vite-plugin: 1.37.1 → 1.64.0
- @cloudflare/workers-types: 4.20260515.1 → 5.20261006.1
- @vitejs/plugin-rsc: 0.5.26 → 0.5.37
- esbuild: 0.28.0 → 0.28.2
- eslint-config-next: 16.3.4 → 16.3.8
- react-server-dom-webpack: 19.2.6 → 19.2.9
- vinext: 1.0.0-beta.5 → 1.2.0
- vite: 8.0.13 → 8.0.16
- wrangler: 4.92.0 → 4.151.0

Compatible transitive updates include Babel core 7.29.7, baseline-browser-mapping 2.11.28, brace-expansion 1.1.21/5.0.12, browserslist 4.29.3, fast-uri 3.1.8, js-yaml 4.3.2, source-map-js 1.2.2, undici 7.29.1, ws 8.21.0 and sharp 0.35.5. The obsolete Miniflare sharp 0.35.4 override was removed. A patch-only fflate 0.7.5 override corrects Satori's pinned 0.7.3. Cloudflare's official Vite/Wrangler pair selects Miniflare 5.20261012.0-beta and workers-types 5; acceptance is conditional on complete demo validation.

## Remaining advisories

1. [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): braces 3.0.3, high severity; no patched release published at review time. It is reached by development-time glob processing through micromatch/fast-glob, Next ESLint rules and Vinext's CommonJS import plugin. No direct application use was found. Do not feed untrusted glob patterns to developer tooling or expose tooling as a network service. This advisory accounts for 8 full-audit package entries.
2. [GHSA-67mh-4wv8-2f99](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99): esbuild 0.18.20 nested under deprecated @esbuild-kit/core-utils → @esbuild-kit/esm-loader → drizzle-kit. The reported flaw concerns the old esbuild development server. Application serve/build uses patched direct tooling; the legacy schema-generator path remains because db:generate and the Drizzle config are retained features. No application invocation of that old development server was found. This accounts for 4 moderate full-audit entries. The audit-suggested downgrade to drizzle-kit 0.18.1 was rejected.

All 12 flagged lockfile nodes are marked dev dependencies. This is evidence of install classification only; future changes to bundling or exposed tooling need reassessment. The project must not claim a zero-findings full dependency audit. A production-only CI gate can coexist with a published full audit and these explicit residuals.

## Runtime security evidence

- [Next.js next/og RCE advisory](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j) was addressed with Next 16.3.8. The critical issue requires Node ImageResponse receiving attacker-controlled SVG. Source search found no application next/og or ImageResponse use; live exploitability was not demonstrated.
- [React Server Functions DoS advisory](https://github.com/react/react/security/advisories/GHSA-wx67-qw84-cm4g) was addressed with matching root react/react-dom/react-server-dom-webpack 19.2.9. The installed @vitejs/plugin-rsc 0.5.37 fallback package reports 19.3.0, also outside this advisory's affected ranges. Both were checked because registry audit does not enumerate vendored code. The plugin README and alias implementation select installed root RSC when present; generated/runtime selection should also be checked during integration.
- [Vite Windows file-deny bypass](https://github.com/vitejs/vite/security/advisories/GHSA-fx2h-pf6j-xcff) is patched at 8.0.16.
- [Sharp librsvg advisory](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w) is patched at 0.35.5.
- [fflate malformed ZIP64 advisory](https://github.com/advisories/GHSA-px8p-9vwx-vf98) is patched within the 0.7 line at 0.7.5.

## License review for changed direct dependencies

All 12 installed manifests match their lockfile license declarations: 10 MIT; @cloudflare/workers-types and Wrangler use MIT OR Apache-2.0. Actual standalone license text was inspected for Next, React, React DOM, React Server DOM Webpack, esbuild, Vinext and Vite. The Cloudflare Vite plugin, workers-types, RSC plugin, eslint-config-next and Wrangler tarballs omit standalone license files. Official repository license declarations, accessible license text and available source headers were reviewed instead. The RSC repository declares MIT; its standalone license page could not be retrieved during this review. workers-types index.d.ts specifically contains an Apache-2.0 header with Cloudflare and Microsoft copyrights, which must be preserved. The RSC plugin's vendored React package includes its MIT license. This review does not replace the complete third-party inventory or notices. Existing UI package versions were unchanged.

Machine-readable details, relative package paths, checksums and evidence are in audit/remediation.json. Registry outputs are audit/audit-before.json, audit/audit-full.json and audit/audit-production.json. These audit files contain no absolute local paths, secrets or private runtime configuration.
