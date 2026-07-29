# Game Night launch checklist

This is the ordered, follow-along checklist for launching BG Assistant publicly
as **Game Night** at:

```text
https://gamenight.ludicmethods.com
```

The repository, package, Worker, database, and export-format names may continue
to use `bg-assist` or `bg-assistant`. The public website, installed PWA, and
user-facing sharing language should use **Game Night** before production.

Use this document for the complete account-to-production sequence. Use
[`deployment.md`](deployment.md) for detailed development Worker and D1
commands.

## Decisions already made

- [x] Umbrella domain: `ludicmethods.com`
- [x] Application hostname: `gamenight.ludicmethods.com`
- [x] Public application name: **Game Night**
- [x] Internal names may remain `bg-assist` or `bg-assistant`
- [x] Cloudflare Workers will host the application
- [x] Cloudflare D1 will store shared group and game configuration
- [x] Development and production will use separate Workers and D1 databases
- [x] Application deployments and D1 migrations remain separate actions

## Recommendation: buy the domain through Cloudflare

For this new domain, Cloudflare Registrar is the simplest choice because the
application, DNS, TLS certificate, Worker, and D1 database are all intended to
live in Cloudflare.

Cloudflare Registrar sells supported domains at registry/ICANN cost without an
added registrar markup, enables auto-renew by default, redacts WHOIS information
where permitted, and immediately uses Cloudflare DNS. Buying through
Squarespace would work, but would add a later nameserver migration with no clear
benefit for a new, unused domain.

The tradeoff is that a Cloudflare-registered domain must use Cloudflare
nameservers. To use another DNS provider later, the registration would need to
be transferred away first. That is reasonable here because Cloudflare is the
chosen DNS and hosting platform.

Availability and pricing can change. Confirm the exact spelling, first-year
price, and renewal price immediately before purchase.

---

## Part 1: tasks Arjun must complete

These steps involve account ownership, payment, or browser authorization. Do
not send passwords, payment information, recovery codes, API tokens, or
Cloudflare authorization tokens through chat or commit them to the repository.

### 1. Create and secure the Cloudflare account

- [ ] Go to <https://dash.cloudflare.com/sign-up> and create an account, or sign
      in to the account that should permanently own the domain and application.
- [ ] Use and verify an email address you expect to retain long-term.
- [ ] Enable two-factor authentication.
- [ ] Save the recovery codes securely.
- [ ] Confirm the account is the one in which the Worker and D1 databases
      should live.
- [ ] Add a payment method when registration requests one.

Do not manually create a Worker or D1 database yet. The project configuration
and Wrangler commands will create consistently named resources.

### 2. Purchase `ludicmethods.com`

In the Cloudflare dashboard:

1. Open **Domain Registration**.
2. Select **Register Domains**.
3. Search for exactly `ludicmethods.com`.
4. Confirm the result is the `.com` domain and every letter is correct.
5. Review the purchase price and future renewal price.
6. Choose a registration term. One year with auto-renew is adequate unless you
   prefer to prepay more years.
7. Enter complete and accurate registrant contact information.
8. Review the terms and complete the purchase.
9. Verify any registrant-confirmation email promptly. An unverified email can
   cause the domain to be placed on hold.
10. Return to **Domain Registration → Manage Domains** and confirm:
    - `ludicmethods.com` is active;
    - auto-renew is enabled;
    - the expiration date is correct; and
    - the registrant email is correct.
11. Open the DNS page and confirm Cloudflare manages the zone.
12. Enable DNSSEC if it is not already enabled.

Do not manually create `gamenight.ludicmethods.com` as a CNAME. The Worker
Custom Domain process will create the necessary DNS record and TLS certificate
later.

The root `ludicmethods.com` does not need to host anything yet. Leave it unused
until the umbrella site is designed. Do not point it at Game Night unless that
becomes a separate decision.

### 3. Authorize Wrangler on this computer

Open Git Bash in the project folder:

```bash
cd "/w/Codex Projects/BG Assistant"
pnpm exec wrangler login
```

Wrangler should open a Cloudflare authorization page.

- [ ] Sign in to the account that owns `ludicmethods.com`.
- [ ] Approve Wrangler access.
- [ ] Return to Git Bash.
- [ ] Verify the account:

  ```bash
  pnpm exec wrangler whoami
  ```

- [ ] Confirm the displayed account is the intended account.

This login does not deploy, create a database, or change DNS. It only authorizes
this computer for later Cloudflare operations.

**Pause here and tell Codex that the domain purchase and `wrangler whoami`
check succeeded.** Codex can then handle the project-specific preparation with
you.

---

## Part 2: development Cloudflare environment

The development environment provides a real HTTPS `workers.dev` address without
putting the application at the public domain. Use disposable data at this stage.

### 4. Create the development D1 database

From the repository root:

```bash
pnpm exec wrangler d1 create bg-assistant-development
```

