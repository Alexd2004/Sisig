-- pgTAP regression test for public.set_user_role (DATA-02 hardening).
-- 20261028000006_identity_hardening.sql locks the owner rows (FOR UPDATE) before the
-- last-owner count, and sets updated_at when a role changes. A later migration recreated the
-- function without either, and 03_identity_behaviour.sql still passed. This file pins both.
--
-- Two concurrent transactions cannot be run inside one pgTAP transaction, so the lock is
-- checked against the stored function definition, in the order the function uses it. The
-- updated_at change is checked behaviourally. Runs as postgres; rolled back at the end.

begin;
select plan(5);

-- 1. The owner check locks owner rows.
select ok(
  pg_get_functiondef('public.set_user_role(uuid, public.app_role)'::regprocedure) ~* 'for update',
  'set_user_role locks owner rows with FOR UPDATE'
);

-- 2. The lock is taken before the last-owner count, so concurrent demotions serialise.
select ok(
  (select strpos(d, 'for update') > 0 and strpos(d, 'for update') < strpos(d, 'count(*)')
     from (select lower(pg_get_functiondef('public.set_user_role(uuid, public.app_role)'::regprocedure)) as d) f),
  'the owner lock is taken before the last-owner count'
);

-- 3. A role change stamps updated_at.
select ok(
  pg_get_functiondef('public.set_user_role(uuid, public.app_role)'::regprocedure) ~* 'updated_at\s*=\s*now\(\)',
  'set_user_role sets updated_at when it changes a role'
);

-- 4 and 5. Behaviour: an owner grants a role; updated_at moves off a fixed old timestamp.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000e001', 'owner-lock@example.test'),
  ('00000000-0000-0000-0000-00000000e002', 'target-lock@example.test')
on conflict (id) do nothing;

update public.user_roles set role = 'owner'
  where user_id = '00000000-0000-0000-0000-00000000e001';
update public.user_roles set updated_at = '2000-01-01 00:00:00+00'
  where user_id = '00000000-0000-0000-0000-00000000e002';

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e001', true);
select public.set_user_role('00000000-0000-0000-0000-00000000e002', 'staff');

select isnt(
  (select updated_at from public.user_roles where user_id = '00000000-0000-0000-0000-00000000e002'),
  '2000-01-01 00:00:00+00'::timestamptz,
  'a role change moves updated_at forward'
);

select is(
  (select role::text from public.user_roles where user_id = '00000000-0000-0000-0000-00000000e002'),
  'staff',
  'the owner grant was applied'
);

select * from finish();
rollback;
