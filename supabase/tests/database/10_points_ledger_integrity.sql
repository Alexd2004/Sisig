-- pgTAP tests for points ledger integrity (DATA-04 AC2, AC5; DATA-18 location rule).
-- Each rejected write must raise the expected SQLSTATE and name the constraint that
-- rejects it, so any other failure fails the test. Each rejected row breaks one rule only.
-- Runs as postgres. Roles and JWT claims are switched with SET LOCAL inside the
-- transaction, which is rolled back at the end.

begin;
select plan(18);

-- Helpers ------------------------------------------------------------------

-- Act as an authenticated user with the given app_role claim (as the access token hook sets it).
create or replace function pg_temp.act_as(p_uid uuid, p_app_role text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated', 'app_role', p_app_role)::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
end $$;

-- Fixtures: plain inserts, not assertions. The auth sign-up trigger creates the profiles.
-- Member M has entry E (an in-store purchase at L). Other member O has one entry.
insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'integrity-member@example.test'),
  ('10000000-0000-4000-8000-000000000002', 'integrity-other@example.test');

insert into public.locations (id, name, address, latitude, longitude) values
  ('10000000-0000-4000-8000-000000000011', 'Test store 10', 'Test address, Edmonton, AB', 53.5, -113.5);

insert into public.points_ledger (id, user_id, delta, source_type, location_id, idempotency_key) values
  ('10000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000001', 100, 'pos_purchase',
   '10000000-0000-4000-8000-000000000011', 'pos-10-1'),
  ('10000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000002', 25, 'signup_bonus',
   null, 'signup-10-1');

-- Test 1: member history pagination index (AC5).
select ok(
  (select indexdef like '%(user_id, created_at DESC, id DESC)'
     from pg_indexes
    where schemaname = 'public'
      and indexname = 'idx_points_ledger_user_id_created_at_id'),
  'points_ledger has the (user_id, created_at desc, id desc) history index'
);

-- Tests 2-3: one idempotency key per source type (AC2).
select throws_ok(
  $$
  insert into public.points_ledger (user_id, delta, source_type, location_id, idempotency_key)
  values ('10000000-0000-4000-8000-000000000001', 50, 'pos_purchase', '10000000-0000-4000-8000-000000000011', 'pos-10-1')
  $$,
  '23505', 'duplicate key value violates unique constraint "points_ledger_source_type_idempotency_key_key"',
  'a duplicate (source_type, idempotency_key) is rejected'
);

select lives_ok(
  $$
  insert into public.points_ledger (user_id, delta, source_type, location_id, idempotency_key)
  values ('10000000-0000-4000-8000-000000000001', 50, 'qr_counter', '10000000-0000-4000-8000-000000000011', 'pos-10-1')
  $$,
  'the same idempotency key is allowed for a different source type'
);

-- Tests 4-7: an entry can be reversed once, and only a reversal points at another entry (AC2).
select lives_ok(
  $$
  insert into public.points_ledger (user_id, delta, source_type, reversal_of, idempotency_key)
  values ('10000000-0000-4000-8000-000000000001', -100, 'reversal', '10000000-0000-4000-8000-000000000021', 'rev-10-1')
  $$,
  'the first reversal of an entry is accepted'
);

select throws_ok(
  $$
  insert into public.points_ledger (user_id, delta, source_type, reversal_of, idempotency_key)
  values ('10000000-0000-4000-8000-000000000001', -100, 'reversal', '10000000-0000-4000-8000-000000000021', 'rev-10-2')
  $$,
  '23505', 'duplicate key value violates unique constraint "points_ledger_reversal_of_key"',
  'a second reversal of the same entry is rejected'
);

select throws_ok(
  $$
  insert into public.points_ledger (user_id, delta, source_type, idempotency_key)
  values ('10000000-0000-4000-8000-000000000001', -100, 'reversal', 'rev-10-3')
  $$,
  '23514', 'new row for relation "points_ledger" violates check constraint "points_ledger_reversal_of_matches_source"',
  'a reversal without reversal_of is rejected'
);

select throws_ok(
  $$
  insert into public.points_ledger (user_id, delta, source_type, reversal_of, idempotency_key)
  values ('10000000-0000-4000-8000-000000000002', -25, 'admin_adjust', '10000000-0000-4000-8000-000000000022', 'rev-10-4')
  $$,
  '23514', 'new row for relation "points_ledger" violates check constraint "points_ledger_reversal_of_matches_source"',
  'a non-reversal entry with reversal_of set is rejected'
);

