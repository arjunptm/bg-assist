# BG Assistant and Personal Hosting Discussion

This document summarizes the initial BG Assistant product discussion, the selected technical direction, and the broader conversation about organizing and hosting a growing collection of personal web tools.

## 1. Project Status

The local project is located at:

```text
W:\Codex Projects\BG Assistant
```

No application code has been implemented yet. The project remains in product and architecture planning.

## 2. Product Concept

“BG” stands for board game. BG Assistant is intended for weekend board-game sessions with friends.

The application should be:

- Accessible from a normal browser.
- Usable without installing anything.
- Optionally installable as a Progressive Web App (PWA) from Chrome on Android.
- Available without creating an account or signing in.
- Mobile-first and easy to operate around a table.

### Core Workflow

1. Select a board game.
2. Enter the players participating in the current session.
3. Load previously saved roles, player mats, factions, characters, colors, or other game-specific assignments.
4. Add or edit the available roles if needed.
5. Press a shuffle button.
6. Randomly assign one role to each player.
7. Display the resulting assignments clearly.

Games and their available roles should persist across later sessions. A game-management interface will therefore be needed for adding and editing games and their roles.

## 3. Privacy Decisions

Player names must never be stored in the shared backend.

The currently selected behavior is:

- Player names remain on the current device.
- They remain available until someone presses a visible **Clear players** action.
- They are never written to Cloudflare D1.
- They are never included in shared game data or backend assignment history.
- They are never transmitted to the backend.
- Randomization happens locally in the browser.

Because names remain until manually cleared, another person using the same browser profile could see them. They are private to that browser but are not erased automatically.

## 4. Group and Access Model

The selected access model is a private, capability-based group link:

```text
https://bg.arjunmakes.games/g/<unguessable-group-code>
```

Planned behavior:

- Each group has a cryptographically unguessable identifier.
- Anyone with the group link can view and edit that group’s games and roles.
- No account or login is required.
- Different groups have separate game libraries.
- The group identifier effectively acts as the access credential.
- A new phone joins a group by opening its shared link once.
- The app remembers the last-used group locally.
- The installed PWA reopens the last-used group.
- The app should eventually support switching among multiple joined groups.

This model avoids a globally editable public catalog while preserving account-free access.

Still unresolved:

- Whether lost group links can be recovered.
- Whether a separate organizer or recovery code is needed.
- Whether edits need history, undo, or soft deletion.
- How simultaneous edits from multiple phones should be handled.
- Whether inactive groups should expire.
- Whether users can export, import, or duplicate a group library.

## 5. PWA Behavior

A private group link is compatible with an installable PWA.

The intended configuration is:

- The site works normally in a modern browser.
- Android Chrome can add it to the home screen or app drawer.
- The installed app uses standalone display mode.
- There is one installed BG Assistant application, not one installation per group.
- The PWA manifest uses a stable application ID.
- `start_url` is `/`.
- PWA scope is `/`.
- The last-used group is stored locally and restored when launching from the app icon.
- Group deep links remain within the installed application’s scope.

The permanent production domain should be established before the PWA is widely installed because installed-app identity and browser storage are specific to a web origin.

## 6. Selected Technical Direction

### Frontend

- React
- TypeScript
- Vite
- Mobile-first responsive design
- PWA manifest and service worker

### Hosting and Backend

- Cloudflare Workers Static Assets
- A Cloudflare Worker API
- Cloudflare D1 for persistent groups, games, and roles
- Cloudflare’s Vite integration for local development
- Cloudflare Workers Builds connected to GitHub

Cloudflare currently recommends Workers Static Assets instead of Pages for new static, single-page, and full-stack applications. Pages remains supported, but Workers is the preferred surface for new projects.

The exact API framework has not been selected. A small direct Worker API or a Hono-based API would both fit.

### Source Control and Deployment

- BG Assistant will use a public GitHub repository.
- GitHub will be the canonical source of code and version history.
- Cloudflare will connect directly to the GitHub repository.
- Pushes to the production branch will automatically build and deploy.
- Pull requests and development branches should receive preview deployments.
- Secrets and private application data must remain in Cloudflare and never enter GitHub.

### Persistent Data

Cloudflare D1 should contain only:

- Groups
- Games
- Game configuration
- Roles, mats, factions, characters, colors, or similar assignment options
- Safe operational metadata such as creation and update timestamps

D1 must not contain:

- Player names
- Personal information about friends
- Assignment results containing names

### Anonymous-Access Protection

Likely safeguards include:

- Cryptographically random group identifiers.
- Strict server-side input validation.
- Request-size limits.
- Rate limiting.
- Cloudflare Turnstile on group creation if the app becomes publicly discoverable.
- Possibly Turnstile or throttling for repeated persistent edits.
- No unrestricted endpoint for browsing or searching all groups.

## 7. Hosting Cost

BG Assistant is expected to fit within Cloudflare’s free tier.

At the time of the discussion, the free allowances included approximately:

