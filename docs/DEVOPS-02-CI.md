# DEVOPS-02: GitHub Actions CI Pipeline

**Plan ID:** DEVOPS-02 | **Epic:** DEVOPS | **Owner:** DEV-C | **Status:** Complete

## Overview

Every pull request runs automated checks to enforce code quality, database integrity, and security. All checks must pass before merging to `main`.

## Architecture

```
┌─────────────────────────────────────────┐
│  Push to feature branch                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  GitHub Actions CI Triggered            │
├─────────────────────────────────────────┤
│ ✓ Lint (ESLint, Prettier)               │
│ ✓ TypeScript (strict mode)              │
│ ✓ Jest unit tests                       │
│ ✓ Expo dependencies                     │
│ ✓ Supabase migrations                   │
│ ✓ pgTAP RLS tests                       │
│ ✓ Schema linting                        │
│ ✓ Type drift check                      │
│ ✓ Deno Edge Function tests              │
│ ✓ gitleaks secret scan                  │
│ ✓ Service-role key grep                 │
└──────────────┬──────────────────────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
   ✅ PASS         ❌ FAIL
      │                 │
      ▼                 ▼
  Merge allowed    PR blocked, fix & retry
```

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:** On every PR and push to `main`

**Jobs:**

#### Job 1: Lint & Test
- **Duration:** ~5 minutes (with Turborepo caching)
- **Runs on:** ubuntu-latest
- **Steps:**
  1. Checkout code
  2. Setup pnpm + Node 18
  3. Install dependencies (cached)
  4. Run `pnpm lint` — ESLint all workspaces
  5. Run `pnpm typecheck` — TypeScript strict mode
  6. Run `pnpm test` — Jest with coverage
  7. Run `expo install --check` — Verify dependency integrity

**Why separate from database:** Can run immediately without Supabase startup.

#### Job 2: Database
- **Duration:** ~4 minutes
- **Runs on:** ubuntu-latest with PostgreSQL service
- **Steps:**
  1. Checkout code
  2. Install Supabase CLI
  3. Start local Supabase stack
  4. Apply all migrations from scratch
  5. Run `pnpm db:test` — pgTAP RLS tests
  6. Run `pnpm db:lint` — Schema validation

**Why separate:** Long startup time; runs in parallel with lint/test job.

**Migrations from scratch:** Ensures migrations are forward-only and idempotent.

#### Job 3: Types Drift
- **Duration:** ~4 minutes
- **Runs on:** ubuntu-latest with PostgreSQL service
- **Steps:**
  1. Checkout code
  2. Start local Supabase
  3. Apply migrations
  4. Setup pnpm + Node
  5. Install dependencies
  6. Run `pnpm db:types` — Generate types
  7. Check `git diff` on `packages/api/src/database.types.ts`
  8. **Fail if drift detected** with readable error

**Critical check:** Schema changes without type updates = merge blocked.

#### Job 4: Secrets
- **Duration:** ~1 minute
- **Runs on:** ubuntu-latest
- **Checks:**
  1. gitleaks scan — Detects exposed keys, tokens, credentials
  2. Service-role key grep — Prevents JWT patterns in source code
  3. `SUPABASE_SERVICE_ROLE_KEY` references — Blocks if found in client code

**Why critical:** Leaked secrets are a security breach.

### 2. Edge Functions Workflow (`.github/workflows/edge-functions.yml`)

**Triggers:** On changes to `supabase/functions/**`

**Steps:**
1. Setup Deno
2. Run `deno test --allow-all supabase/functions`
3. Format check (`deno fmt --check`)
4. Lint (`deno lint`)

**Why separate:** Only runs when Edge Functions change; skipped otherwise.

## Required Status Checks

On GitHub, branch protection is configured to require:

1. ✅ `lint-and-test` job passes
2. ✅ `database` job passes
3. ✅ `types-drift` job passes
4. ✅ `secrets` job passes
5. ✅ `deno-tests` job passes (if Edge Functions changed)

**No merge without all passing.**

## Local Development

### Before Pushing, Run CI Locally

