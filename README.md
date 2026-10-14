<h1 align="center">Tiaofan · 挑番</h1>

<p align="center"><strong>A clearer way to find your next anime.</strong><br>Seasonal discovery, source-aware details and a watchlist that stays close.</p>

<p align="center">
  <a href="https://anime.hubeiqiao.com/en"><strong>Explore the live app →</strong></a>
  · <a href="#quick-start">Quick start</a>
  · <a href="docs/DEPLOYMENT.md">Documentation</a>
  · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://github.com/hubeiqiao/tiaofan/actions/workflows/ci.yml"><img src="https://github.com/hubeiqiao/tiaofan/actions/workflows/ci.yml/badge.svg?branch=main" alt="Source checks workflow status"></a>
</p>

<p align="center">Built entirely with <strong>GPT Sites</strong> through iterative prompting, implementation, and testing.<br><a href="docs/BUILT_WITH_GPT_SITES.md">Read the build story</a></p>

<p align="center">
  <a href="docs/screenshots/desktop-catalog-en.jpg"><img src="docs/screenshots/desktop-catalog-en.jpg" width="62%" alt="Tiaofan desktop catalog with seasonal navigation and source filters"></a>
  &nbsp;
  <a href="docs/screenshots/narrow-catalog-en.jpg"><img src="docs/screenshots/narrow-catalog-en.jpg" width="26%" alt="Tiaofan responsive catalog in a genuinely narrow browser window"></a>
</p>

<p align="center"><sub>Live app captures · October 2026 · <a href="docs/screenshots/README.md">Provenance &amp; artwork rights</a><br>Shown: the hosted product. The source demo uses fictional titles. Narrow-browser capture, not a physical-device test.</sub></p>

## Discover with context

- **Find a season worth watching.** Browse current and previous seasons, filter the catalog and switch between cards and lists.
- **Understand what each source says.** Explore title details, ratings and viewing evidence with source-specific context.
- **Keep your next watch in reach.** Follow series relationships, discover recommendations and organize viewing state in the hosted app.
- **Read in your language.** English, Chinese and Japanese interfaces, with responsive layouts and light/dark appearance.

## Quick start

Use **Node.js 24** and npm.

```sh
git clone https://github.com/hubeiqiao/tiaofan.git
cd tiaofan
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. The standalone demo runs with six fictional titles and neutral artwork; no production credentials are required. Sign-in, private persistence and AI services are disabled by default. [Connect your own services →](docs/DEPLOYMENT.md)

## Inside the project

**React + TypeScript** for the interface, **Vinext + Vite** for the application runtime, and **Cloudflare Workers** tooling for local builds and deployment integration. Catalog normalization, source adapters, navigation and viewing-state logic live in a reusable domain layer.

| Area | What you’ll find |
| --- | --- |
| `app/`, `components/`, `hooks/` | Pages, HTTP/MCP routes and interactive UI |
| `lib/`, `data/` | Domain logic, source adapters and synthetic fixtures |
| `scripts/`, `tests/` | Data preparation, regression checks and release-safety tooling |
| `docs/` | Setup, deployment, provenance and maintenance notes |

## Development

```sh
npm run typecheck
npm test
npm run build
npm start
```

The source suite includes **123 automated tests**. See the [GitHub workflow](https://github.com/hubeiqiao/tiaofan/actions/workflows/ci.yml) for current results, and the [release review](docs/RELEASE_REVIEW.md) for test scope, the inherited lint backlog and two narrowly accepted development-tool advisories.

## Documentation & contributing

[Deployment](docs/DEPLOYMENT.md) · [Data sources](docs/DATA_SOURCES.md) · [Built with GPT Sites](docs/BUILT_WITH_GPT_SITES.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

Issues and focused improvements are welcome. Please read the contribution guide before submitting changes, and keep private data out of public reports.

## License & content

**Source available; code license pending.** Reuse rights await the owner's license choice. Third-party components and screenshot artwork retain their own terms. Production datasets and private account data are excluded. [License status](LICENSE-STATUS.md) · [Third-party notices](THIRD_PARTY_NOTICES.md)

<p align="center">Created by <a href="https://github.com/hubeiqiao">hubeiqiao</a> with GPT Sites.</p>
