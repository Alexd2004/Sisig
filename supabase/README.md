# Supabase database (DATA-01)

PostgreSQL with versioned migrations, row-level security, generated TypeScript
types and Edge Functions. This file is the quick reference for the `supabase/`
folder.

- How auth, roles, RLS, the loyalty schema and the hosted dev project work:
  [docs/SUPABASE.md](../docs/SUPABASE.md).
- Rules for migrations, schemas, policies, functions and tests:
  [CONVENTIONS.md](./CONVENTIONS.md).

## Prerequisites

- Docker running. The local Supabase stack runs in containers. Without Docker
  you cannot run the local stack; CI's `database` job runs the tests instead.
- Node 18+ and pnpm 9. The Supabase CLI is a root devDependency (2.122.0, locked
  in `pnpm-lock.yaml`), so the `db:*` scripts use it after `pnpm install`. Run
  other CLI commands as `pnpm exec supabase ...`. CI installs the same version.
- Deno 2 for the Edge Function tests (CI uses Deno 2.x).

## Clean clone: create the local database

```bash
pnpm install
pnpm db:start   # starts the local stack; the first run pulls Docker images
pnpm db:reset   # rebuilds the database: every migration, then supabase/seed.sql
```

On a new database, `pnpm db:start` already applies every migration and then
`seed.sql`. `pnpm db:reset` does not start the stack, so run `pnpm db:start`
first.

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
| `pnpm db:lint` | Lint the `public` and `private` schemas (`supabase db lint --local`); fails on errors |
| `pnpm db:new <name>` | Create a new migration file |

### Local stack URLs

`config.toml` sets no ports, so the CLI defaults apply.

| Service | URL |
| --- | --- |
| API (Auth, REST, Edge Functions) | `http://127.0.0.1:54321` |
| Database | `127.0.0.1:54322` |
| Studio | `http://127.0.0.1:54323` |
| Mailpit (auth emails) | `http://127.0.0.1:54324` |

`pnpm exec supabase status` prints the URLs and the local publishable key.

### Hosted dev project

