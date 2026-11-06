-- pgTAP tests for point balances, rewards and reward redemptions
-- (DATA-04 AC4, AC5; DATA-18 chain-wide balance).
-- Runs as postgres. Roles and JWT claims are switched with SET LOCAL inside the
-- transaction, which is rolled back at the end.

begin;
select plan(15);

-- Helpers ------------------------------------------------------------------

-- Act as an authenticated user with the given app_role claim (as the access token hook sets it).
create or replace function pg_temp.act_as(p_uid uuid, p_app_role text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated', 'app_role', p_app_role)::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
end $$;

-- Fixtures: plain inserts, not assertions. The auth sign-up trigger creates the profiles.
-- Member M earns 100 at store A and redeems reward R (40 points) at store B.
-- Other member O has one redemption.
insert into auth.users (id, email) values
  ('11000000-0000-4000-8000-000000000001', 'balance-member@example.test'),
  ('11000000-0000-4000-8000-000000000002', 'balance-other@example.test');

insert into public.locations (id, name, address, latitude, longitude) values
  ('11000000-0000-4000-8000-000000000011', 'Test store 11A', 'Test address A, Edmonton, AB', 53.5, -113.5),
  ('11000000-0000-4000-8000-000000000012', 'Test store 11B', 'Test address B, Edmonton, AB', 53.6, -113.6);

insert into public.rewards (id, name, point_cost, is_active) values
  ('11000000-0000-4000-8000-000000000031', 'Test reward 11', 40, true);

insert into public.points_ledger (id, user_id, delta, source_type, location_id, idempotency_key) values
  ('11000000-0000-4000-8000-000000000021', '11000000-0000-4000-8000-000000000001', 100, 'pos_purchase',
   '11000000-0000-4000-8000-000000000011', 'pos-11-1'),
  ('11000000-0000-4000-8000-000000000022', '11000000-0000-4000-8000-000000000001', -40, 'reward_redeem',
   '11000000-0000-4000-8000-000000000012', 'redeem-11-1'),
  ('11000000-0000-4000-8000-000000000023', '11000000-0000-4000-8000-000000000002', -10, 'reward_redeem',
   null, 'redeem-11-2');

insert into public.point_balances (user_id, balance, lifetime_earned, lifetime_redeemed) values
  ('11000000-0000-4000-8000-000000000001', 60, 100, 40),
  ('11000000-0000-4000-8000-000000000002', 0, 10, 10);

insert into public.reward_redemptions
  (id, user_id, reward_id, points_spent, ledger_entry_id, code, expires_at, channel, idempotency_key)
values
  ('11000000-0000-4000-8000-000000000041', '11000000-0000-4000-8000-000000000001',
   '11000000-0000-4000-8000-000000000031', 40, '11000000-0000-4000-8000-000000000022',
   'CODE-M-1', now() + interval '15 minutes', 'counter', 'k-m-1'),
  ('11000000-0000-4000-8000-000000000042', '11000000-0000-4000-8000-000000000002',
   '11000000-0000-4000-8000-000000000031', 10, '11000000-0000-4000-8000-000000000023',
   'CODE-O-1', now() + interval '15 minutes', 'pickup', 'k-o-1');

-- Tests 1-4: no client write grants on balances and redemptions (AC4).
select table_privs_are('public', 'point_balances', 'anon', array[]::name[], 'anon has no privileges on point_balances');
select table_privs_are('public', 'point_balances', 'authenticated', array['SELECT']::name[], 'authenticated can only SELECT point_balances');
select table_privs_are('public', 'reward_redemptions', 'anon', array[]::name[], 'anon has no privileges on reward_redemptions');
select table_privs_are('public', 'reward_redemptions', 'authenticated', array['SELECT']::name[], 'authenticated can only SELECT reward_redemptions');

-- Test 5: redemption code lookup index (AC5).
select ok(
  (select indexdef like '%(code)'
     from pg_indexes
    where schemaname = 'public'
      and indexname = 'idx_reward_redemptions_code'),
  'reward_redemptions has the code lookup index'
);

-- Tests 6-8: one chain-wide balance per member (DATA-18).
select is(
  (select sum(delta)::int from public.points_ledger where user_id = '11000000-0000-4000-8000-000000000001'),
  60,
  'points earned at one store and redeemed at another add up to one balance'
);

select hasnt_column('public', 'point_balances', 'location_id', 'point_balances has no location column');

select throws_ok(
  $$ insert into public.point_balances (user_id) values ('11000000-0000-4000-8000-000000000001') $$,
  '23505', 'duplicate key value violates unique constraint "point_balances_pkey"',
  'a member cannot have a second balance row'
);

-- Tests 9-11: read-only policy sets.
select policies_are(
  'public', 'point_balances',
  array['Members can view their own balance', 'Staff can view all balances'],
  'point_balances has the member and staff read policies'
);

select policies_are(
  'public', 'rewards',
  array['Anyone can view active rewards', 'Staff can view all rewards'],
  'rewards has the public and staff read policies'
);

select policies_are(
  'public', 'reward_redemptions',
  array['Members can view their own redemptions', 'Staff can view all redemptions'],
  'reward_redemptions has the member and staff read policies'
);

-- Tests 12-13: a member reads only their own balance and redemptions.
set local role authenticated;
select pg_temp.act_as('11000000-0000-4000-8000-000000000001', 'customer');

select results_eq(
  'select user_id from public.point_balances',
  $$values ('11000000-0000-4000-8000-000000000001'::uuid)$$,
  'a member sees only their own balance'
);

select results_eq(
  'select user_id from public.reward_redemptions',
  $$values ('11000000-0000-4000-8000-000000000001'::uuid)$$,
  'a member sees only their own redemptions'
);

reset role;

-- Tests 14-15: a code is unique among issued redemptions, and reusable once fulfilled.
-- Fixture: a second redeem entry for M, for the new redemption to spend.
insert into public.points_ledger (id, user_id, delta, source_type, idempotency_key) values
  ('11000000-0000-4000-8000-000000000024', '11000000-0000-4000-8000-000000000001', -40, 'reward_redeem',
   'redeem-11-3');

select throws_ok(
  $$
  insert into public.reward_redemptions
    (user_id, reward_id, points_spent, ledger_entry_id, code, expires_at, channel, idempotency_key)
  values ('11000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000031', 40,
          '11000000-0000-4000-8000-000000000024', 'CODE-M-1', now() + interval '15 minutes', 'counter', 'k-m-2')
  $$,
  '23505', 'duplicate key value violates unique constraint "idx_reward_redemptions_code_issued"',
  'a second issued redemption with the same code is rejected'
);

update public.reward_redemptions
   set status = 'fulfilled', fulfilled_at = now()
 where id = '11000000-0000-4000-8000-000000000041';

select lives_ok(
  $$
  insert into public.reward_redemptions
    (user_id, reward_id, points_spent, ledger_entry_id, code, expires_at, channel, idempotency_key)
  values ('11000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000031', 40,
          '11000000-0000-4000-8000-000000000024', 'CODE-M-1', now() + interval '15 minutes', 'counter', 'k-m-2')
  $$,
  'the code can be issued again once the first redemption is fulfilled'
);

select * from finish();
rollback;
