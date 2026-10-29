# Supabase database (DATA-01)

PostgreSQL with versioned migrations, row-level security, generated TypeScript
types and Edge Functions. Rules for migrations, schemas, policies and Edge
Functions are in [CONVENTIONS.md](./CONVENTIONS.md).

## Prerequisites

- Docker running. The local Supabase stack runs in containers.
- Node 18+ and pnpm 9. The Supabase CLI is a root devDependency, so the `db:*`
  scripts use it after `pnpm install`.
- Deno 2 for the Edge Function tests (CI uses Deno 2.x).

## Clean clone: create the local database

```bash
pnpm install
pnpm db:start   # starts the local stack; the first run pulls Docker images
pnpm db:reset   # rebuilds the database: every migration, then supabase/seed.sql
```

`pnpm db:reset` does not start the stack, so run `pnpm db:start` first.

**Timing target:** `pnpm db:reset` under 3 minutes with images already pulled.
This has not been measured yet. To measure it, run `time pnpm db:reset`.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm db:start` | Start the local stack (`supabase start`) |
| `pnpm db:stop` | Stop the local stack |
| `pnpm db:reset` | Rebuild the local database from migrations and seed (`supabase db reset`) |
| `pnpm db:types` | Regenerate `packages/api/src/database.types.ts` from the local `public` schema |
| `pnpm db:test` | Run the pgTAP tests (`supabase test db`); exits non-zero on failure |
| `pnpm db:lint` | Lint the schema (`supabase db lint`) |
| `pnpm db:new <name>` | Create a new migration file |

## Layout

```
supabase/
├── config.toml       Local stack settings (exposed API schemas, auth, realtime)
├── migrations/       Forward-only SQL migrations, applied in timestamp order
├── seed.sql          Local seed data, applied by db:reset
├── tests/database/   pgTAP tests
└── functions/        Edge Functions; _shared/ holds common helpers
```

Extensions (`uuid-ossp`, `pg_cron`, `pgtap`, `pgcrypto`, `pg_net`) are enabled in
`migrations/20261028000000_init_schemas.sql`, not in `config.toml`. Auth redirect
URLs are not templated in `config.toml` yet; AUTH-01 owns that.

## Schema (from the migrations on main)

- **`public`**: `profiles`, `user_roles` (roles `customer`, `staff`, `admin`,
  `owner`), `products`, `orders`, `order_items`, `loyalty_points`,
  `loyalty_transactions`, and the legacy `users` table (see Known issues).
- **`private`**: `job_runs` (scheduled job log) and the function
  `custom_access_token_hook`.
- **Enums**: `app_role`, `user_role`, `order_status`.

## Migrations

- Create one with `pnpm db:new <snake_case_name>`. Never edit one that has been
  applied to a shared environment. Rules are in CONVENTIONS.md.
- Rebuild the local database with `pnpm db:reset`. It applies every migration,
  then `seed.sql`.
- Check history with `pnpm exec supabase migration list` (the stack must be
  running).

### Timestamp clashes

Two branches created migrations with the same or interleaved timestamps. Rebase
onto `origin/main`, rename your migration to a timestamp after the latest one on
main, then run `pnpm db:reset` and `pnpm db:types`.

### NOT NULL column with seed rows

Seeding fails if a NOT NULL column is added without a default. Add the column
with a default, fill the existing rows, and drop the default in the same
migration:

```sql
alter table public.products add column sku text not null default 'UNKNOWN';
-- Fill real values for the existing rows here, for example:
-- update public.products set sku = '<value>' where sku = 'UNKNOWN';
alter table public.products alter column sku drop default;
```

## Database types

```bash
pnpm db:types   # writes packages/api/src/database.types.ts (needs the stack running)
```

CI's `types-drift` job regenerates the file and fails if it differs from the
committed copy. Commit the regenerated file in the same PR as the schema change.

Import the types from the API package:

```typescript
import type { Database } from "@sisig/api";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
```

## Testing

```bash
pnpm db:test                                          # pgTAP suites in tests/database
pnpm db:lint                                          # schema lint
deno test --allow-all --no-config supabase/functions  # Edge Function tests
deno fmt --check --no-config supabase/functions
deno lint --no-config supabase/functions
```

`pnpm db:test` is the same command CI's `database` job runs after
`supabase start`, which applies the migrations from scratch.

## Edge Functions

Each function is a folder with two files:

- `index.ts` calls `Deno.serve(...)` and nothing else.
- `handler.ts` exports `handler(req, deps)`, which holds the logic.

Shared code is in `_shared/`: `cors.ts` (CORS and JSON responses), `errors.ts`
(`AppError` and the error envelope) and `auth.ts` (bearer token, verification
with Supabase Auth, role check).

The sample function is `whoami`. `GET` returns the caller's `id`, `email` and
`appRole`. A missing or invalid token gets a 401 in the error envelope.

Run it locally:

```bash
pnpm db:start
pnpm exec supabase functions serve
curl -H "Authorization: Bearer <access_token>" http://127.0.0.1:54321/functions/v1/whoami
```

`authConfigFromEnv()` reads `SUPABASE_URL` and `SUPABASE_ANON_KEY`, which Supabase
sets for functions. Never put the service-role key in a function that a client
can reach, and never in the mobile or admin apps. CI greps for it.

## Troubleshooting

- **Docker is not running.** Start Docker Desktop, then run `pnpm db:start`.
- **`db:reset` says the stack is not running.** Run `pnpm db:start` first.
- **Types look stale.** Run `pnpm db:types` and review
  `git diff packages/api/src/database.types.ts`.
- **A function returns 500 "Server misconfigured".** `SUPABASE_URL` or
  `SUPABASE_ANON_KEY` is missing from the function's environment.

## Known issues (open)

1. **RLS recursion.** The staff policies on `products` and `orders` read
  `public.users`, and `profiles` reads `public.user_roles`. Those tables' own
  staff policies read themselves. Any authenticated read of `products`, `orders`,
  `profiles`, `user_roles` or `users` fails with "infinite recursion detected in
  policy". Checked on Postgres 14 with stub auth objects. The fix is a forward
  migration that uses the `is_staff()` and `is_admin()` helpers.
2. **`db:reset` does not start the stack.** See Clean clone above.
3. **Two role stores.** `20261028000004` replaced `handle_new_user`, so new
   accounts no longer get a `public.users` row. Policies that read
   `public.users.role` never see roles granted in `user_roles`. Owned by DATA-02.
4. **Access-token hook is not wired up.** `config.toml` does not register
   `custom_access_token_hook`, and no migration grants `supabase_auth_admin` access
   to it. Owned by DATA-02.
5. **Timing not measured.** The 3-minute `db:reset` target has not been checked.

## Resources

- [Supabase CLI reference](https://supabase.com/docs/reference/cli)
- [Row-Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [pgTAP](https://pgtap.org/)
- [pg_cron](https://github.com/citusdata/pg_cron)
- [Deno std](https://deno.land/std)