The only hosted project is "Sisig Eh" (ref `dczjqhqpxbkikidtbntf`). Link it once
per machine, then use `--linked` commands. Step-by-step instructions, including
the seed and access token hook caveats, are in
[docs/SUPABASE.md](../docs/SUPABASE.md#working-with-the-hosted-dev-project).

| Command | What it does |
| --- | --- |
| `pnpm exec supabase login` | Sign the CLI in (once per machine) |
| `pnpm exec supabase link --project-ref dczjqhqpxbkikidtbntf` | Link this repo to hosted dev (once per machine) |
| `pnpm exec supabase db push --linked --dry-run` | List the migrations hosted dev has not applied |
| `pnpm exec supabase db push --linked` | Apply them (only from an up-to-date `main`) |
| `pnpm exec supabase db query --linked "<sql>"` | Run SQL on hosted dev; prints JSON rows |
| `pnpm exec supabase migration list --linked` | Compare local migration files with hosted dev's history |

## Layout

```
supabase/
├── config.toml       Local stack settings (exposed API schemas, auth, token hook)
├── migrations/       Forward-only SQL migrations, applied in timestamp order
├── seed.sql          Local seed data, applied after the migrations
├── tests/database/   pgTAP tests
├── functions/        Edge Functions; _shared/ holds common helpers
└── .temp/            CLI link state (gitignored)
```

Extensions (`uuid-ossp`, `pg_cron`, `pgtap`, `pgcrypto`, `pg_net`) are enabled in
`migrations/20261028000000_init_schemas.sql`, not in `config.toml`. Auth redirect
URLs are not templated in `config.toml` yet; AUTH-01 owns that.

## Schema (from the migrations on main)

- **`public` tables**: `profiles`, `user_roles` (roles `customer`, `staff`,
  `admin`, `owner`), `products`, `orders`, `order_items`, `locations` (one store
  for now), `loyalty_settings` (versioned), `points_ledger` (append-only),
  `point_balances`, `rewards`, `reward_redemptions` and `app_config` (remote
  config, PLAT-06: public read, admin-only write).
- **`public` functions**: `is_staff()`, `is_admin()`, `is_owner()`,
  `set_user_role(p_user_id, p_role)`, `current_loyalty_settings(p_at)`, and the
  sign-up triggers' `handle_new_user()` and `sync_profile_email()`.
- **`private`**: `job_runs` (scheduled job log; no job exists yet) and the
  functions `custom_access_token_hook` and `enforce_points_ledger_append_only`
  (the ledger's append-only trigger).
- **Enums**: `app_role`, `order_status`, `pos_type`, `loyalty_rounding_mode`,
  `loyalty_earn_base`, `loyalty_expiry_policy`, `points_source_type`,
  `redemption_status`, `redemption_channel`.

The ER diagram, the access table and the loyalty model are in
[docs/SUPABASE.md](../docs/SUPABASE.md#schema-reference).

## Migrations

- Create one with `pnpm db:new <snake_case_name>`. Never edit one that has been
  applied to a shared environment (hosted dev counts). Rules are in
  CONVENTIONS.md.
- Rebuild the local database with `pnpm db:reset`. It applies every migration,
  then `seed.sql`.
- Check history with `pnpm exec supabase migration list --local` (the stack must
  be running) or `--linked` (hosted dev).
- After the PR is squash merged, push the migration to hosted dev. The full
  lifecycle and the rules for destructive migrations are in
  [docs/SUPABASE.md](../docs/SUPABASE.md#migration-lifecycle).

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
Do not edit or format it by hand.

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
`supabase start`, which applies the migrations and the seed from scratch. What
each test file covers is listed in
[docs/SUPABASE.md](../docs/SUPABASE.md#testing).

## Edge Functions

Each function is a folder with two files:

- `index.ts` calls `Deno.serve(...)` and nothing else.
- `handler.ts` exports `handler(req, deps)`, which holds the logic.

Shared code is in `_shared/`: `cors.ts` (CORS and JSON responses), `errors.ts`
(`AppError` and the error envelope) and `auth.ts` (bearer token, verification
with Supabase Auth, role check).

The sample function is `whoami`. `GET` returns the caller's `id`, `email` and
`appRole`. A missing or invalid token gets a 401 in the error envelope. No
function is deployed to hosted dev, and no workflow deploys them.

Run it locally:

```bash
pnpm db:start
pnpm exec supabase functions serve
curl -H "Authorization: Bearer <access_token>" http://127.0.0.1:54321/functions/v1/whoami
```

`authConfigFromEnv()` reads `SUPABASE_URL` and `SUPABASE_ANON_KEY`, which Supabase
sets for functions. Never put the service-role key in a function that a client
can reach, and never in the mobile or admin apps. CI's `secrets` job runs
gitleaks over the whole repo, then greps `apps/` and `packages/` for one fixed
string, the HS256 JWT header (the legacy key format), and for the name
`SUPABASE_SERVICE_ROLE_KEY`. The grep has no rule for `sb_secret_` keys, so do
not rely on it to catch one.

## Troubleshooting

- **Docker is not running.** Start Docker Desktop, then run `pnpm db:start`.
- **`db:reset` says the stack is not running.** Run `pnpm db:start` first.
- **`pnpm db:types` exits 1 and the file is unchanged.** The stack is not
  running. Start it and run the command again.
- **Types look stale.** Run `pnpm db:types` and review
  `git diff packages/api/src/database.types.ts`.
- **A function returns 500 "Server misconfigured".** `SUPABASE_URL` or
  `SUPABASE_ANON_KEY` is missing from the function's environment.

Errors from RLS, the ledger and the hosted project are covered in
[docs/SUPABASE.md](../docs/SUPABASE.md#troubleshooting).

## Known issues (open)

1. **`db:reset` does not start the stack.** See Clean clone above.
2. **The access token hook must be enabled per hosted project.** `config.toml`
   enables it for the local stack only. On hosted dev it is a dashboard setting
   that has not been confirmed. Without it, no token carries `app_role`.
3. **Local Postgres is 15, hosted dev is 17.** `config.toml` sets
   `major_version = 15`.
4. **Timing not measured.** The 3-minute `db:reset` target has not been checked.

Fixed: the old known issue 1, "RLS recursion" (staff policies on `products` and
`orders` read `public.users`), which the header of
`20261106230039_staff_policies_use_role_helpers.sql` refers to. That migration
fixed it, and the numbering above no longer matches.

The full list is in [docs/SUPABASE.md](../docs/SUPABASE.md#known-issues).

## Resources

- [Supabase CLI reference](https://supabase.com/docs/reference/cli)
- [Row-Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [pgTAP](https://pgtap.org/)
- [pg_cron](https://github.com/citusdata/pg_cron)
- [Deno std](https://deno.land/std)
