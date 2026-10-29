# DEVOPS-02: GitHub Actions CI Pipeline

**Plan ID:** DEVOPS-02 | **Epic:** DEVOPS | **Owner:** DEV-C | **Status:** Code complete. Required checks are not yet enforced on `main` (manual step below).

## Overview

Every pull request to `main` runs automated checks for code quality, database integrity, and secrets. A check blocks a merge only after branch protection on `main` requires it (see [Required status checks](#required-status-checks-manual-github-setting)).

## Architecture

```
Pull request to main
├── CI (.github/workflows/ci.yml)
│   ├── lint-and-test   ESLint, tsc --noEmit, Jest, expo install --check
│   ├── database        supabase start, pgTAP tests, supabase db lint
│   ├── types-drift     pnpm db:types, fail if database.types.ts changes
│   └── secrets         gitleaks, service-role key grep (apps/, packages/)
└── Edge Functions (.github/workflows/edge-functions.yml)
    └── deno-tests      deno test, deno fmt --check, deno lint
```

## Workflows

### 1. CI (`.github/workflows/ci.yml`)

**Triggers:** `pull_request` and `push` to `main`. No path filter, so every PR runs every job.

#### Job 1: `lint-and-test`
- **Measured duration:** about 1 minute (run 40951232765)
- **Steps:** checkout; pnpm 9; Node 18 with the pnpm store cached; restore `.turbo/cache` with `actions/cache`; `pnpm install --frozen-lockfile`; `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm -F @sisig/mobile exec expo install --check`

#### Job 2: `database`
- **Measured duration:** about 3 minutes
- **Steps:** checkout; install Supabase CLI 2.122.0; `supabase start -x realtime`, retried only on registry rate limits ("Data limit exceeded"); pnpm install; `pnpm db:test` (`supabase test db`, runs `supabase/tests/database/*.sql`); `pnpm db:lint` (`supabase db lint --local --fail-on error`)
- **Database:** the Supabase CLI starts its own Postgres container in Docker. The job does not use a separate PostgreSQL service. `supabase start` applies `supabase/migrations/`; the pgTAP tests check tables those migrations create. The seed file is not applied in CI.

#### Job 3: `types-drift`
- **Measured duration:** about 2.5 minutes
- **Steps:** same Supabase start; `pnpm db:types`; `git diff --quiet packages/api/src/database.types.ts`. On a difference it prints the diff and "Run 'pnpm db:types' and commit the changes", then fails.

#### Job 4: `secrets`
- **Measured duration:** under 10 seconds
- **Checks:**
  1. gitleaks (`gitleaks/gitleaks-action@v2`, full history) with default rules. Fails on a detected key or token.
  2. `git grep -F` for the HS256 JWT header `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9` in `apps/` and `packages/`.
  3. `git grep -F` for `SUPABASE_SERVICE_ROLE_KEY` in `apps/` and `packages/`.

  Checks 2 and 3 pass only when `git grep` exits 1 (no match). A match and any other error both fail. The JWT header in check 2 matches every HS256 JWT, including Supabase's legacy anon key, so Supabase keys must come from environment configuration, not from source.

### 2. Edge Functions (`.github/workflows/edge-functions.yml`)

**Triggers:** `pull_request` and `push` to `main`, with no path filter. A path-filtered workflow reports no status on PRs outside its paths, which leaves a required check pending.

**Steps:** `deno test --allow-all --no-config supabase/functions`; `deno fmt --check --no-config supabase/functions`; `deno lint --no-config supabase/functions`

### Removed: `required-status-checks.yml`

This placeholder read the conclusion of other workflow runs on `main`, and enforced nothing. Results of `workflow_run` runs do not attach to pull request checks, so it never blocked a merge. It was deleted in DEVOPS-02.

## Required status checks (manual GitHub setting)

**Not configured yet.** As of 2026-10-29, `main` has no branch protection: `gh api repos/Alexd2004/Sisig/branches/main/protection` returns 404 "Branch not protected". A repository admin must set this in **Settings > Branches > Branch protection rule** for `main`:

- Require status checks to pass before merging, and select `lint-and-test`, `database`, `types-drift`, `secrets` and `deno-tests`.
- Require a pull request with at least one approval, and block force pushes. These belong to DEVOPS-03.

The check names are the job IDs above. GitHub offers a check as selectable only after it has run at least once on the repository, which has happened for all five.

## Local Development

### Running CI checks locally

```bash
# 1. Lint, typecheck, unit tests
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm -F @sisig/mobile exec expo install --check

# 2. Database (Docker required; the first start pulls images)
pnpm db:start
pnpm db:reset
pnpm db:test
pnpm db:lint

# 3. Types drift (exit 1 means commit the regenerated file)
pnpm db:types
git diff --exit-code packages/api/src/database.types.ts

# 4. Edge Functions
deno test --allow-all --no-config supabase/functions
deno fmt --check --no-config supabase/functions
deno lint --no-config supabase/functions

# 5. Secrets (install gitleaks first: brew install gitleaks)
gitleaks detect
git grep -n -I -F -e "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" -e "SUPABASE_SERVICE_ROLE_KEY" -- apps packages
```

`git grep` searches tracked files only, so stage or commit new files before running the last command. No output from it means clean.

## Common Failures & Fixes

**Type drift detected**
```bash
pnpm db:start
pnpm db:types
git diff packages/api/src/database.types.ts
git add packages/api/src/database.types.ts
git commit -m "chore: regenerate types after schema change"
```

**Migration or pgTAP test fails**
Read the test output. Fix the migration by adding a new one (never edit an applied migration), then run `pnpm db:reset && pnpm db:test`.

**Schema lint fails**
`supabase db lint --fail-on error` reported an error. Fix the reported object, then run `pnpm db:reset && pnpm db:lint`.

**Lint error**
Fix the ESLint findings from `pnpm lint`. `pnpm format` applies Prettier formatting only.

**Secret detected**
A secret that reached a commit stays in git history. Rotate it first, then remove it from the code. Deleting it in a later commit is not enough.

**Service-role key or reference found**
Move the value to a server-side Edge Function or to environment configuration. `SUPABASE_SERVICE_ROLE_KEY` must not appear in `apps/` or `packages/`.

## Performance

### Caching

- **pnpm store:** `actions/setup-node` with `cache: pnpm`.
- **Turborepo:** `lint-and-test` restores `.turbo/cache` (the local cache directory Turborepo uses by default) with `actions/cache`. Each run saves its own entry, and the next run restores the most recent entry for the same OS. Turborepo replays cached output for packages whose inputs did not change.
- CI does not filter to affected packages. Every task runs on every PR, and unchanged tasks replay from cache.

### Measured durations

Merged run 40951232765 (push to `main`, 2026-10-29): `lint-and-test` about 1 minute, `types-drift` about 2.5 minutes, `database` about 3 minutes, `secrets` under 10 seconds. Jobs run in parallel, so the wall clock is about 3 minutes.

Median over the last 10 CI runs, including failed runs (`gh run list --workflow CI`): about 2.4 minutes. Target: under 10 minutes.

## Security

### gitleaks

Detects leaked secrets with its default rules (AWS keys, GitHub tokens, Slack webhooks and others). Fails the PR when it finds one. There is no `.gitleaksignore` yet.

### Service-role key and JWT check

See `secrets` check 2 and 3 above. Client code (`apps/`, `packages/`) must never contain the service-role key. `supabase/` is excluded on purpose, because Edge Functions run server-side and may use it.

## Monitoring & Alerts

GitHub Actions shows each job's duration, its failures and their logs.

### Re-running CI

If a job fails for a reason unrelated to the change (rare flakiness), open the PR, click "Details" on the failed check and choose "Re-run jobs". Investigate any repeated failure.

## Expansion (Future)

### DEVOPS-04: Build & Deploy
- `pnpm build` for the mobile and admin apps
- `expo eas build` cloud builds
- Deploy to Vercel (admin) and to the App Store and Play Store (mobile)

### Data Migration Testing
Once DATA-14 (audit logging) lands: test that audit trails are created and that historical data stays accessible.

## Known Gaps

- **Branch protection is not configured.** Until it is, none of these checks blocks a merge.
- **The pgTAP suite is structural.** `supabase/tests/database/01_init.sql` and `02_identity.sql` check that tables, columns, functions, constraints and policy names exist. They have no behavioural RLS assertions (no `set role`, `throws_ok` or `results_eq`). Behavioural RLS tests belong to DATA-08.
- **`supabase db lint --fail-on error` is new and was not run against a live database.** Docker was unavailable when this was written. The first CI run is the first real check, and it fails if the current schema has lint errors.
- **`pnpm format:check` is not run in CI.** It fails on `main` today: 10 files in `packages/claude` and 1 in `packages/ui`. CONTRIBUTING.md lists it as required.
- **The seed file is not applied in CI.** A seed that breaks (for example a NOT NULL column added without a default) is not caught.
- **No affected-only runs.** Turborepo runs every task on every PR.
- **CI runs Node 18,** which reached end of life in April 2025. Upgrading is a separate change.

## Troubleshooting

### CI flaky or timing out

1. The `database` and `types-drift` jobs retry `supabase start` only on Docker registry rate limits: three attempts, 90 seconds apart. Other start failures fail at once.
2. If `supabase start` is slow, run it locally to confirm the failure is real.
3. Job timeouts are set with `timeout-minutes` in `.github/workflows/`.

### gitleaks false positive

Some strings trigger gitleaks (for example test tokens). Add the exact value to `.gitleaksignore`:

```
# .gitleaksignore
# Test fake token from fixtures/test.ts
test-token-12345
```

### Types drift after merge

Do not push to `main`. Open a PR with the fix:

```bash
git switch -c fix/DEVOPS-02-sync-types
pnpm db:start
pnpm db:types
git add packages/api/src/database.types.ts
git commit -m "fix: sync types after merge"
git push -u origin HEAD
```

## Related Documentation

- `.github/workflows/ci.yml` — CI workflow definition
- `.github/workflows/edge-functions.yml` — Deno tests
- `supabase/README.md` — Database conventions
- `CONTRIBUTING.md` — Branching and commit conventions
- `README.md` — Quick start and CI checklist

---

**Owner:** DEV-C (DevOps engineer)
**Last updated:** 2026-10-29
