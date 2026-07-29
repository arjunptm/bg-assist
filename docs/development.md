# Development Workflow

BG Assistant follows the workspace-level repository maintenance standard. This
document defines the concrete branch, local review, and pull-request process
for this repository.

## Before starting work

1. Confirm the working tree, branch, and upstream:

   ```powershell
   git status --short --branch
   git remote -v
   ```

2. Check open and closed GitHub issues for related work:

   ```powershell
   gh issue list --state open --limit 100
   gh issue list --state all --search "<keywords>"
   ```

3. Use or refine an existing issue when it fits. For meaningful work without
   an issue, create or propose a focused issue with context and acceptance
   criteria.

4. Start from an up-to-date `main` and create a short-lived branch:

   ```powershell
   git switch main
   git pull --ff-only
   git switch -c AI-<short-description>
   ```

Tiny typo corrections and similarly low-risk maintenance may skip an issue.
Direct work on `main` still requires explicit approval.

## Local review

Review the actual change before committing:

```powershell
git status --short
git diff
```

Use the checks appropriate to the change:

| Change | Required local review |
| --- | --- |
| Documentation only | Review rendered Markdown, links, status, and diff |
| TypeScript or runtime logic | `pnpm run typecheck`, `pnpm test`, `pnpm run build` |
| Randomizer or privacy boundary | Add or update focused tests; run the full verification suite |
| D1 schema or Worker API | Apply migrations locally, run tests/build, and exercise the changed API locally |
| UI or interaction | Run the full verification suite and manually exercise the touched mobile workflow |
| PWA or offline behavior | Test online and cached/offline behavior with a previously loaded group |

For UI work, also check:

- Narrow mobile layout and large touch targets
- Keyboard labels and non-color-only state indicators
- System dark mode when affected
- Error, empty, loading, stale, and offline states when affected
- That player names and named assignment results never enter requests, logs, or
  shared storage

Do not commit `dist/`, `.wrangler/`, dependencies, credentials, `.env` files,
real capability links, or local test data.

## Commits and pull requests

Prefer one clear commit per coherent feature or fix:

```powershell
git add <reviewed-files>
git commit -m "<concise imperative outcome>"
git push -u origin AI-<short-description>
```

Open a pull request for meaningful work. Its description should include:

- What changed and why
- The linked issue, if any
- Verification performed
- Screenshots for material visual changes
- Migration, privacy, or offline implications
- Known limitations or deferred work

Use `Closes #<issue>` only when merging the pull request should complete that
issue. Review the final PR diff and required CI checks before merging.

GitHub Actions runs the same frozen install, typecheck, test, and build steps
for pull requests and pushes to `main`. The required check is named
`Verify source`. The build also validates the generated PWA manifest, icons,
service worker, SPA fallback, D1 binding, and disabled persisted invocation
logging.

Persistence and Worker integration tests use `fake-indexeddb` for browser-local
state and Miniflare with an isolated D1 database for the real Hono/D1 boundary.
The integration harness applies every checked-in migration before exercising
capability access, strict payload validation, revisions, deletion, and restore.
The migration-upgrade test separately starts with a populated initial schema and
applies each later migration in order.

### Interrupted Windows test runs

Vitest uses one worker thread for this repository. This avoids the separate
child-process pool that can survive when a terminal or automation wrapper is
forcibly stopped.

If `pnpm test` is interrupted or its caller times out, do not immediately start
another test run. First check Task Manager for Vitest or tinypool Node.js
workers whose command line belongs to this repository. Stop only that
interrupted test process tree; other applications and an intentional Vite
development server may also use Node.js or esbuild. A normal completed test run
should leave no test-related workers behind.

## Handoff

At the end of a task, report:

- The branch and latest commit
- Verification completed or omitted
- Whether work is uncommitted, committed, pushed, in a PR, merged, deployed, or
  released
- Any remaining review, issue, migration, deployment, or cleanup step

Do not describe local work as pushed, a branch as merged, or a build as
deployed without checking that exact state.