Cloudflare returns a `database_id`.

- [ ] Replace the development placeholder in `wrangler.jsonc` with that ID.
- [ ] Confirm no account token or secret was added.
- [ ] Review the exact diff:

  ```bash
  git diff -- wrangler.jsonc
  git status --short
  ```

- [ ] Commit the binding through the issue/pull-request workflow before
      connecting automated builds.

A D1 resource ID is public configuration and may be committed. Credentials,
`.dev.vars`, `.env` files, private exports, and `.wrangler/` state must not be
committed.

### 5. Initialize the development database

```bash
pnpm run db:remote:list
pnpm run db:remote:migrate
pnpm run db:remote:list
```

- [ ] The final command reports no unapplied migrations.
- [ ] The ledger lists `0001_initial.sql`, `0002_option_descriptions.sql`, and
      `0003_option_colors.sql`.
- [ ] The final schema includes option descriptions and colors.

Never add migration commands to ordinary deployment. Code deployments and
schema migrations are deliberately independent.

### 6. Perform the first manual development deployment

```bash
pnpm run typecheck
pnpm test
pnpm run build
pnpm run deploy
```

- [ ] Record the resulting HTTPS `workers.dev` address.
- [ ] Open it on desktop and Android.
- [ ] Open it on an iPhone if available.
- [ ] Do not attach `gamenight.ludicmethods.com` yet.

### 7. Test the development deployment

Use generic player names and disposable games.

### Shared behavior

- [ ] Create a group and retain its capability link.
- [ ] Join it in a second browser or profile.
- [ ] Create, edit, delete, and undo deletion of a game.
- [ ] Confirm revisions appear on both clients.
- [ ] Test descriptions, colors, quantities, and banned pairs.
- [ ] Test per-session restrictions and Start Over.

### Privacy and recovery

- [ ] Confirm player names and named assignments remain device-local.
- [ ] Inspect network requests and confirm neither enters API payloads.
- [ ] Export and import one game and all games.
- [ ] Confirm duplicate imports gain the `(imported)` suffix.
- [ ] Confirm backups exclude capability links, players, and assignments.
- [ ] Confirm Clear players uses the inline confirmation and works.

### Mobile, routing, PWA, and offline behavior

- [ ] Refresh the home page and a deep group route.
- [ ] Navigate repeatedly among group, editor, and setup screens.
- [ ] Confirm no raw JSON `not_found` page appears.
- [ ] Test native sharing and link/QR fallbacks.
- [ ] Install, launch, close, and reopen the Android PWA.
- [ ] Repeat on iPhone if available.
- [ ] Load a group, go offline, and confirm cached setup works.
- [ ] Confirm shared edits and imports are blocked offline.
- [ ] Check light and dark mode and phone-sized controls.

If the intermittent JSON error occurs, record the complete URL, preceding tap,
browser-tab versus installed-PWA state, phone model, OS, and browser. Add the
evidence to GitHub issue #35.

### 8. Connect Cloudflare Workers Builds to GitHub

After the manual deployment works:

1. Open **Workers & Pages** and select `bg-assistant-development`.
2. Open **Settings → Builds** and select **Connect**.
3. Authorize the Cloudflare GitHub app for `arjunptm/bg-assist`.
4. Choose the `bg-assist` repository.
5. Set the production branch to `main`.
6. Enable non-production branch builds for pull-request previews.
7. Use repository root `/`.
8. Use this install command if requested:

   ```bash
   pnpm install --frozen-lockfile
   ```

9. Use this build command:

   ```bash
   pnpm run typecheck && pnpm test
   ```

10. Use this production deploy command:

    ```bash
    pnpm run deploy
    ```

11. Use this preview deploy command:

    ```bash
    pnpm run deploy:preview
    ```

12. Test a harmless pull request and confirm it receives a preview build.
13. Merge it and confirm `main` deploys successfully.

Merged code should now deploy automatically to development. D1 migrations must
still be reviewed and applied manually.

---

## Part 3: prepare the public Game Night release

Do not point the public hostname at the development Worker or database.

### 9. Complete the public-brand pass

Create a focused issue and pull request that changes user-visible branding from
BG Assistant to Game Night while retaining compatibility-sensitive internals.

Update and verify:

- [ ] Browser page title and app header: **Game Night**
- [ ] PWA manifest name, short name, and installed-app label
- [ ] PWA icons if a new visual identity is selected
- [ ] Share-sheet title and sharing text
- [ ] User-facing link labels, validation errors, and error page
- [ ] Backup explanatory text where it names the product
- [ ] Public README material and screenshots
- [ ] Example URLs: `https://gamenight.ludicmethods.com/g/...`

Do not casually rename the npm package, IndexedDB database, backup-format
identifier, repository, migration history, D1 binding, or internal TypeScript
symbols. Renaming those is unnecessary for the public brand and could break
stored data or backup compatibility.

