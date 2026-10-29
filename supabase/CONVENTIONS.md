# Database conventions

These rules apply to everything under `supabase/`. Schema changes go through
versioned SQL migrations, and `packages/api/src/database.types.ts` must match
them. Setup and commands are in [README.md](./README.md).

## Migrations

- **Create them with the CLI.** Run `pnpm db:new <snake_case_name>`, which wraps
  `supabase migration new`. Never pick a timestamp by hand. Files go in
  `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`.
- **One concern per migration:** one table group, one function, or one policy
  set per file. Two existing files bundle more than one concern
  (`20261028000000_init_schemas.sql`, `20261028000003_init_orders_and_rewards.sql`).
  They predate this rule and are not split.
- **Forward-only.** Once a migration has been applied to any shared environment
  (staging, production, or another developer's database), never edit it. Fix
  the problem with a new migration.
- **Timestamp clashes.** If your migration has the same timestamp as one on
  `origin/main`, or sorts before it, rebase onto `origin/main`. Rename your file
  to a timestamp after the latest migration on main, keep its contents, then run
  `pnpm db:reset` and `pnpm db:types`.
- **Seed data must survive schema changes.** Seed inserts use
  `on conflict do nothing`. Adding a NOT NULL column to a table that has rows
  needs a default in the same migration, and the default is dropped once the
  rows are filled.

## Naming

- Tables are plural snake_case (`products`, `order_items`). Columns are
  snake_case. Timestamps are `created_at` and `updated_at`, typed
  `timestamp with time zone`.
- Money is an `integer` in cents (`price`, `total_amount`, `unit_price`).
- Indexes are `idx_<table>_<columns>`.
- Policies have a short descriptive name in double quotes, unique per table.
  pgTAP `policies_are` tests check the names.
- Functions are snake_case verbs (`set_user_role`). Predicates return boolean
  and are named `is_*` (`is_staff`).
- Enum types are snake_case (`app_role`) with lowercase labels.

## Schemas: public vs private

- **`public`** holds only what clients may reach through PostgREST or RPC. Every
  public table enables row-level security and has explicit policies. No policy
  means no access.
- **`private`** holds internal tables and functions: job logs
  (`private.job_runs`) and the access-token hook (`private.custom_access_token_hook`).
  It is not in `[api] schemas` in `supabase/config.toml`, and the
  `20261028000000_init_schemas.sql` migration revokes it from `public`.
- A role that must reach a private object gets an explicit grant in a
  migration. Do not widen `private` to `anon` or `authenticated`.

## Policies must not query their own table

A policy whose subquery reads the table it protects recurses, directly or
through another table's policy. Postgres fails the query with
`infinite recursion detected in policy for relation ...`. Move the check into
a helper instead:

```sql
create policy "Staff can view all orders"
  on public.orders for select
  using (public.is_staff());
```

`is_staff()` reads the `app_role` JWT claim. The claim exists only once the
access-token hook is registered, which is DATA-02 work.

## SECURITY DEFINER functions

- Every `security definer` function sets `search_path = ''` and
  schema-qualifies each object it touches (`public.user_roles`, `auth.uid()`).
  `pg_catalog` functions such as `now()` need no prefix.

  ```sql
  create or replace function public.handle_new_user()
  returns trigger as $$
  begin
    insert into public.profiles (id, email) values (new.id, new.email);
    return new;
  end;
  $$ language plpgsql security definer set search_path = '';
  ```

- Check the rule against the catalog. Every row must show `search_path=""`:

  ```sql
  select n.nspname, p.proname, p.proconfig
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where p.prosecdef and n.nspname in ('public', 'private');
  ```

## Scheduled jobs and job_runs logging

- Every pg_cron job writes to `private.job_runs`. It inserts a `running` row at
  start, then sets `ended_at` and `status` to `success` (with `rows_processed`)
  or `error` (with `error_message`).
- A job that catches an error must record it and return normally. If it
  re-raises, the transaction rolls back and the error row is lost.
- The start and finish helpers are not in a migration yet. The first scheduled
  job that needs them adds them, and later jobs reuse them.

## Edge Functions

- Layout: `supabase/functions/<name>/index.ts` only calls `Deno.serve(...)`.
  The logic lives in `handler.ts` as `handler(req, deps)`, so tests can import it
  without starting a server. Example: `supabase/functions/whoami/`.
- Shared code is in `supabase/functions/_shared/`:
  - `cors.ts`: CORS headers, preflight response, JSON responses.
  - `errors.ts`: `AppError` and `errorEnvelope`.
  - `auth.ts`: bearer token, `authenticate` (verifies with Supabase Auth), `requireRole`.
- Errors use one envelope, `{ "error": { "code": "...", "message": "..." } }`.
  Anything that is not an `AppError` becomes a 500 `internal_error` with a
  generic message.
- Tokens are verified with Supabase Auth before any claim is read. The `app_role`
  claim can be stale for up to one token lifetime. Sensitive writes must
  re-check `public.user_roles` in SQL.
- Tests run from the repo root with `--no-config`, so the TypeScript config of
  the app packages is not picked up:
  `deno test --allow-all --no-config supabase/functions`, then
  `deno fmt --check --no-config` and `deno lint --no-config`.

## Database tests

- pgTAP files live in `supabase/tests/database/` and are named `NN_<topic>.sql`
  so they run in order. Each file starts with `begin; select plan(n);` and ends
  with `select * from finish(); rollback;`.
- `plan(n)` must equal the number of assertions. A mismatch fails the run.
- Run them with `pnpm db:test`. CI runs the same command.
