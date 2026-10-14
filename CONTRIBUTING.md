# Contributing

Thank you for helping improve Tiaofan. The source is available for review; the project code license must be selected before an open-source release is declared.

## Development

1. Use Node.js 24 (the tested major) and install with npm ci.
2. Keep the change focused, with a clear explanation of the problem and expected behavior.
3. Use synthetic fixtures. Do not add real account records, copied reviews, posters or datasets without documented redistribution rights.
4. Run npm run typecheck, npm test and npm run build.
5. Include the exact checks performed and any limitations in the pull request.

## UI changes

Check Chinese, English and Japanese; narrow mobile and desktop layouts; light and dark themes; keyboard focus; reduced motion; repeated clicks; Back/Forward and close/reopen flows. Preserve honest loading, empty and error states. Do not present estimated scores, missing dates or unverified playback as confirmed facts.

## Data changes

Document the exact source, license, retrieval time, scope and transformations. APIs and images may have terms separate from an open-source client library. Do not include material merely because it is publicly accessible. Prefer small synthetic examples in tests.

## Security and privacy

Follow SECURITY.md. Do not paste credentials or personal data into issues, logs, tests or pull requests. Do not replace the demo's disabled identity flow with raw request-header trust.

## Dependencies and generated files

Explain new runtime dependencies and retain their license notices. Keep package-lock.json consistent with package.json. Do not commit node_modules, build output, generated runtime modules, deployment state or downloaded archives.
