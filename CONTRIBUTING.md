# Contributing to Sisig

## Branching Strategy

We follow **trunk-based development**: `main` is the only long-lived branch and is always releasable. Work lands through short-lived branches, each merged to `main` by pull request. The only other long-lived branches are `release/x.y` lines, and only when a hotfix is needed (see Release Strategy).

### Branch Naming

- Feature: `feature/JIRA-KEY-description`
- Bugfix: `fix/JIRA-KEY-description`
- Chore, config or docs: `chore/JIRA-KEY-description`
- Hotfix: `hotfix/JIRA-KEY-description`
- Release line (hotfix support only): `release/x.y`

Example: `feature/PLAT-01-scaffold-monorepo`

### Workflow

1. Create a short-lived branch off `main`
2. Make commits in [Conventional Commits](https://www.conventionalcommits.org/) format with the Jira key as the scope (see Commit Messages)
3. Open a PR into `main`. The PR title uses the same format as a commit, e.g. `feat(PLAT-01): add Expo Router setup`
4. Get one approval from another developer; CODEOWNERS (`.github/CODEOWNERS`) routes review requests by area
5. Squash merge to `main` (single commit per PR; the PR title becomes that commit, so the Jira key stays on `main`)
6. Delete the feature branch after merge

## Release Strategy

### Standard Release

Normal releases are tags on `main`. Do not create a release branch for them.

1. Make sure `main` contains everything for the release and all checks are green
2. Open a PR with the version bump and changelog update (`chore(JIRA-KEY): release x.y.z`); `main` is protected, so this goes through the normal PR flow
3. Tag the merge commit on `main` as `vx.y.z`
4. CI/CD deploys from the tag

### Hotfix

Use a `release/x.y` branch only to ship a hotfix to an already-released line.

1. If `release/x.y` does not exist yet, create it from the `vx.y.z` tag of the affected release
2. Create `hotfix/JIRA-KEY-description` off `release/x.y`
3. Open a PR into `release/x.y` with the fix; the same review and squash rules apply
4. After merge, tag the new patch version `vx.y.(z+1)` on `release/x.y` and deploy from the tag
5. Bring the fix to `main` with its own PR (cherry-pick the squashed commit); never push to `main` directly

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactor (no behavior change)
- `test`: Test additions/changes
- `docs`: Documentation
- `chore`: Build, dependency updates, config changes

**Scope is the Jira key** (e.g. `PLAT-01`, `DEVOPS-03`). Every commit and PR title must carry one so Jira can link the work. Area names (`mobile`, `admin`, `ui`, `api`, `supabase`) go in the body or PR description, not in place of the key.

**Examples:**

- `feat(PLAT-01): scaffold pnpm workspaces with Turborepo`
- `fix(DEVOPS-02): generate database types for the public schema only`
- `test(PLAT-01): add Button component tests`

## Pull Request Process

1. Ensure PR title is concise (< 70 chars), in Conventional Commits format with the Jira key
2. Fill out the PR template completely (Jira key, screenshots, migration/RLS impact, analytics, a11y, privacy inventory, REL-07 question)
3. Request review from CODEOWNER(s) for changed areas; one approval from another developer is required
4. Address feedback in new commits (don't force-push)
5. Squash merge once approved

## Code Quality

### Required Checks

All the following must pass before merge:

```bash
pnpm install
pnpm lint        # ESLint
pnpm format:check # Prettier
pnpm typecheck   # TypeScript strict mode
pnpm test        # Jest + React Native Testing Library
```

### Running Locally

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Lint and format
pnpm lint
pnpm format

# Type check
pnpm typecheck

# Test
pnpm test

# Expo diagnostics
pnpm doctor
```

## Mobile Development

### Development Client

We use `expo-dev-client` for development builds (not Expo Go) due to native modules:

- Camera
- Secure Store
- Sentry
- Lottie
- POS/payment SDK (future)

### Building Development Client

```bash
# iOS simulator
expo build:ios --dev-client --simulator

# Android device
expo build:android --dev-client
```

### Metro Monorepo Resolution

Expo's built-in monorepo support via Metro is configured. Verify with:

```bash
expo-doctor
```

## Data Layer

The shared data layer lives in `packages/api` (`@sisig/api`). The mobile wiring is in `apps/mobile/src/lib`.

### Configuration

Set these in a local `.env.local` (never commit it). Expo inlines `EXPO_PUBLIC_*` values into the bundle, so they must be public:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: anon key only. A service-role key must never reach the app; CI scans for it.

### Client, session and logout

- Create Supabase clients only with `createSupabaseClient` (`@sisig/api`). The app's single client is `apps/mobile/src/lib/supabase.ts`.
- Sessions are stored only through `nativeSessionStorage` (AES-256-GCM, key in SecureStore). Never write tokens to AsyncStorage directly.
- Token auto-refresh runs only while the app is active (`attachSessionLifecycle`).
- Logout calls `signOutAndPurge` (`apps/mobile/src/lib/logout.ts`). It clears the session, the encrypted entries and key, the query cache and the persisted cache. Any new per-user store must be added to that function.

### Query keys and hooks

- Add every query key to the `keys` factory in `packages/api/src/query-keys.ts`. Never inline key arrays. Invalidate by prefix, for example `keys.menu.all()`.
- Expose each query as `xxxQueryOptions(client)` plus a thin `useXxx` wrapper, as `useMenuCategories` does. Test the options with `createQueryClient().fetchQuery(...)` (see `packages/api/src/hooks/useMenu.test.ts`).
- Use `createQueryClient()` for the app's QueryClient. Queries retry only network and 5xx failures. RLS and 4xx failures fail immediately. Mutations never retry.

### Errors

- Throw `normalizeError(error)` from queries and mutations. It returns an `AppError` with a fixed, user-safe `message`. Show `error.message` to users and never a raw server message. `error.code` is stable and safe to branch on.

### Writes

- Points, redemptions and orders change only through RPCs or Edge Functions, never by direct table writes. `useCreateOrder` in `packages/api/src/mutations.ts` predates this rule and is pending migration. Do not copy its pattern.
- Optimistic updates use `optimisticUpdate`, which rolls back on error.

### Offline persistence

- Only query keys on the allowlist in `persistedQueryKeyPrefixes` (`packages/api/src/query-keys.ts`) are written to disk: the menu and the rewards catalogue. Points, profile, orders and auth are never persisted.
- Mutations are never persisted. `persistOptions` in `apps/mobile/src/lib/query-persistence.ts` is the options object for `PersistQueryClientProvider`.
- Add a key to the allowlist only if its data is not personal.

### Tests

```bash
pnpm --filter @sisig/api test
pnpm --filter @sisig/mobile test
```

## TypeScript Strict Mode

All packages enforce `strict: true`. No `any` types—use proper typing.

## Branch Protection

These are GitHub repository settings, not files in this repo. A repo admin must configure them under Settings > Branches for `main` (and for `release/*` lines once they exist):

- PR required for all changes
- ≥1 approval from another developer; `.github/CODEOWNERS` routes review requests by area
- All required checks from the CI workflows must pass (see `docs/DEVOPS-02-CI.md`)
- Squash merge only
- No direct pushes
- No force pushes

## Onboarding

New developers should:

1. Clone the repo
2. Run `pnpm install` (installs all workspace packages)
3. Run `pnpm dev` to start Expo dev server
4. Read this file and app-specific READMEs
5. **Target: complete onboarding in < 30 minutes**

## Questions?

See app-specific READMEs in `apps/mobile`, `apps/admin`, and package READMEs in `packages/`.
