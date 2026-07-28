# Privacy and data storage

BG Assistant separates shared, non-personal game configuration from private
game-night information. Player names and named assignment results never enter
the Worker API or Cloudflare D1.

## What is stored where

| Location | Information | Why it is stored |
| --- | --- | --- |
| Cloudflare D1 | Group and game names, assignment sets and options, descriptions, optional colors, quantities, banned pairs, revisions, and timestamps | Makes one game library available to everyone with the group link |
| Browser IndexedDB | Remembered capability links, the last-used group, per-group player rosters, and cached group snapshots | Remembers groups and players on one device and supports cached offline play |
| Current page memory | Selected players, temporary option exclusions, and current assignment results | Supports the current setup without creating player or assignment history |

Cached snapshots contain the same non-personal game configuration returned by
the shared API. They do not contain player names or named results.

## Capability links

Each group link contains a cryptographically random 256-bit capability token.
Anyone with the complete link can view and edit that group, so the link should
be treated like a key and shared only with intended participants.

The Worker hashes the capability token with SHA-256 before looking up a group.
D1 stores only the hash, not the original token. There are no endpoints for
listing, searching, or enumerating groups.

The in-app sharing fallback displays the complete capability link and generates
its QR code locally. If native sharing or clipboard access is unavailable, the
link remains selectable for manual copying; no third-party fallback service is
used.

## What v1 does not collect

BG Assistant v1 has:

- No user accounts or owner profiles
- No group-search directory
- No product analytics
- No server-side player roster
- No assignment or session history
- No automated record of who received an option

Cloudflare may provide infrastructure-level request observability, but BG
Assistant does not place player names or named assignment results in requests,
logs, analytics, or shared configuration.

## Clearing local information

Use **Clear players** inside a group to remove that group's locally remembered
roster without changing its shared game library.

Clearing the site's browser data removes remembered links, rosters, cached
snapshots, and preferences for that browser origin. It does not delete shared
group configuration from D1.
