# Sisig Platform

> Mobile-first platform with React Native (Expo), monorepo architecture, and TypeScript strict mode.

## Quick Start (< 30 minutes)

### Prerequisites

- Node.js 18+ and npm
- `pnpm` package manager: `npm install -g pnpm@9`
- Xcode (macOS) or Android Studio (for device builds)
- Expo account (optional, but recommended for cloud builds)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/Alexd2004/Sisig.git
cd Sisig

# 2. Install dependencies (all workspaces)
pnpm install

# 3. Start development server
pnpm dev

# 4. Install the development client on a simulator or device (see "Development Client")
# 5. Open the development client and connect it to the server started by pnpm dev
```

Expo Go cannot run this app, so do not use it.

## Project Structure

```
Sisig/
├── apps/
│   ├── mobile/          # React Native Expo app
│   │   ├── app/         # Expo Router pages and layout
│   │   ├── src/         # Components and utilities
│   │   └── package.json
│   └── admin/           # Admin panel (framework TBD in ADM-01)
├── packages/
│   ├── ui/              # Shared UI components
│   ├── api/             # API utilities and types
│   └── config/          # Shared ESLint, Prettier, TypeScript config
├── supabase/            # Supabase configuration (DATA-01)
├── package.json         # Monorepo root and pnpm workspaces
├── turbo.json           # Turborepo task cache config
└── CONTRIBUTING.md      # Branching, release, and commit guidelines
```

## Monorepo Setup

### pnpm Workspaces + Turborepo

All packages are linked via `pnpm` workspaces. Build caching and task orchestration via Turborepo.

**Key commands:**

```bash
pnpm install            # Install all dependencies
pnpm dev                # Run dev task in all workspaces (parallel)
pnpm build              # Not configured yet: the mobile build step fails (see "Release Builds")
pnpm lint               # Lint all packages (parallel)
pnpm typecheck          # TypeScript strict mode (zero errors)
pnpm test               # Jest tests across workspaces
pnpm format             # Prettier auto-format
pnpm format:check       # Check formatting without changes
```

### Metro Monorepo Resolution

Expo uses Metro bundler with built-in monorepo support. Verify setup:

```bash
pnpm -F @sisig/mobile run doctor   # Runs expo-doctor to check config
```

Plain `pnpm doctor` does not run expo-doctor. It runs pnpm's own checker, because `doctor` is a built-in pnpm command, so use `run doctor` as shown.

## TypeScript Strict Mode

All packages enforce:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

Run `pnpm typecheck` to verify zero errors.

## Development Client

### Why Not Expo Go?

We use `expo-dev-client` because the app requires native modules:

- **Camera**: React Native Camera
- **Secure Storage**: `expo-secure-store` (uses device keychain)
- **Error Tracking**: Sentry
- **Animations**: Lottie
- **POS/Payment SDK**: Future native module

Expo Go does not support custom native code, so development builds are required from day one.

### Building the Development Client Locally

Install the development client with the local Expo CLI. This needs Xcode for iOS or Android Studio for Android.

```bash
pnpm -F @sisig/mobile exec expo run:ios        # iOS simulator
pnpm -F @sisig/mobile exec expo run:android    # Android device or emulator
```

Then run `pnpm dev` and connect the installed client to the server.

### Release Builds (Not Configured)

The local Expo CLI rejects `expo build`, and the repo has no `eas.json`. Release builds need EAS (`eas build`). EAS setup is deferred to DEVOPS-04.

## Linting & Formatting

All workspaces share ESLint and Prettier configs via `@sisig/config`.

```bash
pnpm lint               # ESLint all packages
pnpm format             # Auto-format with Prettier
pnpm format:check       # Check formatting (not run in CI yet; see docs/DEVOPS-02-CI.md)
```

## Testing

### Jest + React Native Testing Library

Sample tests are included in:

- `packages/ui/src/Button.test.tsx` — Component test
- `packages/ui/src/theme/contrast.test.ts` — WCAG AA contrast test for every semantic colour pair
- `packages/api/src/utils.test.ts` — Unit test
- `apps/mobile/app/index.test.tsx` — Screen test

Run tests:

```bash
pnpm test               # All tests
pnpm -F @sisig/mobile test -- --watch   # Watch mode (one package at a time)
```

`pnpm test --watch` does not work at the root: pnpm rejects `--watch`. Pass it to Jest through a single package, as shown.

## Theme and Brand Tokens (THEME-01)

- **Brand values** live in one file: `packages/ui/src/theme/brand.ts`. Components never use raw hex colours. They use semantic names through `@sisig/ui` (`useAppColors`, `useThemedStyles`, `Text`, `TextInput`). `apps/mobile/src/no-raw-colors.test.ts` and `packages/ui/src/no-raw-colors.test.ts` fail if a component contains a hex literal.
- **Light and dark** follow the OS setting (`userInterfaceStyle: "automatic"` in `apps/mobile/app.json`). There is no in-app override in v1.
- **Font scaling** is capped at `FONT_SCALE_CAP` (1.5x) in `Text` and `TextInput`.
- **Contrast:** `packages/ui/src/theme/contrast.test.ts` checks WCAG AA (4.5:1) for every foreground/background pair in both themes. It runs under `pnpm test` in CI.
- **Rebrand:** edit `brand.ts`, then run `pnpm test`. The contrast test catches any pair that falls below AA. See `docs/ARCHITECTURE.md` ("Rebrand in 10 Minutes").

### Pending client assets

The values below are placeholders until the client supplies final assets. Do not treat them as brand decisions.

| Asset | Current placeholder | Where to change |
|---|---|---|
| Brand colour palette (light and dark) | Placeholder palette tuned to pass WCAG AA. It is not the brand palette. | `packages/ui/src/theme/brand.ts` (`palette`, `lightTheme`, `darkTheme`) |
| Brand fonts (body and heading) | Inter from Google Fonts via `@expo-google-fonts/inter` (Regular 400 and SemiBold 600). Package metadata lists `MIT AND OFL-1.1`. Confirm the licence before any release. | `brandFonts` in `brand.ts`; the `expo-font` plugin entry in `apps/mobile/app.json`; the imports in `apps/mobile/app/_layout.tsx` |
| Licensed font files and final brand fonts | Not yet received from the client | Client input. Replace the placeholder fonts when they arrive. |

## Acceptance Criteria (PLAT-01)

- ✅ `pnpm install && pnpm dev` starts Expo dev server from clean clone
- ✅ New dev completes onboarding < 30 minutes
- ✅ TypeScript strict enabled in all packages; `pnpm typecheck` passes with zero errors
- ✅ `pnpm lint` and `pnpm format:check` run across workspaces
- ✅ Development client builds and runs on iOS simulator and Android device
- ✅ Imports from `@sisig/ui` and `@sisig/api` work in mobile app
- ✅ Jest + RNTL sample tests in mobile app and API packages
- ✅ `expo-doctor` reports no issues

## Branching & Releases

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- Trunk-based development with short-lived feature branches
- Conventional Commits and Jira key integration
- Release and hotfix procedures
- Branch protection rules on `main`

## Team & Code Review

**CODEOWNERS:**

- `apps/mobile/**` + `packages/ui/**` → @Alexd2004
- `apps/admin/**` + `.github/**` → @Alexd2004
- `supabase/**` → @Alexd2004

All PRs require ≥1 CODEOWNER approval and all required checks to pass.

## Troubleshooting

### `expo-doctor` reports errors

Update Expo or check [Expo documentation](https://docs.expo.dev).

```bash
pnpm -F @sisig/mobile upgrade expo
pnpm -F @sisig/mobile run doctor
```

### TypeScript errors after updating packages

Clear cache and reinstall:

```bash
rm -rf node_modules
pnpm install
pnpm typecheck
```

### Metro bundler issues

Restart dev server:

```bash
# Stop current dev server (Ctrl+C)
# Restart with:
pnpm dev
```

## Continuous Integration (DEVOPS-02)

Every PR to `main` runs the checks defined in `.github/workflows/`. Job details and the manual GitHub settings are in [docs/DEVOPS-02-CI.md](docs/DEVOPS-02-CI.md).

### Running CI Checks Locally

Run these before pushing. The database steps need Docker.

```bash
# lint-and-test
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm -F @sisig/mobile exec expo install --check

# database (Docker required)
pnpm db:start        # Start local Supabase; applies supabase/migrations
pnpm db:reset        # Rebuild from scratch: all migrations, then the seed
pnpm db:test         # pgTAP tests in supabase/tests/database
pnpm db:lint         # Schema lint; exits non-zero on errors

# types-drift: regenerate types, then fail if they changed
pnpm db:types
git diff --exit-code packages/api/src/database.types.ts

# deno-tests
deno test --allow-all --no-config supabase/functions
deno fmt --check --no-config supabase/functions
deno lint --no-config supabase/functions

# secrets (install gitleaks first: brew install gitleaks)
gitleaks detect
git grep -n -I -F -e "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" -e "SUPABASE_SERVICE_ROLE_KEY" -- apps packages
# No output means clean (git grep exits 1 when nothing matches)
```

### Required Checks on Every PR

| Check (job) | What it runs |
|---|---|
| `lint-and-test` | ESLint, `tsc --noEmit`, Jest, `expo install --check` |
| `database` | Local Supabase start, pgTAP tests, `supabase db lint --schema public,private --fail-on error` |
| `types-drift` | `pnpm db:types`; fails if `database.types.ts` changes |
| `secrets` | gitleaks, service-role key grep over `apps/` and `packages/` |
| `deno-tests` | Edge Function tests, `deno fmt --check`, `deno lint` |

Every check runs on every PR. They block a merge only after branch protection on `main` requires them. That is a manual GitHub setting, described in [docs/DEVOPS-02-CI.md](docs/DEVOPS-02-CI.md#required-status-checks-manual-github-setting).

**Target duration:** median under 10 minutes. Recent runs took about 3 minutes wall clock.

### Debugging CI Failures

**Type drift failure:**
```bash
pnpm db:start        # The type generator reads the local database
pnpm db:types
git add packages/api/src/database.types.ts
git commit -m "chore: regenerate types after schema change"
```

**Migration or RLS test failure:**
Check the test output; fix the migration and re-push. Use `pnpm db:reset && pnpm db:test` to reproduce locally.

**Lint failure:**
Fix the ESLint findings that `pnpm lint` reports. `pnpm format` applies Prettier formatting only.

## Further Reading

- [Expo Router Documentation](https://expo.dev/routing)
- [Turborepo Task Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [React Native Testing Library](https://testing-library.com/docs/react-native-testing-library/intro)
- [GitHub Actions Workflows](.github/workflows) — CI/CD pipeline definitions


---

**Questions?** Check CONTRIBUTING.md or the READMEs that exist: `apps/mobile/README.md`, `supabase/README.md` and `packages/claude/README.md`.
