# Sisig Platform Architecture Guide

**Version 1.0** | **Date:** October 28, 2024 | **Status:** Foundation Phase

## Table of Contents

1. [Overview](#overview)
2. [DATA-01: Database Architecture](#data-01-database-architecture)
3. [PLAT-02: Navigation Architecture](#plat-02-navigation-architecture)
4. [THEME-01: Design System](#theme-01-design-system)
5. [Integration Points](#integration-points)
6. [Development Workflow](#development-workflow)
7. [Deployment Strategy](#deployment-strategy)

---

## Overview

The Sisig platform is a mobile-first ordering application built with:

- **Frontend:** React Native (Expo) with TypeScript strict mode
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Design:** Semantic tokens with light/dark theme support
- **Architecture:** Monorepo (pnpm) with Turborepo caching

### High-Level Stack

```
┌─────────────────────────────────────────┐
│      Mobile App (React Native/Expo)     │
│  (Tabs: Home, Order, Rewards, Code, More)
└──────────────┬──────────────────────────┘
               │ HTTP/REST
               ▼
┌─────────────────────────────────────────┐
│   API Layer (Supabase PostgREST)        │
│  (Auto-generated from PostgreSQL schema)
└──────────────┬──────────────────────────┘
               │
     ┌─────────┴──────────────┐
     ▼                        ▼
┌──────────────┐    ┌─────────────────┐
│  PostgreSQL  │    │ Edge Functions  │
│   Database   │    │  (Deno/TypeScript)
└──────────────┘    └─────────────────┘
```

---

## DATA-01: Database Architecture

### Design Philosophy

**Principle:** Versioned, forward-only migrations with strong data governance through Row-Level Security.

### Schema Design

#### Public Schema (API-Exposed)

These tables are automatically exposed via PostgREST and accessible to authenticated clients:

```sql
public.users                  -- User profiles + roles
public.products               -- Menu items
public.orders                 -- Customer orders
public.order_items            -- Order line items
public.loyalty_points         -- Points balance
public.loyalty_transactions   -- Points history
```

#### Private Schema (Internal Only)

Sealed off from PostgREST; used for scheduled jobs and internal state:

```sql
private.job_runs  -- Logging for pg_cron scheduled jobs
```

### Key Decisions

#### 1. **Row-Level Security (RLS) as First-Class Citizen**

**Decision:** Every table in the public schema has RLS enabled with explicit policies.

**Why:**
- Database-level access control is more secure than application-level checks
- Policies travel with data; no way to accidentally expose private data
- Scales to multi-tenant scenarios easily

**Example Policy:**
```sql
create policy "Users can view their own profile"
  on public.users
  for select
  using (auth.uid() = id);
```

**Trade-off:** Policies must be written carefully; a missing policy = no access.

#### 2. **Auth-Managed Users + Custom Profiles**

**Decision:** Link `auth.users` (managed by Supabase) with `public.users` (custom data).

**Why:**
- `auth.users` is immutable; we can't modify its schema
- `public.users` holds roles, avatars, and custom metadata
- Auto-trigger creates `public.users` row on signup

**Implementation:**
```sql
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

**Trade-off:** Two tables to join, but cleaner separation of concerns.

#### 3. **Price Stored in Cents**

**Decision:** All currency values are integers (e.g., 1999 = $19.99).

**Why:**
- No floating-point precision errors
- Easier to perform math on prices
- Standard in payment processing

**Implementation:**
```sql
create table public.products (
  price integer not null comment 'Price in cents'
);
```

#### 4. **Job Logging via pg_cron**

**Decision:** All scheduled jobs write start/end/count/error to `private.job_runs`.

**Why:**
- Single source of truth for job execution history
- Easy to monitor job health (last run, error rate)
- Separate table isolates job logs from business data

**Usage Pattern:**
```sql
-- Schedule a job
select cron.schedule(
  'process_loyalty_daily',
  '0 2 * * *',  -- 2 AM daily
  'select process_loyalty_transactions();'
);

-- Function logs itself
create or replace function process_loyalty_transactions()
returns void as $$
begin
  insert into private.job_runs (job_name, status)
  values ('process_loyalty_daily', 'running');
  
  -- Do work...
  
  update private.job_runs
  set status = 'success', ended_at = now(), rows_processed = X
  where job_name = 'process_loyalty_daily';
exception when others then
  update private.job_runs
  set status = 'error', error_message = SQLERRM
  where job_name = 'process_loyalty_daily';
end;
$$ language plpgsql security definer set search_path = '';
```

#### 5. **SECURITY DEFINER Functions Require Explicit search_path**

**Decision:** All `security definer` functions include `set search_path = ''`.

**Why:**
- Prevents schema injection attacks
- Function always sees the schema it intends, not attackers'
- Forces explicit qualification of all references

**Example:**
```sql
-- ✅ Safe
create function handle_new_user() returns trigger as $$
begin
  insert into public.users (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer set search_path = '';

-- ❌ Unsafe (don't do this)
create function handle_new_user() returns trigger as $$
begin
  insert into users (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;
```

### Migration Strategy

#### Forward-Only Migrations

- Never modify an applied migration
- If you find a bug, write a new migration to fix it
- This ensures consistency across all environments

#### One Concern Per Migration

Each file handles a single logical change:

- `20261028000000_init_schemas.sql` — schemas and extensions
- `20261028000001_init_users.sql` — user tables and RLS
- `20261028000002_init_products.sql` — products and RLS
- `20261028000003_init_orders_and_rewards.sql` — orders and loyalty

#### Handling Timestamp Conflicts

If two devs create migrations with the same timestamp:

```bash
# Rebase onto latest main
git rebase origin/main

# Regenerate migration timestamps
pnpm db:reset

# Commit with new timestamps
git add supabase/migrations/
git commit -m "fix: regenerate migration timestamps after rebase"
```

### TypeScript Types

**Decision:** Generate TypeScript types from the database schema.

**Implementation:**
```bash
pnpm db:types  # Outputs to packages/api/src/database.types.ts
```

**Why:**
- Single source of truth (database schema)
- Type-safe queries across frontend and backend
- CI fails if schema changes aren't reflected in types

**Usage:**
```typescript
import type { Database } from '@sisig/api';

type User = Database['public']['Tables']['users']['Row'];
type Order = Database['public']['Tables']['orders']['Insert'];

async function getUser(id: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .select()
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as User;
}
```

### Testing Strategy

**Tool:** pgTAP (TAP tests for PostgreSQL)

**Location:** `supabase/tests/database/`

**Example Test:**
```sql
begin;
select plan(3);

select has_table('public', 'users', 'users table exists');
select has_column('public', 'users', 'email', 'email column exists');
select policies_are(
  'public', 'users',
  array['Users can view their own profile', ...],
  'users table has correct policies'
);

select * from finish();
rollback;
```

**Run Tests:**
```bash
pnpm db:test
```

---

## PLAT-02: Navigation Architecture

### Design Philosophy

**Principle:** Bottom-tab navigation with nested stack per tab, supporting both authenticated and guest flows.

### Navigation Structure

```
Root Layout (_layout.tsx)
├── Session Restoration Gate
├── (tabs) Group
│   ├── Home Stack (home.tsx)
│   ├── Order Stack (order.tsx)
│   ├── Rewards Stack (rewards.tsx)
│   ├── Code Stack (code.tsx)
│   └── More Stack (more.tsx)
└── (auth) Group (for login/signup)
    ├── Welcome
    ├── Login
    ├── Sign Up
    └── Verify Email
```

### Key Decisions

#### 1. **Expo Router File-Based Routing**

**Decision:** Use Expo Router's file-based routing, not React Navigation directly.

**Why:**
- Deep linking works automatically
- Type-safe route names via auto-inference
- File system is the source of truth for routes
- Easier to refactor (move file = move route)

**File → Route Mapping:**
- `app/(tabs)/home.tsx` → `/home` (authenticated)
- `app/(auth)/login.tsx` → `/login` (guest)
- `app/ai-chat.tsx` → `/ai-chat` (root)

#### 2. **Session Restoration Gating**

**Decision:** Block navigation until auth session is restored from SecureStore.

**Why:**
- Avoids flash of wrong UI on cold start
- Splash screen stays visible until session is known
- Prevents race conditions (user sees login then tabs)

**Implementation:**
```typescript
// Root layout
const [isSessionRestored, setIsSessionRestored] = useState(false);

useEffect(() => {
  const restoreSession = async () => {
    try {
      const session = await supabase.auth.getSession();
      // TODO: Restore from SecureStore for native persistence
    } finally {
      setIsSessionRestored(true);
      await SplashScreen.hideAsync();
    }
  };
  restoreSession();
}, []);

if (!isSessionRestored) return <Stack />; // Splash stays visible
return <Stack screenOptions={{ headerShown: false }} />;
```

#### 3. **Bottom Tab Navigation with 5 Tabs**

**Decision:** Fixed 5-tab bottom navigation (Home, Order, Rewards, Code, More).

**Why:**
- Quick access to key features
- Tap active tab = pop to root (standard iOS/Android UX)
- Each tab can have its own stack

**Tabs:**
- **Home** — Featured items, promos, quick links
- **Order** — Browse menu and place orders
- **Rewards** — View points and redeem rewards
- **Code** — Show QR code / customer ID at counter
- **More** — Settings, order history, about, sign out

#### 4. **Tab Stack Isolation**

**Decision:** Each tab has its own navigation stack; doesn't share state with other tabs.

**Why:**
- Tapping active tab pops to root (expected behavior)
- Back button doesn't leak between tabs
- Cleaner state management per tab

**Implementation:**
```typescript
<Tabs>
  <Tabs.Screen name="home" options={...} />
  <Tabs.Screen name="order" options={...} />
  {/* Each is its own stack; changes here don't affect other tabs */}
</Tabs>
```

#### 5. **Session State Determines Visible Stack**

**Decision:** Root layout gates between (tabs) and (auth) based on `auth.session()`.

**Why:**
- Single source of truth (session state)
- Users can't reach protected tabs without auth
- Clean separation of authenticated and guest experiences

**Pseudo-Code:**
```typescript
return session ? <Stack name="(tabs)" /> : <Stack name="(auth)" />;
```

#### 6. **Accessibility First**

**Decision:** Every tab has `tabBarAccessibilityLabel` and screens use semantic color names.

**Why:**
- VoiceOver and TalkBack users can distinguish tabs
- Dark mode contrast is automatic via semantic colors
- WCAG AA compliance built in

**Example:**
```typescript
<Tabs.Screen
  name="rewards"
  options={{
    tabBarAccessibilityLabel: 'Rewards tab',
    tabBarIcon: ({ color }) => <TabBarIcon name="star" color={color} />,
  }}
/>
```

### Screen Descriptions

#### Home (home.tsx)
- Featured items
- Daily specials
- Quick links to other tabs
- Loyalty points summary

#### Order (order.tsx)
- Menu items (fetch from `public.products`)
- Add to cart
- Checkout flow (POST to `public.orders`)

#### Rewards (rewards.tsx)
- Loyalty points balance
- Available redemptions
- Points history (fetch from `public.loyalty_transactions`)
- How it works explainer

#### Code (code.tsx)
- QR code generation (or placeholder)
- Customer ID display
- Tap to show/hide
- Requires sign-in

#### More (more.tsx)
- Order history
- My profile
- Restaurant locations
- Help & support
- Settings
- Sign out

---

## THEME-01: Design System

### Design Philosophy

**Principle:** Semantic tokens define appearance; components reference tokens, not raw colors.

### Token Hierarchy

```
Tokens (root)
├── Primitive Colors (primaryLight, successDark, etc.)
├── Semantic Names (primary, success, warning, danger)
└── Theme Variants (light, dark)
    └── Maps semantic names → primitive colors
```

### Semantic Token Strategy

Instead of hard-coding colors, use semantic names:

```typescript
// ❌ Bad: Hard-coded colors
<Text style={{ color: '#007AFF' }}>Buy Now</Text>

// ✅ Good: Semantic token
<Text style={{ color: '$primary' }}>Buy Now</Text>
```

**Benefits:**
- Swap entire brand by changing token mapping (no component code changes)
- Theme switching (light/dark) is automatic
- Consistent across app

### Color Tokens

#### Primitive Colors

These are actual hex values:

```typescript
const tokens = {
  color: {
    primaryLight: '#007AFF',    // iOS blue
    primaryDark: '#0051D5',     // Darker blue for dark mode
    successLight: '#34C759',    // iOS green
    white: '#FFFFFF',
    gray900: '#111827',
  }
};
```

#### Semantic Names

These map to primitives via the theme:

```typescript
const light = {
  primary: tokens.color.primaryLight,
  primaryForeground: tokens.color.white,
  success: tokens.color.successLight,
  background: tokens.color.white,
  foreground: tokens.color.gray900,
};

const dark = {
  primary: tokens.color.primaryDark,
  primaryForeground: tokens.color.white,
  success: tokens.color.successDark,
  background: tokens.color.gray900,
  foreground: tokens.color.white,
};
```

### Tamagui Configuration

**File:** `packages/ui/tamagui.config.ts`

**Structure:**
```typescript
const config = createTamagui({
  tokens,           // Primitive values
  themes: {
    light,          // Semantic mapping for light mode
    dark,           // Semantic mapping for dark mode
  },
  shorthands,       // CSS shortcuts (p={}, m={}, etc.)
  fonts,            // Font families
  settings: {
    allowedStyleValues: 'somewhat-strict',
    fastGeneration: true,
  },
});
```

### Dynamic Type Support

**Decision:** Respect OS Dynamic Type setting (font scaling) up to 1.5x max.

**Why:**
- Accessibility requirement (WCAG)
- Users with vision impairments set larger system fonts
- 1.5x cap prevents layouts from breaking

**Implementation:**
```typescript
const maxFontSizeMultiplier = 1.5;

<Text
  style={{
    maxFontSizeMultiplier, // Capped scaling
    fontSize: 16,
  }}
>
  This text scales with OS setting, up to 1.5x
</Text>
```

### Light/Dark Theme Switching

**Decision:** Follow system `useColorScheme()` automatically; no in-app override in v1.

**Why:**
- Simple to implement (just read OS preference)
- Consistent with platform conventions
- Users expect app to follow system setting

**Implementation:**
```typescript
const colorScheme = useColorScheme();
// Tamagui automatically switches colors based on colorScheme
// No component code changes needed
```

### Placeholder Assets

**Decision:** Use Google Fonts (Inter) and generic brand colors until client provides assets.

**Pending Assets:**
- [ ] Licensed brand fonts (replace `createInterFont()`)
- [ ] Final brand color palette (replace `primaryLight`, `successLight`, etc.)
- [ ] Logo and app icon

**Status:** Listed in README under "Pending Client Assets"

### Type Safety

**Declaration:**
```typescript
declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
```

**Usage:**
```typescript
import { styled } from 'tamagui';

const StyledButton = styled(Pressable, {
  backgroundColor: '$primary',
  color: '$primaryForeground',
});
```

### Contrast Testing

**Decision:** Automated contrast checker runs in CI.

**Tool:** Custom or axe-core check
**Threshold:** WCAG AA (4.5:1 for text, 3:1 for large text)

**CI Script (pseudocode):**
```bash
# Run contrast tests against light and dark themes
pnpm test:contrast

# Fail if any pair is below AA
if [ $? -ne 0 ]; then
  echo "WCAG AA contrast failure detected"
  exit 1
fi
```

### Rebrand in 10 Minutes

**How to Swap Brand:**

1. Update `packages/ui/tamagui.config.ts`:
```typescript
const tokens = createTokens({
  color: {
    primaryLight: '#YOUR_BRAND_COLOR',
    primaryDark: '#YOUR_BRAND_DARK',
    // ... other colors
  },
});
```

2. Replace font files in `packages/ui/fonts/`

3. Rebuild:
```bash
pnpm -F @sisig/ui build
pnpm build
```

4. All screens automatically use new colors (no component changes needed)

---

## Integration Points

### Database → Frontend Type Flow

```
PostgreSQL Schema
       ↓
  pnpm db:types
       ↓
packages/api/src/database.types.ts
       ↓
import type { Database } from '@sisig/api'
       ↓
  Fully typed queries
```

### Mobile App → API Data Flow

```
React Native Component
       ↓
  useAI / useImageAnalysis hooks
       ↓
  @sisig/claude package
       ↓
  Anthropic API / Supabase PostgREST
       ↓
  PostgreSQL
```

### Theme Configuration → All Components

```
tamagui.config.ts (single source of truth)
       ↓
  All @sisig/ui components
       ↓
  All app screens
       ↓
  Consistent theme across app
```

---

## Development Workflow

### Getting Started

```bash
# Clone and install
git clone https://github.com/Alexd2004/Sisig.git
cd Sisig
pnpm install

# Start database
pnpm db:start      # Local Supabase (Docker)
pnpm db:reset      # Migrations + seed

# Start app
pnpm dev           # Expo dev server

# In another terminal: Generate types
pnpm db:types
```

### Creating a New Feature

1. **Define database schema** (if needed)
   ```bash
   pnpm db:new add_feature_tables
   # Edit supabase/migrations/TIMESTAMP_add_feature_tables.sql
   pnpm db:reset
   pnpm db:types
   ```

2. **Build the mobile screen**
   ```bash
   touch apps/mobile/app/(tabs)/new-feature.tsx
   # Add screen to (tabs)/_layout.tsx
   ```

3. **Add RLS policies** (if exposing data)
   ```sql
   create policy "Users can view their feature data"
     on public.feature_table
     for select
     using (auth.uid() = user_id);
   ```

4. **Test**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm db:test
   ```

5. **Commit**
   ```bash
   git add -A
   git commit -m "feat: add new feature"
   git push
   ```

### Testing Strategy

| Layer | Tool | Command |
|-------|------|---------|
| Database | pgTAP | `pnpm db:test` |
| Mobile App | Jest + React Native Testing Library | `pnpm test` |
| API Types | TypeScript | `pnpm typecheck` |
| Linting | ESLint | `pnpm lint` |
| Formatting | Prettier | `pnpm format` |

---

## Deployment Strategy

### Mobile App Deployment

1. **Local Dev Client**
   ```bash
   expo build:ios --dev-client
   expo build:android --dev-client
   ```

2. **Production Builds**
   - Expo App Store build (via Expo Cloud)
   - Android Play Store (via Expo Cloud)

### Database Deployment

1. **Migrations auto-run on `db:reset`**
2. **Production: Manual review and approval** (via GitHub PR)
3. **Supabase hosts PostgreSQL** (no server to manage)

### Environment Management

| Env | Database | API | Notes |
|-----|----------|-----|-------|
| Local | `supabase start` | Localhost | For development |
| Staging | Supabase Cloud | Cloud API | For testing |
| Production | Supabase Cloud | Cloud API | Live users |

---

## Summary of Key Decisions

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| RLS for all public tables | Security at DB level | Policies are complex to write |
| Price in cents | No floating-point errors | Must convert to/from dollars in UI |
| Semantic tokens | Brand swaps without code changes | Extra layer of abstraction |
| Expo Router file-based | Deep linking automatic, easy refactor | File system as API |
| Bottom 5-tab nav | Quick access, mobile standard | Limited space for buttons |
| pgTAP tests | SQL tests are simple, database-focused | Different from app tests |
| Job logging to private.job_runs | Single history source | Adds table and triggers |

---

## Next Steps

### Immediate (Next Sprint)

- [ ] **AUTH-01:** Supabase Auth setup (OAuth + email/password)
- [ ] **DEVOPS-02:** CI/CD pipeline (GitHub Actions, type drift checks)
- [ ] **Finish PLAT-02:** Modal routes, item detail screen, redeem flow

### Medium Term (2-3 Sprints)

- [ ] **PLAT-03:** Session state management (Redux/Zustand)
- [ ] **Order flow:** Cart, checkout, payment (Stripe)
- [ ] **Admin panel:** Framework choice (THEME-01 applied to web)

### Design Phase Complete

- [ ] Client brand assets arrive
- [ ] Swap `tamagui.config.ts` colors and fonts
- [ ] Rebuild and deploy (no component changes)

---

## Contact & Questions

For architecture questions or design decisions, refer to:
- `supabase/README.md` — Database conventions
- `apps/mobile/README.md` — Mobile app setup
- `CONTRIBUTING.md` — Git workflow
- `CLAUDE_SKILLS.md` — AI integrations

---

**Document maintained by:** Dev Team  
**Last updated:** October 28, 2024  
**Next review:** November 30, 2024
