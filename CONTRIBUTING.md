# Contributing to Sisig

## Branching Strategy

We follow **trunk-based development** with short-lived feature branches.

### Branch Naming

- Feature: `feature/JIRA-KEY-description`
- Bugfix: `fix/JIRA-KEY-description`
- Release: `release/x.y.z`
- Hotfix: `hotfix/JIRA-KEY-description`

Example: `feature/PLAT-01-scaffold-monorepo`

### Workflow

1. Create a short-lived branch off `main`
2. Make commits with [Conventional Commits](https://www.conventionalcommits.org/) format
3. Include Jira key in commit messages: `feat(PLAT-01): add Expo Router setup`
4. Open a PR with at least one CODEOWNER approval required
5. Squash merge to `main` (single commit per PR)
6. Delete feature branch after merge

## Release Strategy

### Standard Release

1. Create `release/x.y.z` branch off `main`
2. Version bumps and changelog updates
3. Tag with `vx.y.z` on `main` after merge
4. CI/CD deploys from tag

### Hotfix

1. Create `hotfix/JIRA-KEY-description` off `release/x.y.z`
2. Fix critical issue
3. Merge back to `release/x.y.z` and `main` (cherry-pick or merge)
4. Tag new patch version

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

**Scopes:** `PLAT-01`, `DEVOPS-03`, `mobile`, `admin`, `ui`, `api`, `supabase`

**Examples:**
- `feat(PLAT-01): scaffold pnpm workspaces with Turborepo`
- `fix(mobile): resolve TypeScript strict mode errors`
- `test(ui): add Button component tests`

## Pull Request Process

1. Ensure PR title is concise (< 70 chars)
2. Fill out the PR template completely
3. Request review from CODEOWNER(s) for changed areas
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

## TypeScript Strict Mode

All packages enforce `strict: true`. No `any` types—use proper typing.

## Branch Protection

`main` is protected:

- PR required for all changes
- ≥1 CODEOWNER approval required
- All required checks must pass
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
