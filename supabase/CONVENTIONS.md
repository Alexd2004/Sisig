# Database conventions

These rules apply to everything under `supabase/`. Schema changes go through
versioned SQL migrations, and `packages/api/src/database.types.ts` must match
them. Setup and commands are in [README.md](./README.md). How the pieces fit
together (auth, roles, RLS, the loyalty model, the hosted dev project) is in
[docs/SUPABASE.md](../docs/SUPABASE.md).

## Migrations

- **Create them with the CLI.** Run `pnpm db:new <snake_case_name>`, which wraps
  `supabase migration new`. Never pick a timestamp by hand. Files go in
  `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`.
- **One concern per migration:** one table group, one function, or one policy
  set per file. Several early files bundle more than one concern
  (`20261028000000_init_schemas.sql`, `20261028000003_init_orders_and_rewards.sql`,
  `20261028000004_init_identity.sql`, `20261028000006_identity_hardening.sql`).
  They are not split.
- **Start with a header comment.** Name the Jira key, the one concern, why the
  change is needed and any data impact, and end with "Forward-only: no existing
  migration is edited." The DATA-04 and DATA-18 migrations are examples.
- **Forward-only.** Once a migration has been applied to any shared environment
  (the hosted dev project, later staging and production, or another developer's
  database), never edit it. Fix the problem with a new migration.
- **Timestamp clashes.** If your migration has the same timestamp as one on
  `origin/main`, or sorts before it, rebase onto `origin/main`. Rename your file
  to a timestamp after the latest migration on main, keep its contents, then run
  `pnpm db:reset` and `pnpm db:types`.
- **Checks that existing rows might fail are added `NOT VALID`.** Postgres then
  checks new and updated rows only. A later migration runs `VALIDATE CONSTRAINT`
  once the data is clean. `20261104180526_money_points_checks.sql` adds its checks
  this way; the migration that validates them does not exist yet.
- **Fail loudly.** When a migration depends on the data being in a certain state,
  it fails with an error instead of deleting or rewriting rows to make it fit
  (`20261106230040_retire_legacy_users.sql` fails with 23503 if an order has no
  profile).
