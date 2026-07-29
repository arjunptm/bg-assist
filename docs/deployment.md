# Development deployment runbook

This runbook creates a temporary HTTPS development deployment on
`workers.dev`. It does not attach `gamenight.ludicmethods.com`, change DNS, or
create a production database.

For the complete domain-purchase-through-production sequence, follow
[`gamenight-launch-checklist.md`](gamenight-launch-checklist.md).

Application deployment and D1 migration are separate deliberate actions.
Merging code must never apply database migrations automatically.

## What is already prepared

- The checked-in Worker name and D1 database name are
  `bg-assistant-development`.
- `wrangler.jsonc` contains a visible placeholder for the development D1 ID.
  A D1 ID is resource configuration and may be committed; account credentials
  and API tokens must not be committed.
- Persisted Workers observability is disabled because invocation logs include
  the request URL, and Game Night capability tokens appear in API paths.
- `pnpm run build` verifies PWA metadata, icons, service-worker output, SPA
  fallback, the D1 binding, and disabled persisted logging.
- Tests verify both a clean install through all migrations and an upgrade from
  a populated initial schema through migrations 0002 and 0003.

## One-time account and development database setup

Run these commands from the repository root after creating or selecting a
Cloudflare account:

```bash
pnpm exec wrangler login
pnpm exec wrangler whoami
pnpm exec wrangler d1 create bg-assistant-development
```

`wrangler login` opens Cloudflare's browser authorization. Do not paste an API
token into chat, a source file, `.env`, or `.dev.vars`.

Copy the returned D1 `database_id` into the matching placeholder in
`wrangler.jsonc`. Confirm that only that public resource ID changed:

```bash
git diff -- wrangler.jsonc
git status --short
```

Commit that binding change through the normal pull-request workflow before
connecting automated builds.

## Initialize and verify remote D1

First list the unapplied migrations, then apply them deliberately:

```bash
pnpm run db:remote:list
pnpm run db:remote:migrate
pnpm run db:remote:list
```

The final list should report no unapplied migrations. Verify the migration
ledger and final option columns:

```bash
pnpm exec wrangler d1 execute bg-assistant-development --remote --command="SELECT name FROM d1_migrations ORDER BY id"
pnpm exec wrangler d1 execute bg-assistant-development --remote --command="PRAGMA table_info(assignment_options)"
```

Expected migration files are:

1. `0001_initial.sql`
2. `0002_option_descriptions.sql`
3. `0003_option_colors.sql`

Never add `db:remote:migrate` to the deploy command. Review and run it only when
a checked-in feature introduces a D1 migration.

## First manual development deployment

Verify locally and deploy:

```bash
pnpm run typecheck
pnpm test
pnpm run build
pnpm run deploy
```

The resulting `workers.dev` URL is the development origin. Create only
disposable groups there until the HTTPS/device preflight is complete.

## Connect GitHub Workers Builds

In Cloudflare:

1. Open **Workers & Pages** and select `bg-assistant-development`.
2. Open **Settings → Builds**, select **Connect**, authorize the Cloudflare
   GitHub app for `arjunptm/bg-assist`, and choose the repository.
3. Set the production branch to `main`.
4. Enable builds for non-production branches so pull requests receive preview
   versions.
5. Use repository root `/`.
6. Use `pnpm run typecheck && pnpm test` as the build command.
7. Use `pnpm run deploy` as the production deploy command.
8. Enable the advanced non-production branch deploy command and use
   `pnpm run deploy:preview`.
9. Leave **Create new token** selected. Cloudflare generates and manages the
   Workers Builds token.
10. Add the unencrypted build variable `PNPM_VERSION`, matching the
    `packageManager` version in `package.json`.
11. Leave build caching disabled for the first production and preview
    verification. It may be enabled after both paths succeed.

Workers Builds installs dependencies automatically; the current connection
screen does not provide a separate install-command field. Do not add
`SKIP_DEPENDENCY_INSTALL`.

The Worker name in Cloudflare must match `name` in `wrangler.jsonc`. A push to
`main` should create and promote a deployment. A pull-request branch should run
`wrangler versions upload`, post a preview URL, and must not replace the active
deployment.

## HTTPS smoke test

Use generic player names and disposable game data:

- Create a group and retain its capability link.
- Join that link in a second browser profile.
- Add and edit a game with descriptions, colors, quantities, and a banned pair.
- Confirm revisions, delete, and Undo across the two profiles.
- Add player names and assignments, then inspect network requests to confirm
  neither appears in API payloads.
- Export and re-import a configuration backup; confirm the file has no
  capability link or player data.
- Load the group once, go offline, and confirm cached setup/randomization works
  while shared edits and imports are blocked.
- Test Android- and iPhone-sized layouts, system light/dark themes, native share
  where available, manual link/QR fallbacks, PWA installation, launch, refresh,
  and a deep group URL in standalone mode.

Do not enable persisted invocation logs. Cloudflare live-tail tools also expose
request URLs; use them only with disposable capability links and stop the tail
before using any retained group.

## Deployment rollback

Application rollback and D1 recovery are different operations:

- Use the Worker's deployment/version history to promote the last known-good
  application version.
- Do not reverse a D1 migration by redeploying old code.
- Before a schema migration, verify compatibility in both directions and rely
  on Cloudflare's migration backup plus a reviewed forward-fix plan.
- If a migration fails, stop writes and inspect its recorded status before
  retrying. Never edit an already-applied migration file.

## References

- [Cloudflare Vite plugin deployment](https://developers.cloudflare.com/workers/vite-plugin/tutorial/)
- [Workers Builds and Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Workers Builds configuration and previews](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [D1 Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Workers invocation logging](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
