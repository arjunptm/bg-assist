# BG Assistant Product Specification

This file is the authoritative product brief for v1. The original planning
discussion remains in `conversation-handoff.md`.

## Product

BG Assistant is a mobile-first PWA containing lightweight utilities for running
board-game nights. Its first tool is a configurable player-assignment
randomizer. Future, code-owned Game Tools must remain self-contained and must
not introduce game-name conditionals into the generic randomizer.

## Access and privacy

- The public root lets visitors create a group, join through a pasted link, or
  open a locally remembered group.
- Groups use cryptographically unguessable capability URLs. Anyone with the
  link can view and edit. There are no accounts, owners, recovery credentials,
  group search, or group enumeration.
- The backend stores only a hash of each capability token.
- Player names and assignment results never leave the browser. Every remembered
  group has its own local roster and a visible Clear players action.
- D1 stores friendly group names and shared non-personal game configuration.
- Group links support copy, native sharing, and QR display.

## Randomizer

- A game contains independently shuffled Assignment Sets, each containing
  quantity-aware Assignment Options.
- Current participating players are selected from the local roster. Player
  ordering has no randomization significance.
- Temporary option exclusions and all current assignment results are ephemeral.
- Randomness uses Web Crypto and assigns uniformly without replacement except
  for explicitly configured quantities.
- Existing set results stay fixed while another set is shuffled or reshuffled.
- Explicit banned pairs can connect options from different sets. An exact,
  bounded solver finds a valid new assignment for up to 12 players. It reports
  insufficient pools and unsatisfiable configurations without silently
  modifying another set.
- V1 excludes assignment/session history, statistics, repeat avoidance,
  weighted preferences, private reveal, single-player rerolls, and a generic
  rules engine.

## Shared editing

- Anyone with a group link can add and edit games, sets, options, quantities,
  ordering, and banned pairs.
- Games use soft deletion with immediate Undo.
- Aggregate game saves carry a revision. Stale saves return a conflict and ask
  the editor to reload; real-time collaboration and conflict merging are out of
  scope.

## Offline and PWA

- The installed or browser-based PWA uses `/` for its stable ID, start URL, and
  scope, and remembers the last-used group locally.
- The service worker caches the application shell, never API responses.
- IndexedDB caches successfully fetched group snapshots. Cached groups, local
  rosters, selection, randomization, restrictions, and results work offline.
- Shared changes require a connection; v1 has no offline mutation queue.

## Interface

Use shallow navigation, large touch targets, accessible controls, prominent
game names, minimal play-flow chrome, system dark mode, and useful tablet and
desktop layouts. Top-level product organization must leave room for Randomizer
and future Game Tools.

## Infrastructure

React, TypeScript, Vite, Cloudflare Workers Static Assets, a Hono Worker API,
Cloudflare D1, and Cloudflare's Vite integration. GitHub and Cloudflare setup,
DNS migration, production deployment, and the `bg.arjunmakes.games` domain are
deliberately deferred until the local app is reviewed.

