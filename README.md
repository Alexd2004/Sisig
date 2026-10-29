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

# 4. Open Expo in your terminal and scan QR code
# or use Expo Go on your device
```

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
pnpm build              # Build all packages
pnpm lint               # Lint all packages (parallel)
pnpm typecheck          # TypeScript strict mode (zero errors)
pnpm test               # Jest tests across workspaces
pnpm format             # Prettier auto-format
pnpm format:check       # Check formatting without changes
```

### Metro Monorepo Resolution

Expo uses Metro bundler with built-in monorepo support. Verify setup:

```bash
pnpm doctor             # Runs expo-doctor to check config
```

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

### Building for iOS Simulator

```bash
expo build:ios --dev-client --simulator
```

### Building for Android Device

```bash
expo build:android --dev-client
```

## Linting & Formatting

All workspaces share ESLint and Prettier configs via `@sisig/config`.

```bash
pnpm lint               # ESLint all packages
pnpm format             # Auto-format with Prettier
pnpm format:check       # Check formatting (CI-friendly)
```

A **deliberately bad import** will fail lint:

```ts
// This will error during linting
import * as _ from 'crypto';
const unused = _;
```

## Testing

### Jest + React Native Testing Library

Sample tests are included in:

- `packages/ui/src/Button.test.tsx` — Component test
- `packages/api/src/utils.test.ts` — Unit test
- `apps/mobile/app/index.test.tsx` — Screen test

Run tests:

```bash
pnpm test               # All tests
pnpm test --watch      # Watch mode
```

## Acceptance Criteria (PLAT-01)

- ✅ `pnpm install && pnpm dev` starts Expo dev server from clean clone
- ✅ New dev completes onboarding < 30 minutes
- ✅ TypeScript strict enabled in all packages; `pnpm typecheck` passes with zero errors
- ✅ `pnpm lint` and `pnpm format:check` run across workspaces; bad import fails lint
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
pnpm upgrade expo
pnpm doctor
```

### TypeScript errors after updating packages

Clear cache and reinstall:

```bash
rm -rf node_modules .pnpm-lock.yaml pnpm-lock.yaml
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

Every PR runs automated checks to ensure code quality and database integrity.

### Running CI Checks Locally

Before pushing, run all CI checks locally (they must pass before merge):

```bash
# Lint, typecheck, and unit tests (all affected by changes)
pnpm lint
pnpm typecheck
pnpm test

# Check Expo dependencies
pnpm -F @sisig/mobile exec expo install --check

# Database: migrations, RLS tests, schema linting
pnpm db:start        # Start local Supabase
pnpm db:reset        # Apply migrations from scratch
pnpm db:test         # Run pgTAP tests
pnpm db:lint         # Check schema
pnpm db:types        # Generate types and verify no drift

# Edge Functions: Deno tests
deno test --allow-all supabase/functions
```

### Required Checks on Every PR

**GitHub Actions runs:**
1. ✅ **Lint** — ESLint across all workspaces
2. ✅ **Type check** — TypeScript strict mode (zero errors)
3. ✅ **Unit tests** — Jest with coverage
4. ✅ **Expo health** — `expo install --check` for dependency issues
5. ✅ **Database migrations** — Apply from scratch on local Supabase
6. ✅ **RLS tests** — pgTAP tests verify Row-Level Security
7. ✅ **Schema lint** — Check for missing PKs, RLS violations, naming issues
8. ✅ **Types drift** — Generated types must match committed `database.types.ts`
9. ✅ **Deno tests** — Edge Functions pass all tests
10. ✅ **Secret scan** — gitleaks detects keys/tokens
11. ✅ **Service-role check** — Grep for leaked JWT patterns in source

**Target duration:** < 10 minutes with Turborepo caching

### Debugging CI Failures

**Type drift failure:**
```bash
pnpm db:types
git add packages/api/src/database.types.ts
git commit -m "chore: regenerate types after schema change"
```

**Migration or RLS test failure:**
Check the test output; fix the migration and re-push. Use `pnpm db:reset` to test locally.

**Linting failure:**
```bash
pnpm format  # Auto-fix formatting
pnpm lint    # Check for remaining errors
```

## Further Reading

- [Expo Router Documentation](https://expo.dev/routing)
- [Turborepo Task Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [React Native Testing Library](https://testing-library.com/docs/react-native-testing-library/intro)
- [GitHub Actions Workflows](.github/workflows) — CI/CD pipeline definitions

## Next Steps

1. **ADM-01**: Finalize admin panel framework (Web? React? Next.js?)
2. **DATA-01**: Supabase database setup and RLS policies
3. **AUTH-01**: User authentication flow (OAuth, magic link, etc.)
4. **DEVOPS-04**: GitHub Actions CI/CD pipeline (lint, test, build, deploy)

---

**Questions?** Check CONTRIBUTING.md or app-specific READMEs.