-- pgTAP tests for versioned loyalty settings and public.current_loyalty_settings (DATA-04 AC3).
-- Two far-future versions are added as fixtures: V2 starts 2999-01-01 and V3 2999-01-11.
-- The tests compare against the version in effect now, captured before the fixtures, so they
-- keep passing once real versions are added (LOY-06).

begin;
select plan(13);

-- The version in effect now, read straight from the table (latest effective_from at or
-- before now()). Today that is the -infinity baseline.
create temp table settings_08_now as
  select id
    from public.loyalty_settings
   where effective_from <= now()
   order by effective_from desc
   limit 1;

-- Fixtures: plain inserts, not assertions.
insert into public.loyalty_settings
  (id, effective_from, label, points_per_dollar, purchase_age_limit_days, redemption_code_ttl_minutes)
values
  ('08000000-0000-4000-8000-000000000002', '2999-01-01 00:00:00+00', 'test version 2', 2, 14, 15),
  ('08000000-0000-4000-8000-000000000003', '2999-01-11 00:00:00+00', 'test version 3', 3, 14, 15);

-- Test 1: the migration adds exactly one baseline version, flagged as a placeholder.
select is(
  (select count(*)::int
     from public.loyalty_settings
    where effective_from = '-infinity'
      and is_placeholder
      and label like 'PLACEHOLDER%'),
  1,
  'exactly one placeholder baseline version starts at -infinity'
);

-- Tests 2-7: the version in effect at, before and after each boundary.
select is(
  (public.current_loyalty_settings()).id,
  (select id from settings_08_now),
  'with no argument (now), the latest version that has started is in effect'
);

select is(
  (public.current_loyalty_settings('-infinity')).id,
  (select id from public.loyalty_settings where effective_from = '-infinity'),
  'at -infinity the baseline is in effect'
);

select is(
  (public.current_loyalty_settings('2999-01-01 00:00:00+00'::timestamptz - interval '1 microsecond')).id,
  (select id from settings_08_now),
  'one microsecond before version 2 starts, the earlier version is still in effect'
);

select is(
  (public.current_loyalty_settings('2999-01-01 00:00:00+00')).id,
  '08000000-0000-4000-8000-000000000002'::uuid,
  'at its effective_from, version 2 is in effect'
);

select is(
  (public.current_loyalty_settings('2999-01-06 00:00:00+00')).id,
  '08000000-0000-4000-8000-000000000002'::uuid,
  'between version 2 and version 3, version 2 is in effect'
);

select is(
  (public.current_loyalty_settings('2999-01-11 00:00:00+00')).id,
  '08000000-0000-4000-8000-000000000003'::uuid,
  'at its effective_from, version 3 is in effect'
);

-- Test 8: two versions cannot start at the same time, so one timestamp has one version.
select throws_ok(
  $$
  insert into public.loyalty_settings
    (effective_from, label, points_per_dollar, purchase_age_limit_days, redemption_code_ttl_minutes)
  values ('2999-01-01 00:00:00+00', 'duplicate', 1, 14, 15)
  $$,
  '23505', 'duplicate key value violates unique constraint "loyalty_settings_effective_from_key"',
  'a second version with the same effective_from is rejected'
);

-- Tests 9-11: API roles can read the settings but not write them.
select table_privs_are('public', 'loyalty_settings', 'anon', array['SELECT']::name[], 'anon can only SELECT loyalty_settings');
select table_privs_are('public', 'loyalty_settings', 'authenticated', array['SELECT']::name[], 'authenticated can only SELECT loyalty_settings');
select table_privs_are('public', 'loyalty_settings', 'service_role', array['SELECT']::name[], 'service_role can only SELECT loyalty_settings');

-- Tests 12-13: RLS is on, with a single read policy.
select ok(
  (select relrowsecurity from pg_class where oid = 'public.loyalty_settings'::regclass),
  'RLS is enabled on loyalty_settings'
);

select policies_are(
  'public', 'loyalty_settings',
  array['Anyone can view loyalty settings'],
  'loyalty_settings has a single read policy'
);

select * from finish();
rollback;