- **Destructive changes are audited first.** Before a migration that can lose or
  reject data reaches a shared environment, follow the audit and backup steps in
  [docs/SUPABASE.md](../docs/SUPABASE.md#destructive-migrations).
- **Seed data is for the local stack.** Seed inserts end with
  `on conflict do nothing`. The clause only guards rows that have a fixed id or a
  unique key (the placeholder store). The products insert has neither, so running
  it twice duplicates the rows. Data that every environment needs goes in a migration, not in `seed.sql`
  (the loyalty settings baseline is in `20261106230042_create_loyalty_settings.sql`).
  Adding a NOT NULL column to a table that has rows needs a default in the same
  migration, and the default is dropped once the rows are filled.

## Naming

- Tables are plural snake_case (`products`, `order_items`). Columns are
  snake_case. Timestamps are `created_at` and `updated_at`, typed
  `timestamp with time zone`.
- Money is an `integer` in cents (`price`, `total_amount`, `unit_price`,
  `min_spend_cents`).
- Indexes are `idx_<table>_<columns>`. A partial index adds its condition
  (`idx_reward_redemptions_code_issued`).
- New constraints are named explicitly, because pgTAP tests match the name:
  checks are `<table>_<column>_<rule>` or `<table>_<rule>`
  (`products_price_non_negative`, `points_ledger_in_store_requires_location`),
  and unique constraints are `<table>_<columns>_key`
  (`points_ledger_source_type_idempotency_key_key`).
- Policies have a short descriptive name in double quotes, unique per table.
  pgTAP `policies_are` tests check the names.
- Functions are snake_case verbs (`set_user_role`,
  `enforce_points_ledger_append_only`). Predicates return boolean and are named
  `is_*` (`is_staff`). Parameters start with `p_` and PL/pgSQL variables with
  `v_` (`p_user_id`, `v_caller_role`).
- Enum types are snake_case (`app_role`) with lowercase labels.

## Schemas: public vs private

- **`public`** holds only what clients may reach through PostgREST or RPC. Every
  public table enables row-level security and has explicit policies. No policy
  means no access.
- **`private`** holds internal tables and functions: the job log
  (`private.job_runs`), the access-token hook (`private.custom_access_token_hook`)
  and the ledger's append-only trigger function
  (`private.enforce_points_ledger_append_only`). It is not in `[api] schemas` in
  `supabase/config.toml`, and the `20261028000000_init_schemas.sql` migration
  revokes it from `public`.
- A role that must reach a private object gets an explicit grant in a
  migration (`supabase_auth_admin` has `USAGE` on `private` and `EXECUTE` on the
  hook). Do not widen `private` to `anon` or `authenticated`.

## Grants

- Supabase gives `anon`, `authenticated` and `service_role` full privileges on
  every new `public` table. A migration that creates a table therefore states its
  grants: `revoke all ... from anon, authenticated, service_role`, then
  `grant select` to the roles that read it. Every table added by DATA-04 and
  DATA-18 does this.
- A new table that is written by RPCs gets no INSERT, UPDATE or DELETE grant for
  any API role, `service_role` included, and no write policy. Writes go through a
  `SECURITY DEFINER` function: the LOY RPCs for the six DATA-04 and DATA-18 tables
  (planned, LOY-01/03/04).
- Exception: the older tables predate this rule. `user_roles` revokes writes from
  `anon` and `authenticated` only (clients write it through `set_user_role`), so
  `service_role` keeps its default write privileges there. `profiles`, `products`,
  `orders` and `order_items` keep the default grants for every API role and rely
  on policies. No migration changes this yet.
- To let clients change only some columns, revoke UPDATE and grant it per column
  (`profiles`: `first_name`, `last_name`, `phone_e164`, `birthday_month`,
  `birthday_day`, `province`, `locale`).
- A function that clients may call revokes `EXECUTE` from `public` (and `anon`
  where needed) and grants it to the roles that call it (`set_user_role`,
  `current_loyalty_settings`).

## Policies

### Policies must not query their own table

A policy whose subquery reads the table it protects recurses, directly or
through another table's policy. Postgres fails the query with
`infinite recursion detected in policy for relation ...`. Move the check into
a helper instead:

```sql
create policy "Staff can view all orders"
  on public.orders for select
  using ((select public.is_staff()));
```

### Wrap helper calls in a scalar subquery

New policies write `(select public.is_staff())` and `(select auth.uid())`, not
the bare call, so Postgres evaluates the function once per statement instead of
once per row. The policies on `profiles` and `user_roles` and the own-row
policies on `orders` and `order_items` predate this rule.

### Name the roles a policy applies to

New policies say which roles they cover: `to authenticated`, or
`to anon, authenticated` for data anyone may read. A policy without `to`
applies to every role.

### Staff checks read the JWT

`is_staff()`, `is_admin()` and `is_owner()` read the `app_role` JWT claim that
the access-token hook adds. `config.toml` registers the hook for the local
stack. Each hosted project must enable it in the dashboard (see
[docs/SUPABASE.md](../docs/SUPABASE.md#the-access-token-hook-adds-app_role)).
The claim can be stale for up to one token lifetime, so privileged writes
re-check `public.user_roles` in SQL (next section).

## SECURITY DEFINER functions

- Every function, security definer or invoker, sets `search_path = ''` and
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
  select n.nspname, p.proname, p.prosecdef, p.proconfig
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private');
  ```

- A `security definer` function runs as its owner, so grants and RLS do not
  apply inside it. It checks the caller itself. For a privileged action it reads
  the caller's role from `public.user_roles`, not from the JWT, so a demoted user
  is refused at once (`set_user_role` does this).
- Raise standard SQLSTATEs: `42501` (insufficient_privilege) for a permission
  denial, `P0002` (no_data_found) when the target row does not exist, `23001`
  for an append-only violation. Never invent codes: `'PERM'` is not a valid
  SQLSTATE and fails with 42704.

## Append-only tables

- An append-only table has a `BEFORE UPDATE OR DELETE` trigger. Its function
  lives in `private` and raises `23001` with
  `<table> is append-only: <operation> is not allowed`. Example:
  `points_ledger_append_only` runs `private.enforce_points_ledger_append_only()`.
- API roles get at most SELECT (`anon` gets nothing on `points_ledger`).
  `revoke all` also removes TRUNCATE, which skips
  row triggers.
- Corrections are new rows (a `reversal` row in `points_ledger`), never updates.
- Any exception is as narrow as possible, and each of its guards has its own
  pgTAP test. The only one today is the AUTH-05 anonymisation path in
  `points_ledger`.

## Member data and deletion

- A foreign key to `public.profiles` in a new table states its `ON DELETE`
  action: `cascade` for data that belongs only to the member (`point_balances`),
  `set null` for records that must outlive the member (`points_ledger.user_id`,
  `reward_redemptions.user_id`). `user_roles.granted_by` predates this rule and
  has no action.
- A row that outlives its member must not hold member identifiers (user id,
  email, phone) anywhere except the column that is set to NULL. Say so in a
  column comment, as `points_ledger.source_id`, `points_ledger.idempotency_key`,
  `points_ledger.reason`, `points_ledger.metadata` and
  `reward_redemptions.idempotency_key` do.
- Index the foreign key columns that a profile deletion follows, so the delete
  does not scan the table (`idx_reward_redemptions_order_id`,
  `idx_reward_redemptions_fulfilled_by`).

## Scheduled jobs and job_runs logging

No `pg_cron` job exists yet. These rules apply to the first one.

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
  so they run in order. Each file wraps its tests in `begin; select plan(n);`
  and `select * from finish(); rollback;`.
- `plan(n)` must equal the number of assertions. A mismatch fails the run.
- Test behaviour, not only structure. Each new policy, grant and constraint gets
  a test that exercises it, as `anon`, a member and staff where they apply.
- A rejected write asserts both the SQLSTATE and the message, so a different
  failure fails the test:
  `throws_ok(sql, '23514', 'new row for relation "..." violates check constraint "..."', description)`.
- Switch roles with `set local role authenticated` (or `anon`), and fake the
  token with a `pg_temp.act_as(uid, app_role)` helper that sets
  `request.jwt.claims`. Run `reset role` before writing fixtures as `postgres`.
- Fixtures insert into `auth.users`, so the sign-up trigger creates the profile
  and role. Each file uses its own UUID prefix (`09000000-...` in
  `09_points_ledger_append_only.sql`). The exception is 03 and 04, which both use
  `00000000-...` (with different suffixes). Tests do not depend on rows that a later
  migration or real data could add: look up seeded rows by their `PLACEHOLDER`
  label, and use far-future dates (2999) for test settings versions.
- Run them with `pnpm db:test`. CI runs the same command.
