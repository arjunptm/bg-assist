# Changelog

All notable changes to BG Assistant will be documented in this file.

The application has not yet had its first production release. Until then,
completed user-facing and repository-management changes remain under
`Unreleased`.

## Unreleased

### Fixed

- Restored mobile game editing when `crypto.randomUUID()` is unavailable and
  added a recoverable route error screen.

### Added

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
