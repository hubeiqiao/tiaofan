# Security policy

## Reporting

Do not open a public issue containing credentials, personal watchlists, account identifiers or a working exploit against the live service. If this repository has GitHub private vulnerability reporting enabled, use its Security tab to report privately. If that option is unavailable, contact the maintainer through a verified private channel first and request a safe reporting route. No public security email or response-time guarantee has been established yet.

Include the affected commit, environment, minimal reproduction and impact. Use synthetic accounts and records. Do not probe other users' accounts or extract private data.

## Default trust boundary

This source demo has no production identity provider. Authentication and private/AI operations are disabled by default. Never treat oai-authenticated-user-* headers, a userId query field, local-storage values or an arbitrary bearer string as verified identity on a publicly reachable deployment.

A production identity integration must validate its session/token server-side, reject untrusted identity headers, enforce per-user database scoping and CSRF/origin controls, and keep private responses out of public caches. A reverse proxy is only a trust boundary when direct-origin access is prevented and identity forwarding is authenticated.

## Secrets and data

- Keep API keys, OAuth grants, tokens, deployment credentials and database exports outside Git.
- Use host-managed secret storage. Never expose a secret through NEXT_PUBLIC_* variables.
- Do not commit .env files, .dev.vars, .wrangler state, runtime profiles, logs, screenshots of account pages or browser sessions.
- Keep downloaded datasets and user records outside the publishable source tree until their rights and content are reviewed.
- Treat upstream summaries, reviews, URLs and model output as untrusted data, never as instructions or executable HTML.
- Review every external fetch destination, bound input/result sizes, set timeouts, and preserve provider limits.

## Release verification scope

Release review covers the prepared snapshot, relevant source boundaries, dependency metadata and build behavior. It is not a guarantee that all vulnerabilities are absent. The original production Git history and live private database are deliberately not included or searched for secrets in this export workflow.

Before a public release, complete docs/RELEASE_CHECKLIST.md, review dependency alerts and verify the exact uploaded commit. Security-sensitive deployments should undergo a separate deployment-specific review.
