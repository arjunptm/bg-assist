# BG Assistant

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
- Shared game, assignment-set, option, quantity, and banned-pair editing
- Independent cryptographic shuffling for each assignment set
- Exact banned-combination solving for up to 12 participating players
- Soft-deleted games with immediate Undo
- Optimistic revision conflicts for shared edits
- Copy, native share, and QR group sharing
- Cached offline group snapshots and offline randomization
- Mobile-first responsive UI, system dark mode, and installable PWA metadata
- Hono Worker API and a normalized D1 migration

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

## Project map

- `src/` — React PWA, device storage, randomizer, and shared contracts
- `worker/` — capability-scoped Hono API and D1 access
- `migrations/` — versioned D1 schema
- `test/` — privacy, capability, validation, and randomizer tests
- `PRODUCT_SPEC.md` — authoritative v1 product requirements
- `conversation-handoff.md` — earlier planning and infrastructure discussion

## Deployment status

No Git remote, GitHub repository, Cloudflare production resource, custom
domain, or DNS change has been created. `wrangler.jsonc` intentionally contains
a placeholder D1 database ID. GitHub/Cloudflare setup will be completed later
as a separate, guided step.

