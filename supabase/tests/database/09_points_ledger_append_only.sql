-- pgTAP tests for the append-only points ledger (DATA-04 AC1).
-- No role, postgres and service_role included, can update or delete a ledger row. The only
-- allowed change is the AUTH-05 anonymisation path: deleting the member sets user_id to
-- NULL through the foreign key, and nothing else in the row changes.
-- Runs as postgres. The role is switched with SET LOCAL inside the transaction, which is
-- rolled back at the end.

begin;
select plan(11);

-- Fixtures: plain inserts, not assertions. The auth sign-up trigger creates the profile.
insert into auth.users (id, email) values
  ('09000000-0000-4000-8000-000000000001', 'ledger-member@example.test');

insert into public.locations (id, name, address, latitude, longitude) values
  ('09000000-0000-4000-8000-000000000011', 'Test store 09', 'Test address, Edmonton, AB', 53.5, -113.5);

insert into public.points_ledger (id, user_id, delta, source_type, location_id, idempotency_key) values
  ('09000000-0000-4000-8000-000000000021', '09000000-0000-4000-8000-000000000001', 100, 'pos_purchase',
   '09000000-0000-4000-8000-000000000011', 'pos-09-1'),
  ('09000000-0000-4000-8000-000000000022', '09000000-0000-4000-8000-000000000001', 25, 'signup_bonus',
   null, 'signup-09-1');

-- Snapshot of every column except user_id, to prove anonymisation changes nothing else.
create temp table ledger_09_snapshot as
  select l.id, to_jsonb(l) - 'user_id' as rest
    from public.points_ledger l
   where l.user_id = '09000000-0000-4000-8000-000000000001';

-- Tests 1-3: postgres cannot update or delete a row, not even to clear user_id directly.
select throws_ok(
  $$ update public.points_ledger set delta = 200 where id = '09000000-0000-4000-8000-000000000021' $$,
  '23001', 'points_ledger is append-only: UPDATE is not allowed',
  'postgres cannot update a ledger row'
);

select throws_ok(
  $$ delete from public.points_ledger where id = '09000000-0000-4000-8000-000000000021' $$,
  '23001', 'points_ledger is append-only: DELETE is not allowed',
  'postgres cannot delete a ledger row'
);

select throws_ok(
  $$ update public.points_ledger set user_id = null where id = '09000000-0000-4000-8000-000000000021' $$,
  '23001', 'points_ledger is append-only: UPDATE is not allowed',
  'a direct update that clears user_id is rejected outside the foreign key action'
);

-- Tests 4-5: service_role holds SELECT only.
set local role service_role;

select throws_ok(
  $$ update public.points_ledger set delta = 200 where id = '09000000-0000-4000-8000-000000000021' $$,
  '42501', 'permission denied for table points_ledger',
  'service_role cannot update a ledger row'
);

select throws_ok(
  $$ delete from public.points_ledger where id = '09000000-0000-4000-8000-000000000021' $$,
  '42501', 'permission denied for table points_ledger',
  'service_role cannot delete a ledger row'
);

reset role;

-- Tests 6-8: API role privileges. TRUNCATE (which skips row triggers) is not granted.
select table_privs_are('public', 'points_ledger', 'anon', array[]::name[], 'anon has no privileges on points_ledger');
select table_privs_are('public', 'points_ledger', 'authenticated', array['SELECT']::name[], 'authenticated can only SELECT points_ledger');
select table_privs_are('public', 'points_ledger', 'service_role', array['SELECT']::name[], 'service_role can only SELECT points_ledger');

-- Tests 9-11: AUTH-05 anonymisation. Deleting the member keeps their rows with user_id NULL.
select lives_ok(
  $$ delete from auth.users where id = '09000000-0000-4000-8000-000000000001' $$,
  'deleting the member succeeds'
);

select is(
  (select count(*)::int
     from public.points_ledger l
     join ledger_09_snapshot s on s.id = l.id
    where l.user_id is null),
  2,
  'both ledger rows remain, with user_id NULL'
);

select is(
  (select count(*)::int
     from public.points_ledger l
     join ledger_09_snapshot s on s.id = l.id
    where (to_jsonb(l) - 'user_id') = s.rest),
  2,
  'both ledger rows are otherwise unchanged'
);

select * from finish();
rollback;
