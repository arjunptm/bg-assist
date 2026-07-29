# Changelog

All notable changes to BG Assistant will be documented in this file.

The application has not yet had its first production release. Until then,
completed user-facing and repository-management changes remain under
`Unreleased`.

## Unreleased

### Fixed

- Replaced the native Clear players prompt with an accessible inline confirmation.
- Improved keyboard focus visibility and enlarged compact mobile action targets.
- Made group sharing recover with a selectable group link, independent QR
  generation, copy feedback, and graceful native-share and clipboard failure
  handling.
- Restored mobile game editing when `crypto.randomUUID()` is unavailable and
  added a recoverable route error screen.
- Prevented interrupted local tests from multiplying into orphaned
  child-process worker pools by using one bounded Vitest worker thread.

### Added

- Added versioned single-game and whole-library configuration backups with
  strict private-data rejection, relationship-safe import previews, and
  copy-only conflict handling.
- Expanded automated privacy and persistence coverage across IndexedDB,
  cached offline fallback, create/join/editor/setup flows, and Miniflare-backed
  Worker/D1 integration.
- Added optional curated colors for assignment options across editing, setup,
  assignment results, cached snapshots, and shared persistence.
- Added public How it works and Privacy sections with a plain-language
  explanation of shared, device-local, and session-only data.
- Added alphabetical roster filtering, assignment Start over, explanatory
  constrained-reshuffle feedback, and session-only player exclusions.
- Added optional shared descriptions for assignment options, including offline
  snapshot display in setup and assignment results.
- Added the initial mobile-first React and TypeScript PWA.
- Added the capability-scoped Cloudflare Worker API and initial D1 migration.
- Added locally private player rosters, cached group snapshots, and offline
  assignment randomization.
- Added quantity-aware cryptographic assignment and exact banned-combination
  solving for up to 12 players.
- Added shared game editing, optimistic revisions, soft deletion, QR sharing,
  and future Game Tools boundaries.
- Added repository workflow documentation, issue and pull-request templates,
  and continuous integration.
