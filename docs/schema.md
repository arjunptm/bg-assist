# V1 shared schema freeze

The checked-in D1 migration history is the source of truth. This document
records the reviewed v1 shared-data boundary before the first remote database
is created; it does not replace the SQL in `migrations/`.

## Shared tables

| Table | Purpose |
| --- | --- |
| `groups` | Friendly group metadata and a unique SHA-256 capability hash |
| `games` | Ordered, revisioned game definitions with soft deletion |
| `assignment_sets` | Ordered assignment categories belonging to a game |
| `assignment_options` | Ordered quantity-aware options with description and optional canonical hex color |
| `banned_combinations` | Validated cross-set option pairs that cannot be assigned together |
| `d1_migrations` | Wrangler's applied-migration ledger |

Foreign keys cascade configuration owned by a deleted parent. Games themselves
use soft deletion so the UI can provide immediate Undo. Aggregate game saves
replace their sets, options, and banned pairs in one D1 batch and use optimistic
game revisions.

## Deliberately absent

D1 has no tables or columns for:

- Capability tokens in plaintext
- Player names or rosters
- Current participants, selections, or temporary exclusions
- Assignments, results, sessions, or history
- Accounts, owners, profiles, or group search
- Public template publication
- Game-tool-specific state

Portable configuration backup is a client-side file format and introduces no
D1 schema. Public templates (#16) and specific Game Tools (#13) remain deferred;
their future storage, if any, must use reviewed additive migrations rather than
speculative v1 tables.

## Migration history at freeze

1. `0001_initial.sql` creates the full normalized configuration schema and
   indexes.
2. `0002_option_descriptions.sql` adds a non-null description with an empty
   default, preserving existing options.
3. `0003_option_colors.sql` adds a nullable color constrained to the original
   curated palette.
4. `0004_hex_option_colors.sql` converts named colors to uppercase `#RRGGBB`
   values and constrains future values to that canonical format.

Automated tests create a clean schema through the complete history and upgrade
a populated 0001 database through 0002, 0003, and 0004 without losing option data.