- 100,000 Worker requests per day.
- Five million D1 row reads per day.
- 100,000 D1 row writes per day.
- 5 GB of D1 storage.

On the free plan, exceeding D1 limits causes requests to fail until the quota resets rather than automatically creating usage charges.

Relevant documentation:

- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Workers Static Assets guidance](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
- [React and Vite on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/)
- [GitHub deployment integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)

## 8. Production Domain

The selected permanent address is:

```text
https://bg.arjunmakes.games
```

The existing `arjunmakes.games` apex domain currently hosts a GitHub Pages portfolio.

Observed DNS setup during planning:

- Authoritative nameservers are Google Domains/Squarespace-related nameservers.
- `arjunmakes.games` resolves to GitHub Pages IP addresses.
- `www.arjunmakes.games` points to `arjunptm.github.io`.

The existing portfolio should remain unchanged.

### DNS Hosting Versus Domain Ownership

Domain registration, DNS hosting, and website hosting are separate responsibilities:

- The registrar owns and renews the domain.
- The DNS provider directs each hostname.
- GitHub or Cloudflare serves the actual website or application.

Moving DNS hosting to Cloudflare would not transfer ownership or change where the domain is renewed. It would make Cloudflare responsible for answering DNS queries.

After a future DNS migration, routing could look like:

- `arjunmakes.games` → existing GitHub Pages portfolio
- `www.arjunmakes.games` → existing GitHub Pages portfolio
- `bg.arjunmakes.games` → BG Assistant Worker
- Future subdomains → other tools or services

Cloudflare Workers custom domains require the domain to be an active Cloudflare DNS zone.

### Planned DNS Sequence

DNS should not be moved yet.

Instead:

1. Build BG Assistant locally.
2. Deploy and test it using a temporary `workers.dev` address.
3. Do not widely install or distribute the PWA during development.
4. When the application is ready for production, inventory every existing DNS record.
5. Reproduce and verify those records in Cloudflare.
6. Carefully handle MX, TXT, CAA, and DNSSEC configuration.
7. Change the authoritative nameservers at the existing registrar.
8. Confirm that the portfolio and any email or verification services still work.
9. Attach `bg.arjunmakes.games` to the Worker.
10. Begin distributing and installing the production PWA.

Relevant documentation:

- [Cloudflare Worker custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

## 9. Alternatives Considered

Options discussed included:

- GitHub Pages with browser-local storage.
- GitHub Pages with a public Google Sheet.
- Google Apps Script as an anonymous backend.
- Supabase.
- Firebase.
- Cloudflare Pages or Workers with D1.
- A conventional rented VPS.
- A server running inside the home.

### Why Not GitHub Pages With a Public Google Sheet?

GitHub Pages serves static HTML, CSS, and JavaScript. A public Google Sheet can be read relatively easily, but anonymous writes require either Google OAuth or an Apps Script web endpoint.

Apps Script can be deployed for anonymous access and can execute as the script owner. That makes validation, quotas, abuse prevention, and protection of the owner’s Google permissions important.

The arrangement is technically possible but was not recommended for a public, anonymously writable application.

### Why Cloudflare Was Selected

Cloudflare provides:

- Static frontend delivery.
- API execution.
- SQL-style persistent storage.
- Custom domains.
- GitHub-connected deployments.
- Anonymous access.
- Rate limiting and Turnstile integration.
- A sufficient free tier.
- No server operating-system maintenance.

## 10. Broader Personal-Tool Hosting Discussion

The growing collection currently includes tools such as:

- Food Assist: Google Sheets and Apps Script.
- AMEX Rewards Tracker: Google Sheets and Apps Script.
- Travel Reimbursement Assistant: Google Sheets, Apps Script, and Google Drive.
- Mahathi Arangetram website: static GitHub Pages site.
- BG Assistant: planned Cloudflare application.
- Other personal trackers and utilities.

The concern is that future tools may become scattered across different technologies and deployment locations.

The conclusion was that the underlying problem is deployment organization rather than merely server ownership.

### Long-Term Organizational Direction

The selected future direction is to maintain both:

1. A private deployment registry.
2. A public tools homepage.

These should become a separate future “personal platform” or infrastructure project rather than being coupled to BG Assistant.

A private registry could record:

- Application name
- Repository
- Production URL
- Hosting provider
- Data store
- Privacy level
- Authentication method
- Backup method
- Deployment procedure
- Operational owner
- Status and health-check URL

The public homepage would show only tools intentionally meant for public access.

A future generic domain may become the umbrella for the broader tool collection. `arjunmakes.games` can remain the permanent home for BG Assistant and other game-related work.

## 11. Home Server and NAS Discussion

A home server remains a long-term interest but is not part of the current BG Assistant implementation.

Potential future hosts discussed:

- Existing Raspberry Pi 3.
- A roughly $100 university-surplus laptop.
- A future NAS.
- A small rented VPS.

### Raspberry Pi 3 Assessment

The Pi 3 could work as a learning server for:

- A static dashboard.
- Tailscale.
- Cloudflare Tunnel.
- A few lightweight APIs.
- Very low-traffic applications.

Limitations:

- 1 GB RAM.
- USB 2.0.
- 100 or 300 Mb/s Ethernet depending on model.
- ARM container compatibility.
- Slow local builds.
- Greater risk if persistent data lives on microSD.

If used later:

- Install 64-bit Raspberry Pi OS Lite.
- Use wired Ethernet.
- Put persistent application data on an SSD.
- Avoid relying on microSD for databases.
- Prefer prebuilt multi-architecture containers.

### Used-Laptop Assessment

A used laptop would be the better first serious home server if it has:

- 64-bit Intel or AMD CPU.
- At least 8 GB RAM.
- At least a 128–256 GB SSD.
- Gigabit Ethernet.
- A working battery and charger.
- BIOS support for automatic restart after power loss.

A laptop could eventually remain the compute server while a NAS provides bulk storage and backups.

### Possible Future Home-Server Stack

- Debian or Ubuntu Server
- Docker Compose
- Caddy or Traefik
- Cloudflare Tunnel for public applications
- Tailscale for private administration
- SQLite for small isolated applications
- PostgreSQL only when justified
- Restic or similar encrypted backups
- One local USB backup plus one encrypted offsite/cloud backup

### Current Decision

No home server or NAS will be purchased or configured now.

BG Assistant should use the free GitHub and Cloudflare implementation. Home-server and NAS planning can be revisited later.

## 12. Unresolved Product Decisions

The infrastructure direction is established, but the product specification is not yet complete.

### Games and Roles

- What exactly counts as a role?
- Can a game contain multiple assignment categories?
- Can one player receive multiple assignments?
- Can roles repeat?
- Are roles restricted by player count?
- Should assignments be balanced by category or completely random?
- Can roles be marked unavailable for a particular session?
- Can the same game have multiple saved presets?

### Player Workflow

- How are players added, reordered, or temporarily excluded?
- Are saved local names associated with a particular group or shared across groups on the device?
- Should there be a quick **Use last players** action?
- Exactly what should **Clear players** remove?
- Should assignments be revealed together or one player at a time?
- Is a private per-player reveal mode needed?

### Randomization

- Should repeat assignments from previous sessions be avoided?
- If repeat avoidance is required, how can history work without storing player names?
- Can users reroll one assignment?
- Are exclusions or preferences supported?
- What happens when the number of players and roles differs?
- Should browser cryptographic randomness be used?

### Editing and Groups

- Can anyone with the link permanently delete a game?
- Should deletion be reversible?
- Is a separate owner or recovery code required?
- How are simultaneous edits handled?
- Can a group or game be exported, duplicated, or shared with another group?
- Is there a starter catalog of common games?

### Offline Behavior

- Should the installed PWA allow shuffling without an internet connection?
- Should it cache the most recently used game library?
- Can persistent edits be made offline?
- If offline edits are supported, how are conflicts resolved after reconnecting?

### User Interface

- Final screen structure and navigation.
- Game-selection screen.
- Session-setup screen.
- Assignment/reveal screen.
- Game-management screen.
- Group-management and sharing screen.
- Accessibility and color-blind-safe design.
- Dark mode.
- Tablet and desktop behavior.

## 13. Established Decisions

| Decision | Selected Direction |
| --- | --- |
| App type | Mobile-first web app and installable PWA |
| Login | None |
| Persistent catalog | Per-group shared library |
| Group access | Unguessable group link |
| Editing | Anyone with the group link |
| Player names | Device-only until manually cleared |
| Player names in backend | Never |
| Source repository | Public GitHub repository |
| Frontend | React, TypeScript, and Vite |
| Runtime and hosting | Cloudflare Workers Static Assets |
| Backend | Cloudflare Worker API |
| Database | Cloudflare D1 |
| Deployment | Cloudflare Workers Builds from GitHub |
| Production domain | `bg.arjunmakes.games` |
| Development URL | Temporary `workers.dev` URL |
| DNS migration | Immediately before production launch |
| Home server | Deferred |
| NAS | Deferred |
| Tool organization | Future private registry and public homepage |
| Future self-hosted backups | Local USB plus encrypted cloud copy |

## 14. Suggested Continuation Prompt

Paste or upload this document to ChatGPT with the following instruction:

> I am planning a mobile-first PWA called BG Assistant for board-game sessions. Treat all decisions marked as established in the attached handoff as selected unless you identify a concrete technical conflict. The infrastructure direction is React, TypeScript, Vite, Cloudflare Workers Static Assets, a Worker API, D1, public GitHub source, and `bg.arjunmakes.games`. There is no login; groups use unguessable links; games and roles are shared per group; player names remain only in browser storage and are never sent to the backend. Continue the product-design discussion conversationally. Help me decide the remaining workflows, role model, randomization rules, offline behavior, editing behavior, and UI before producing a final implementation plan. Do not start implementation yet.
