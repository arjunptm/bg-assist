# BG Assistant Project Notes

## Sources of truth

- `PRODUCT_SPEC.md` is the authoritative v1 product specification.
- `README.md` documents current capabilities and local commands.
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
- The local repository uses `main` and currently has no remote.
- Never commit `.dev.vars`, `.env` files, Cloudflare credentials, private
  exports, real capability links, or `.wrangler/` state.
- `wrangler.jsonc` contains a placeholder D1 ID until the guided Cloudflare
  setup. Do not deploy it as-is.
- Production target is `bg.arjunmakes.games`, but DNS and Cloudflare setup are
  intentionally deferred.

