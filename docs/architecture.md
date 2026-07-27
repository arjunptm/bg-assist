# Architecture

BG Assistant is a mobile-first React PWA backed by a capability-scoped
Cloudflare Worker and D1 database. Its most important architectural rule is
that player names and named assignment results never leave the browser.

## System boundaries

| Layer | Responsibility |
| --- | --- |
| React application | Routes, game-night interface, local assignments, and shared editing |
| IndexedDB | Known group links, last-used group, per-group player rosters, and cached snapshots |
| Service worker | Application-shell precaching; API responses are deliberately excluded |
| Worker API | Validation, capability authorization, optimistic concurrency, and shared mutations |
| D1 | Shared non-personal group and game configuration |

Temporary selections, option exclusions, and current assignment results live
only in React state.

## Frontend

`src/App.tsx` defines the public landing page, group library, game editor, and
game setup routes.

Shared frontend responsibilities are separated as follows:

- `src/shared/` contains backend-safe models and strict validation schemas.
- `src/lib/api.ts` contains the capability-scoped API client.
- `src/lib/storage.ts` owns device-local IndexedDB state.
- `src/lib/randomizer.ts` owns assignment and restriction solving.
- `src/hooks/useGroup.ts` refreshes online snapshots and falls back to cached
  data.
- `src/game-tools/` is the registration boundary for future coded tools.

Generic randomizer code must not branch on a configured game's name.

## Shared data and authorization

A group URL contains a cryptographically random 256-bit capability token. The
token acts as the group's credential. The Worker stores only its SHA-256 hash
and resolves every group operation through that hash.

There are no users, owners, login sessions, group search endpoints, or group
enumeration endpoints. Anyone with a valid group link can view and edit that
group's shared configuration.

D1 stores:

- Groups and friendly names
- Games and soft-deletion state
- Assignment sets and options
- Option quantities
- Explicit banned option pairs
- Revision and timestamp metadata

D1 never stores player names, current participants, or assignment results.

## Worker API

`worker/index.ts` exposes only capability-scoped operations:

- Create a group
- Fetch or rename one group
- Create or replace a game aggregate
- Soft-delete or restore a game

Request schemas reject unknown fields, which prevents player data from being
silently accepted into shared payloads. Writes have bounded payload sizes,
basic throttling, and structured validation, conflict, rate-limit, and
not-found responses.

Game updates use aggregate saves and D1 batches. The client must provide the
revision it loaded; stale writes receive a conflict instead of overwriting a
newer edit.

## Local assignment engine

All shuffling uses Web Crypto rather than `Math.random()`.

Unconstrained operations use secure Fisher-Yates shuffling. Constrained
operations represent each configured quantity as an available slot and use a
bounded dynamic-programming search over player masks. BigInt counts are used
to select among valid branches cryptographically.

This keeps already assigned sets fixed while finding a valid assignment for
the newly shuffled set. The exact solver is intentionally limited to 12
participating players.

## Offline behavior

The service worker precaches the application shell but does not cache API
responses. When an online group load succeeds, the frontend stores the
validated snapshot in IndexedDB.

If a later load fails, the cached snapshot can still support:

- Viewing the previously loaded game library
- Selecting locally remembered players
- Applying option exclusions and restrictions
- Shuffling and viewing current assignments

Shared edits require a network connection. There is no offline write queue or
conflict-merge system.

## Future Game Tools

Purpose-built helpers such as a Catan map generator belong under
`src/game-tools/` and register through its registry. Each tool may choose its
own local, group-shared, or temporary settings where justified.

These tools must remain independent of the generic assignment model so a game
can use both a configured randomizer and a coded helper without cross-cutting
conditionals.
