# Development and deployment

## Local source demo

Use Node.js 24 (tested with 24.19.0) and the committed lockfile:

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm start
```

For a local HTTP smoke check while the dev server is running:

```sh
npm run test:smoke -- http://127.0.0.1:5173
```

The default public metadata origin is https://example.invalid. Set your own origin in lib/site-brand.ts before deploying; no optional environment variable is wired for it.

The source edition uses Vinext, Vite and Cloudflare Workers tooling. Read package.json and vite.config.ts before adapting it to a different runtime. The generated output is not committed.

The bundled catalog is synthetic. The development server does not require the original site's account, secrets, production data or hosting project. Private account and paid-model functions are intentionally unavailable until an operator implements them.

## Before exposing a deployment

1. Select your own canonical origin and verify metadata, redirects, sitemap and locale links.
2. Choose an identity provider and validate sessions server-side. Do not accept raw identity headers from the public internet. Block direct-origin paths that bypass any trusted gateway.
3. Create an isolated database if enabling watchlists. Apply the committed schema/migrations to that isolated database only; never import a private production dump into Git.
4. Enforce tenant isolation, safe mutations, origin checks, no-store private responses, rate limits and bounded request bodies.
5. Configure your own model/provider through server-managed secrets only if you need AI functionality. Show users what data is sent and preserve consent boundaries.
6. Add a privacy notice, security-reporting route and any required terms for the features you actually enable.
7. Import only data and artwork you have permission to use. Preserve attribution and licensing obligations. Do not re-enable a source adapter on synthetic IDs.
8. Run the complete checks and independent security/rights review for your deployment.

## Provider integrations

The source includes adapters illustrating the product's architecture. Their presence does not mean every API is enabled, available, licensed for redistribution or production-ready in a fork. A missing provider must fail visibly; never silently relabel another provider's score.

The original hosting platform's session and connector capabilities are not general-purpose credentials. No production project IDs, Cloudflare account IDs, OAuth tokens or database contents are supplied in this repository.

## Environment example

.env.example documents non-secret optional configuration only. Nothing in a browser-visible variable is confidential. If a secret is needed later, put it in the deployment platform's secret store and document its purpose without committing its value.
