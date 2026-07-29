# BG Assistant

[![CI](https://github.com/arjunptm/bg-assist/actions/workflows/ci.yml/badge.svg)](https://github.com/arjunptm/bg-assist/actions/workflows/ci.yml)
![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-43853d)
![PWA](https://img.shields.io/badge/PWA-installable-173f35)

BG Assistant is a mobile-first PWA for getting a board-game session started
quickly. Groups share a configurable game library through an unguessable link,
while player names and assignment results remain private on each device.

The first tool is a generic player-assignment randomizer for factions, mats,
roles, colors, teams, and other game-specific categories. The codebase also
reserves a clean home for future purpose-built Game Tools.

## Current local version

The local v1 baseline includes:

- Account-free group creation and capability links
- Locally remembered groups and per-group player rosters
- Shared editing for games, assignment sets, options, descriptions, optional colors, quantities, and banned pairs
- Independent cryptographic shuffling for each assignment set
- Exact banned-combination solving for up to 12 participating players
- Soft-deleted games with immediate Undo
- Optimistic revision conflicts for shared edits
- Native group sharing with selectable manual-link, copy-feedback, and QR fallbacks
- Versioned one-game or whole-library configuration export/import without
  capability links or player data
- Cached offline group snapshots and offline randomization
- Mobile-first responsive UI, system dark mode, and installable PWA metadata
- Hono Worker API and a versioned D1 migration history

Player names and named assignment results are never included in shared API
payloads or D1 records.

## Local setup

Install Node.js 22 or newer and pnpm 11, then run:

```powershell
pnpm install
pnpm run db:local
pnpm run dev
```

Open the local URL printed by Vite. The Cloudflare Vite integration runs the
React application, Worker API, and local D1 database together.

## Verification

```powershell
pnpm run typecheck
pnpm test
pnpm run build
```

The production build is written to `dist/`. Local Cloudflare state is written
to `.wrangler/`; both are ignored by Git.

## Development workflow

Meaningful changes use an issue-first, branch-and-pull-request workflow. Codex
branches use the `AI-<short-description>` naming convention. See
[docs/development.md](docs/development.md) for the local review checklist,
change-specific verification, commit guidance, and pull-request process.

## Project map

- `src/` - React PWA, device storage, randomizer, and shared contracts
- `worker/` - capability-scoped Hono API and D1 access
- `migrations/` - versioned D1 schema
- `test/` - privacy, capability, validation, and randomizer tests
- `PRODUCT_SPEC.md` - authoritative v1 product requirements

## Documentation

- [Product specification](PRODUCT_SPEC.md)
- [Architecture](docs/architecture.md)
- [Privacy and data storage](docs/privacy.md)
- [Development workflow](docs/development.md)
- [Development deployment runbook](docs/deployment.md)
- [V1 shared schema freeze](docs/schema.md)
- [Roadmap](docs/roadmap.md)
- [Changelog](CHANGELOG.md)

## Deployment status

The source is tracked at `github.com/arjunptm/bg-assist`. No Cloudflare
production resource, custom domain, or DNS change has been created.
`wrangler.jsonc` intentionally contains a placeholder D1 database ID.
Cloudflare setup will be completed later as a separate, guided step.
