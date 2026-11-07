-- DATA-13: stable domain error codes for SQL functions.
-- One concern: the app error catalogue and the helper that raises from it.
--
-- Contract (see packages/api/CONVENTIONS.md):
--   * Every domain code has its own custom SQLSTATE in class SS (SS001, SS002, ...).
--     Class SS is not used by Postgres, and PostgREST passes unknown SQLSTATEs through
--     as `code` with HTTP 400. The client maps on the SQLSTATE, never on the message.
--   * MESSAGE is the code itself (never user-facing text), and HINT is JSON text:
--     {"code": "<CODE>", "context": {...}}. context holds safe, non-personal values only.
--   * Codes are append-only. Never renumber or reuse a SQLSTATE. SS000 is never used
--     (a SQLSTATE ending in 000 names a whole class).
--
-- Single source of truth: this VALUES list must match DOMAIN_ERRORS in
-- packages/api/src/domain-errors.ts. packages/api/src/error-codes-drift.test.ts reads the
-- latest migration that defines private.app_error_catalog() and fails on any drift.
-- To add a code: append it in domain-errors.ts, in a new migration that does
-- `create or replace function private.app_error_catalog()` with the full list, and in
-- supabase/functions/_shared/errors.ts.
--
-- Usage from a SECURITY DEFINER function (runs as the owner, so no grant is needed):
--   perform private.raise_app_error('INSUFFICIENT_POINTS',
--     jsonb_build_object('required', v_cost, 'balance', v_balance));
--
-- Forward-only: no existing migration is edited.

create or replace function private.app_error_catalog()
returns table (code text, sqlstate text)
language sql
immutable
set search_path = ''
as $$
  values
    ('INSUFFICIENT_POINTS', 'SS001'),
    ('REWARD_INACTIVE', 'SS002'),
    ('OUT_OF_STOCK', 'SS003'),
    ('OFFER_NOT_ELIGIBLE', 'SS004'),
    ('OFFER_CAP_REACHED', 'SS005'),
    ('OFFER_LIMIT_REACHED', 'SS006'),
    ('CLAIM_EXPIRED', 'SS007'),
    ('ALREADY_REDEEMED', 'SS008'),
    ('IDEMPOTENCY_CONFLICT', 'SS009'),
    ('RATE_LIMITED', 'SS010'),
    ('STORE_CLOSED', 'SS011'),
    ('AUTH_REAUTH_REQUIRED', 'SS012'),
    ('NEGATIVE_BALANCE', 'SS013')
$$;

comment on function private.app_error_catalog() is
  'DATA-13 domain error codes and their SQLSTATEs. Must match DOMAIN_ERRORS in packages/api/src/domain-errors.ts.';

create or replace function private.raise_app_error(
  p_code text,
  p_context jsonb default '{}'::jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_sqlstate text;
begin
  select c.sqlstate into v_sqlstate
  from private.app_error_catalog() c
  where c.code = p_code;

  if v_sqlstate is null then
    raise exception 'Unknown app error code: %', p_code using errcode = '22023';
  end if;

  raise exception using
    errcode = v_sqlstate,
    message = p_code,
    hint = jsonb_build_object('code', p_code, 'context', coalesce(p_context, '{}'::jsonb))::text;
end
$$;

comment on function private.raise_app_error(text, jsonb) is
  'DATA-13: raise a domain error with its SQLSTATE, message = code and a JSON hint {code, context}.';

-- New functions are executable by PUBLIC by default, and Supabase default privileges also
-- grant anon, authenticated and service_role. These helpers are internal only.
revoke execute on function private.app_error_catalog() from public, anon, authenticated, service_role;
revoke execute on function private.raise_app_error(text, jsonb) from public, anon, authenticated, service_role;