```bash
# 1. Lint and typecheck (fast, ~30s)
pnpm lint
pnpm typecheck

# 2. Unit tests (fast, ~2m)
pnpm test

# 3. Expo check
pnpm -F @sisig/mobile exec expo install --check

# 4. Database tests (requires Supabase, ~5m)
pnpm db:start
pnpm db:reset
pnpm db:test
pnpm db:lint

# 5. Type drift check
pnpm db:types
# If git status shows changes, commit them:
git add packages/api/src/database.types.ts
git commit -m "chore: regenerate types"

# 6. Edge Functions (if you modified them)
deno test --allow-all supabase/functions

# 7. Secret scan (optional, slow)
npm install -g gitleaks
gitleaks detect
```

### Common Failures & Fixes

**❌ Type drift detected**
```bash
pnpm db:start
pnpm db:types
git diff packages/api/src/database.types.ts
git add packages/api/src/database.types.ts
git commit -m "chore: regenerate types after schema change"
```

**❌ Migration breaks pgTAP test**
```bash
# Check the test output; fix migration
pnpm db:reset
pnpm db:test
# Review error, update migration, commit, push
```

**❌ Linting error**
```bash
pnpm format  # Auto-fix formatting
pnpm lint    # Re-check
# Commit fixes
```

**❌ Secret detected**
Remove the secret from code:
```bash
# Edit file to remove leaked key
git add .
git commit -m "chore: remove leaked secret"
```

## Performance Optimization

### Turborepo Caching

Only affected tasks run based on file changes:

```bash
# Changed package/api?
# → Only package/api tasks run, skips others

# Changed supabase migrations?
# → Only database job runs, skips lint/test job
```

**Cache keys:** Based on `pnpm-lock.yaml`, source files, and input options.

### Parallel Execution

Jobs run in parallel:
- `lint-and-test` (5m)
- `database` (4m)
- `types-drift` (4m)
- `secrets` (1m)

**Total:** ~5 minutes (parallel > sequential)

### Target: < 10 Minutes

On first run (no cache): ~10 minutes  
On subsequent runs (cached): ~3-5 minutes

## Security

### gitleaks

Detects leaked secrets using pattern matching:
- AWS keys, GitHub tokens, Slack webhooks, etc.
- **Action:** Fails the PR; forces developer to rebase/remove secret

### Service-Role Key Check

Grep for known JWT patterns and `SUPABASE_SERVICE_ROLE_KEY`:

```bash
# Fails if found in client code
grep -r "SUPABASE_SERVICE_ROLE_KEY" apps/mobile/src
grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" apps/mobile/src
```

**Why:** Service role key must never be in app bundle—only on backend.

## Monitoring & Alerts

### CI Dashboard

GitHub Actions UI shows:
- Duration of each job
- Which jobs failed and why
- Logs for debugging

### Re-running CI

If CI fails due to flakiness (rare):
1. Go to PR
2. Click "Details" on failed check
3. Click "Re-run jobs"

## Expansion (Future)

### DEVOPS-04: Build & Deploy

Will add:
- `pnpm build` — Build mobile and admin apps
- `expo eas build` — Expo cloud builds
- Deploy to Vercel (admin)
- Deploy to App Store / Play Store (mobile)

### Data Migration Testing

Once DATA-14 (audit logging) lands:
- Test audit trails are created correctly
- Verify historical data is accessible

## Troubleshooting

### CI Flaky or Timing Out

1. Check if Supabase startup is slow (Docker issue)
2. Increase timeout: Edit `.github/workflows/ci.yml`
3. Run locally to confirm it's not a real issue

### gitleaks False Positive

Some strings trigger gitleaks (e.g., test tokens). Add to `.gitleaksignore`:

```
# .gitleaksignore
# Test fake token from fixtures/test.ts
test-token-12345
```

### Types Drift After Merge

If types were accidentally committed out of sync:
```bash
git checkout main
pnpm db:types
git add packages/api/src/database.types.ts
git commit -m "fix: sync types after merge"
git push
```

## Related Documentation

- `.github/workflows/ci.yml` — CI workflow definition
- `.github/workflows/edge-functions.yml` — Deno tests
- `supabase/README.md` — Database conventions
- `CONTRIBUTING.md` — Local development guide
- `README.md` — Quick start and CI checklist

---

**Owner:** DEV-C (DevOps engineer)  
**Reviewed by:** DEV-A, DEV-B  
**Last updated:** October 28, 2024
