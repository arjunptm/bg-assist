# Roadmap

`PRODUCT_SPEC.md` remains authoritative for product behavior. This roadmap is a
short implementation sequence and should link to GitHub issues as work becomes
active.

## Current baseline

- Mobile-first PWA and responsive interface
- Account-free capability-linked groups
- Shared configurable game library
- Device-local player rosters and assignments
- Multiple independently shuffled assignment sets
- Quantities, temporary exclusions, and banned pairs
- Offline cached play with online-only shared editing
- Portable game-configuration backup and copy-based import
- Local D1 migration, Worker API, tests, and production build

## Before the first development deployment

- Establish repository CI, templates, documentation, and review workflow
- Expand automated coverage for IndexedDB, UI flows, and Worker/D1 integration
- Complete a structured mobile, dark-mode, accessibility, and offline review
- Verify portable configuration recovery before testers build real libraries
- Create Cloudflare development resources and replace placeholder bindings
- Connect GitHub builds and verify pull-request preview deployments

## Before the first production release

- Purchase and secure `ludicmethods.com` through Cloudflare Registrar
- Complete the public-facing **Game Night** brand pass while retaining
  compatibility-sensitive `bg-assistant` internals
- Attach `gamenight.ludicmethods.com` only after development testing
- Confirm rate limits, request validation, and privacy boundaries
- Test installability and upgrades from the production origin
- Document deployment, rollback, and release procedures
- Decide repository visibility and licensing

The ordered account, domain, development, and production procedure lives in
[`gamenight-launch-checklist.md`](gamenight-launch-checklist.md).

## Later product work

Only promote these items into implementation issues when they become active:

- Private reveal mode
- Whole-setup reshuffling where multiple constrained sets must change together
- Improved capability-link recovery or access controls if needed
- Purpose-built Game Tools such as Catan and Carcassonne helpers
- Tool-specific persisted preferences where a concrete tool needs them

## Explicitly deferred

- User accounts and authentication
- Session, statistics, or assignment history
- Preferred or weighted combinations
- Repeat avoidance across sessions
- Sophisticated single-player rerolls
- Offline shared edits and mutation queues
- Real-time collaborative editing
- A general-purpose rules engine
