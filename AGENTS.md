# BG Assistant Project Notes

## Sources of truth

- `PRODUCT_SPEC.md` is the authoritative v1 product specification.
- `README.md` documents current capabilities and local commands.
- `docs/development.md` defines the repository's branch, review, verification,
  and pull-request workflow.
- `conversation-handoff.md` preserves the earlier planning discussion.
- `migrations/` is the authoritative D1 schema history.

## Stack and commands

- React 19, TypeScript, Vite, React Router, Hono, Zod, IndexedDB, and
  `vite-plugin-pwa`.
- Cloudflare Workers Static Assets and D1 use the Cloudflare Vite integration.
- Package manager: pnpm 11; runtime: Node.js 22 or newer.
- Start: `pnpm run db:local`, then `pnpm run dev`.
- Verify: `pnpm run typecheck`, `pnpm test`, `pnpm run build`.
- The Codex runtime on this PC does not place Node on PATH. During the initial
  build, its bundled `node.exe` was copied into ignored `node_modules/.bin`.
  This is an environment workaround, not a project dependency.

## Architecture

- `src/shared/` contains backend-safe contracts and strict schemas.
- `src/lib/storage.ts` owns IndexedDB data: capability links, group rosters,
  cached snapshots, and preferences.
- `src/lib/randomizer.ts` owns local cryptographic assignment and the exact
  constraint solver. It supports at most 12 participating players.
- `worker/` owns the capability API and D1 access. Aggregate game saves use D1
  batches and optimistic revisions.
- Future coded game tools belong under `src/game-tools/` and register there.
  Never add game-name conditionals to the generic randomizer.

## Non-negotiable privacy and access rules

- Never send, log, or store player names or named assignment results in the
  Worker API, D1, analytics, or shared configuration.
- Group capability tokens are credentials. D1 stores only SHA-256 token hashes.
- Do not add group enumeration or search endpoints.
- Friendly group names and game configuration are shared, non-personal data.
- Offline shared writes are deliberately unsupported; do not add a mutation
  queue without an explicit product decision.

## Git, deployment, and secrets

- Keep changes within `BG Assistant` unless explicitly asked otherwise.
- Follow the workspace-level `REPOSITORY_STANDARDS.md`; this section and
  `docs/development.md` specialize it for BG Assistant.
- The repository uses `main`, with `origin` pointing to
  `git@github.com:arjunptm/bg-assist.git`.
- Check related GitHub issues before meaningful work. Use an existing issue
  when it fits; create or propose a focused issue when it does not.
- Do not develop meaningful features directly on `main`. Use
  `AI-<short-description>` branches for Codex-led work and default to a pull
  request before merging.
- Direct pushes to `main` require explicit approval and should be limited to
  low-risk maintenance.
- Before committing, inspect `git status` and `git diff`, then run verification
  appropriate to the change. TypeScript or runtime changes normally require
  `pnpm run typecheck`, `pnpm test`, and `pnpm run build`.
- UI changes require a local review of the touched mobile workflow. Check dark
  mode and offline behavior when the change affects either.
- At handoff, state whether work is local-only, committed, pushed, in a PR,
  merged, deployed, or released. Never imply a later state without verifying
  it.
- Never commit `.dev.vars`, `.env` files, Cloudflare credentials, private
  exports, real capability links, or `.wrangler/` state.
- `wrangler.jsonc` contains a placeholder D1 ID until the guided Cloudflare
  setup. Do not deploy it as-is.
- Production target is `bg.arjunmakes.games`, but DNS and Cloudflare setup are
  intentionally deferred.