### 10. Finish production-readiness work

- [ ] Resolve or consciously disposition issue #35, the raw JSON 404.
- [ ] Complete issue #4's mobile, accessibility, theme, PWA, and offline review.
- [ ] Validate issue #12's sharing behavior from an HTTPS origin.
- [ ] Complete issue #7's repository visibility and licensing decision.
- [ ] Review rate limits, validation, capability-token handling, and privacy.
- [ ] Confirm persisted invocation logging remains disabled because capability
      tokens occur in request paths.
- [ ] Document the release rollback procedure.

### 11. Create separate production resources

Use:

```text
Production Worker: bg-assistant
Production D1:     bg-assistant-production
Public hostname:   gamenight.ludicmethods.com
```

Before running production commands, Codex should add and review an explicit
production configuration so development scripts cannot target production.

- [ ] Add explicit production configuration and commands.
- [ ] Create `bg-assistant-production`.
- [ ] Put its resource ID only in the production binding.
- [ ] Verify development commands still target development only.
- [ ] Run typecheck, tests, and build.
- [ ] List and deliberately apply production migrations.
- [ ] Confirm no migrations remain unapplied.
- [ ] Deploy the production Worker.
- [ ] Test its temporary production `workers.dev` address.

Do not create long-lived real groups until the production schema and routing
checks pass.

### 12. Attach `gamenight.ludicmethods.com`

Because the domain was purchased through Cloudflare, its zone should already be
active in the same account. No Squarespace nameserver migration is needed.

Before attaching:

- [ ] Confirm `ludicmethods.com` is active.
- [ ] Confirm the production Worker works at its temporary address.
- [ ] Confirm it uses `bg-assistant-production`, not development.
- [ ] Check DNS for an existing `gamenight` record.
- [ ] Only remove a conflict after confirming another service does not use it.

Then:

1. Open the production Worker.
2. Go to **Settings → Domains & Routes**.
3. Select **Add → Custom Domain**.
4. Enter exactly `gamenight.ludicmethods.com`.
5. Confirm the addition.
6. Wait for Cloudflare to create DNS and issue the TLS certificate.
7. Confirm the domain is active.
8. Open <https://gamenight.ludicmethods.com>.

Do not manually create a CNAME first. The Worker Custom Domain flow creates the
DNS record and certificate.

### 13. Run the final production test

- [ ] Confirm valid HTTPS and load the home page.
- [ ] Open and refresh a deep group link.
- [ ] Install and reopen the production PWA on Android and iPhone if available.
- [ ] Test QR, native sharing, and copy-link fallbacks.
- [ ] Create a disposable production group and join from a second device.
- [ ] Test editing and revision behavior.
- [ ] Confirm players and assignments remain local.
- [ ] Confirm export/import and offline cached play.
- [ ] Delete disposable data when it is no longer needed.

### 14. Declare the first release

- [ ] Update `CHANGELOG.md` with the production version and date.
- [ ] Confirm GitHub `main` matches the deployed commit.
- [ ] Record the Worker deployment/version ID.
- [ ] Confirm the production migration ledger.
- [ ] Close or update issues #4, #5, #6, #12, #25, and #35 as appropriate.
- [ ] Create a Git tag or release if selected by the licensing/release decision.
- [ ] Retain real group capability links; v1 intentionally has no account or
      group-search recovery.

---

## Ongoing deployment rules

### Code-only changes

For wording, styling, solver logic, and most PWA changes:

1. Create an issue and branch.
2. Implement and verify.
3. Open a pull request and review its preview.
4. Merge to `main`.
5. Confirm Cloudflare's automatic deployment.

No D1 migration is needed.

### Schema-changing features

For a new D1 column, table, index, or constraint:

1. Identify the schema change in the issue.
2. Add a new numbered migration; never edit an applied migration.
3. Update code, schemas, tests, and documentation.
4. Test a clean database and an upgrade from the prior populated schema.
5. Apply the migration deliberately to development and test it.
6. Apply the reviewed migration deliberately to production at the planned
   rollout point.
7. Deploy or promote compatible application code.
8. Verify the production migration ledger and application.

Never add automatic production D1 migration to the deploy command.

### Recovery and rollback

- Roll back code by promoting the last known-good Worker version.
- Do not reverse a D1 migration by deploying old application code.
- Before a production migration, confirm compatibility and a forward-fix plan.
- If a migration fails, stop writes and inspect its ledger before retrying.
- Never edit a migration that has already been applied.

---

## Official references

- [Register a domain with Cloudflare](https://developers.cloudflare.com/registrar/get-started/register-domain/)
- [Cloudflare Registrar overview](https://developers.cloudflare.com/registrar/)
- [Cloudflare Registrar DNSSEC](https://developers.cloudflare.com/registrar/get-started/enable-dnssec/)
- [Workers Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Workers Builds and Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [D1 Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/)
