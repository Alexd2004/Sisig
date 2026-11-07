-- pgTAP tests for the DATA-13 error contract: private.app_error_catalog(),
-- private.raise_app_error() and the AC1 sample RPC public.raise_sample_error().
-- Runs as postgres. Roles and JWT claims are switched with SET LOCAL inside the
-- transaction, which is rolled back at the end.
--
-- The TS side (packages/api/src/domain-errors.ts) is compared with the catalogue by the
-- Jest drift test packages/api/src/error-codes-drift.test.ts. These tests cover runtime
-- behaviour, so they loop over the catalogue instead of repeating the list a third time.

begin;
select plan(20);

-- Helpers ------------------------------------------------------------------

-- Act as an authenticated user with the given app_role claim (as the access token hook sets it).
create or replace function pg_temp.act_as(p_uid uuid, p_app_role text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated', 'app_role', p_app_role)::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
end $$;

-- Act as anon: no JWT at all.
create or replace function pg_temp.act_anon()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

-- Raise every catalogue code through the helper and return the codes whose SQLSTATE,
-- message or JSON hint do not match the contract. An empty array means all match.
create or replace function pg_temp.app_error_mismatches()
returns text[] language plpgsql as $$
declare
  r record;
  v_state text;
  v_message text;
  v_hint text;
  v_bad text[] := array[]::text[];
begin
  for r in select c.code, c.sqlstate from private.app_error_catalog() c loop
    begin
      perform private.raise_app_error(r.code, jsonb_build_object('n', 1));
      v_bad := v_bad || (r.code || ': did not raise');
    exception when others then
      get stacked diagnostics
        v_state = returned_sqlstate,
        v_message = message_text,
        v_hint = pg_exception_hint;
      if v_state is distinct from r.sqlstate
         or v_message is distinct from r.code
         or v_hint::jsonb is distinct from jsonb_build_object('code', r.code, 'context', jsonb_build_object('n', 1)) then
        v_bad := v_bad || (r.code || ': got ' || coalesce(v_state, '?') || ' ' || coalesce(v_message, '?'));
      end if;
    end;
  end loop;
  return v_bad;
end $$;

-- Run a statement that must fail and return its hint parsed as JSON.
create or replace function pg_temp.hint_of(p_sql text)
returns jsonb language plpgsql as $$
declare
  v_hint text;
begin
  execute p_sql;
  return null;
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  return v_hint::jsonb;
end $$;

-- Tests 1-3: the functions exist with the documented signatures.
select has_function('private', 'app_error_catalog', array[]::name[], 'private.app_error_catalog() exists');
select has_function('private', 'raise_app_error', array['text', 'jsonb']::name[], 'private.raise_app_error(text, jsonb) exists');
select has_function('public', 'raise_sample_error', array[]::name[], 'public.raise_sample_error() exists');

-- Tests 4-6: the catalogue holds at least the 13 DATA-13 codes (codes are append-only), each
-- with its own well-formed SQLSTATE. The exact list is checked by the Jest drift test.
select cmp_ok((select count(*)::int from private.app_error_catalog()), '>=', 13, 'the catalogue holds at least the 13 DATA-13 codes');

select is(
  (select count(distinct sqlstate)::int from private.app_error_catalog()),
  (select count(*)::int from private.app_error_catalog()),
  'every code has its own SQLSTATE'
);

select is(
  (select count(*)::int from private.app_error_catalog()
    where sqlstate !~ '^SS[0-9]{3}$' or sqlstate = 'SS000' or code !~ '^[A-Z][A-Z_]*$'),
  0,
  'SQLSTATEs are SS001-SS999 and codes are UPPER_SNAKE'
);

-- Test 7: every code raises with its SQLSTATE, message = code and the JSON hint.
select is(pg_temp.app_error_mismatches(), array[]::text[], 'every catalogue code raises its SQLSTATE, code and hint');

-- Tests 8-9: unknown codes are rejected; a NULL context becomes {}.
select throws_ok(
  $$ select private.raise_app_error('NOT_A_CODE') $$,
  '22023', 'Unknown app error code: NOT_A_CODE',
  'an unknown code is rejected with 22023'
);

select is(
  pg_temp.hint_of($$ select private.raise_app_error('OUT_OF_STOCK', null) $$),
  '{"code": "OUT_OF_STOCK", "context": {}}'::jsonb,
  'a NULL context is sent as an empty object'
);

-- Tests 10-13: the private helpers are not executable by API roles.
select ok(not has_function_privilege('anon', 'private.raise_app_error(text, jsonb)', 'EXECUTE'), 'anon cannot execute private.raise_app_error');
select ok(not has_function_privilege('authenticated', 'private.raise_app_error(text, jsonb)', 'EXECUTE'), 'authenticated cannot execute private.raise_app_error');
select ok(not has_function_privilege('anon', 'private.app_error_catalog()', 'EXECUTE'), 'anon cannot execute private.app_error_catalog');
select ok(not has_function_privilege('authenticated', 'private.app_error_catalog()', 'EXECUTE'), 'authenticated cannot execute private.app_error_catalog');

-- Tests 14-17: the sample RPC is SECURITY DEFINER with an empty search_path, for authenticated only.
select ok(
  (select prosecdef from pg_proc where oid = 'public.raise_sample_error()'::regprocedure),
  'raise_sample_error is SECURITY DEFINER'
);

select is(
  (select proconfig from pg_proc where oid = 'public.raise_sample_error()'::regprocedure),
  array['search_path=""'],
  'raise_sample_error sets search_path to empty'
);

select ok(has_function_privilege('authenticated', 'public.raise_sample_error()', 'EXECUTE'), 'authenticated can execute raise_sample_error');
select ok(not has_function_privilege('anon', 'public.raise_sample_error()', 'EXECUTE'), 'anon cannot execute raise_sample_error');

-- Tests 18-19: as a signed-in member, the sample raises INSUFFICIENT_POINTS (AC1).
set local role authenticated;
select pg_temp.act_as('12000000-0000-4000-8000-000000000001', 'customer');

select throws_ok(
  $$ select public.raise_sample_error() $$,
  'SS001', 'INSUFFICIENT_POINTS',
  'raise_sample_error raises SS001 with message INSUFFICIENT_POINTS'
);

select is(
  pg_temp.hint_of($$ select public.raise_sample_error() $$),
  '{"code": "INSUFFICIENT_POINTS", "context": {}}'::jsonb,
  'raise_sample_error sends the JSON hint with the code'
);

reset role;

-- Test 20: anon cannot call the sample.
set local role anon;
select pg_temp.act_anon();

select throws_ok(
  $$ select public.raise_sample_error() $$,
  '42501', null,
  'anon is denied raise_sample_error'
);

reset role;

select * from finish();
rollback;