-- Tests 8-10: in-store sources need a location (DATA-18).
select throws_ok(
  $$
  insert into public.points_ledger (user_id, delta, source_type, idempotency_key)
  values ('10000000-0000-4000-8000-000000000001', 10, 'pos_purchase', 'no-location-10-1')
  $$,
  '23514', 'new row for relation "points_ledger" violates check constraint "points_ledger_in_store_requires_location"',
  'pos_purchase without a location is rejected'
);

select throws_ok(
  $$
  insert into public.points_ledger (user_id, delta, source_type, idempotency_key)
  values ('10000000-0000-4000-8000-000000000001', 10, 'qr_counter', 'no-location-10-2')
  $$,
  '23514', 'new row for relation "points_ledger" violates check constraint "points_ledger_in_store_requires_location"',
  'qr_counter without a location is rejected'
);

select throws_ok(
  $$
  insert into public.points_ledger (user_id, delta, source_type, idempotency_key)
  values ('10000000-0000-4000-8000-000000000001', 10, 'receipt', 'no-location-10-3')
  $$,
  '23514', 'new row for relation "points_ledger" violates check constraint "points_ledger_in_store_requires_location"',
  'receipt without a location is rejected'
);

-- Test 11: chain-level sources do not need a location (DATA-18).
select lives_ok(
  $$
  insert into public.points_ledger (user_id, delta, source_type, idempotency_key) values
    ('10000000-0000-4000-8000-000000000001', 25, 'signup_bonus', 'chain-10-1'),
    ('10000000-0000-4000-8000-000000000001', 10, 'offer_bonus', 'chain-10-2'),
    ('10000000-0000-4000-8000-000000000001', -5, 'expiry', 'chain-10-3'),
    ('10000000-0000-4000-8000-000000000001', 5, 'admin_adjust', 'chain-10-4'),
    ('10000000-0000-4000-8000-000000000001', -40, 'reward_redeem', 'chain-10-5'),
    ('10000000-0000-4000-8000-000000000001', 40, 'redemption_refund', 'chain-10-6')
  $$,
  'chain-level sources are accepted without a location'
);

-- Tests 12-14: delta is non-zero and bounded on both sides.
select throws_ok(
  $$
  insert into public.points_ledger (user_id, delta, source_type, idempotency_key)
  values ('10000000-0000-4000-8000-000000000001', 0, 'admin_adjust', 'delta-10-1')
  $$,
  '23514', 'new row for relation "points_ledger" violates check constraint "points_ledger_delta_non_zero"',
  'a zero delta is rejected'
);

select throws_ok(
  $$
  insert into public.points_ledger (user_id, delta, source_type, idempotency_key)
  values ('10000000-0000-4000-8000-000000000001', 1000001, 'admin_adjust', 'delta-10-2')
  $$,
  '23514', 'new row for relation "points_ledger" violates check constraint "points_ledger_delta_bounded"',
  'a delta above 1,000,000 is rejected'
);

select throws_ok(
  $$
  insert into public.points_ledger (user_id, delta, source_type, idempotency_key)
  values ('10000000-0000-4000-8000-000000000001', -1000001, 'admin_adjust', 'delta-10-3')
  $$,
  '23514', 'new row for relation "points_ledger" violates check constraint "points_ledger_delta_bounded"',
  'a delta below -1,000,000 is rejected'
);

-- Tests 15-16: RLS is on, with the member and staff read policies.
select ok(
  (select relrowsecurity from pg_class where oid = 'public.points_ledger'::regclass),
  'RLS is enabled on points_ledger'
);

select policies_are(
  'public', 'points_ledger',
  array[
    'Members can view their own ledger entries',
    'Staff can view all ledger entries'
  ],
  'points_ledger has the member and staff read policies'
);

-- Tests 17-18: a member reads only their own entries; staff read everyone's.
set local role authenticated;
select pg_temp.act_as('10000000-0000-4000-8000-000000000001', 'customer');

select results_eq(
  'select distinct user_id from public.points_ledger',
  $$values ('10000000-0000-4000-8000-000000000001'::uuid)$$,
  'a member sees only their own ledger entries'
);

select pg_temp.act_as('10000000-0000-4000-8000-000000000003', 'staff');

select results_eq(
  $$select distinct user_id from public.points_ledger
     where user_id in ('10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002')
     order by user_id$$,
  $$values ('10000000-0000-4000-8000-000000000001'::uuid), ('10000000-0000-4000-8000-000000000002'::uuid)$$,
  'staff see every member''s ledger entries'
);

reset role;

select * from finish();
rollback;
