-- pgTAP tests for versioned loyalty settings and public.current_loyalty_settings (DATA-04 AC3).
-- Two future versions are added as fixtures: V2 one day from now and V3 ten days from now.
-- now() is fixed for the whole transaction, so the boundaries are exact.

begin;
select plan(12);

-- Fixtures: plain inserts, not assertions.
insert into public.loyalty_settings
  (id, effective_from, label, points_per_dollar, purchase_age_limit_days, redemption_code_ttl_minutes)
values
  ('08000000-0000-4000-8000-000000000002', now() + interval '1 day', 'test version 2', 2, 14, 15),
  ('08000000-0000-4000-8000-000000000003', now() + interval '10 days', 'test version 3', 3, 14, 15);

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
  (select id from public.loyalty_settings where effective_from = '-infinity'),
  'with no argument (now) the baseline is in effect'
);

select is(
  (public.current_loyalty_settings('-infinity')).id,
  (select id from public.loyalty_settings where effective_from = '-infinity'),
  'at -infinity the baseline is in effect'
);

select is(
  (public.current_loyalty_settings(
     (select effective_from from public.loyalty_settings where id = '08000000-0000-4000-8000-000000000002')
     - interval '1 microsecond'
   )).id,
  (select id from public.loyalty_settings where effective_from = '-infinity'),
  'one microsecond before version 2 starts, the baseline is still in effect'
);

select is(
  (public.current_loyalty_settings(
     (select effective_from from public.loyalty_settings where id = '08000000-0000-4000-8000-000000000002')
   )).id,
  '08000000-0000-4000-8000-000000000002'::uuid,
  'at its effective_from, version 2 is in effect'
);

select is(
  (public.current_loyalty_settings(
     (select effective_from from public.loyalty_settings where id = '08000000-0000-4000-8000-000000000002')
     + interval '5 days'
   )).id,
  '08000000-0000-4000-8000-000000000002'::uuid,
  'between version 2 and version 3, version 2 is in effect'
);

select is(
  (public.current_loyalty_settings(
     (select effective_from from public.loyalty_settings where id = '08000000-0000-4000-8000-000000000003')
   )).id,
  '08000000-0000-4000-8000-000000000003'::uuid,
  'at its effective_from, version 3 is in effect'
);

-- Test 8: two versions cannot start at the same time, so one timestamp has one version.
select throws_ok(
  $$
  insert into public.loyalty_settings
    (effective_from, label, points_per_dollar, purchase_age_limit_days, redemption_code_ttl_minutes)
  select effective_from, 'duplicate', 1, 14, 15
    from public.loyalty_settings
   where id = '08000000-0000-4000-8000-000000000002'
  $$,
  '23505', 'duplicate key value violates unique constraint "loyalty_settings_effective_from_key"',
  'a second version with the same effective_from is rejected'
);

-- Tests 9-11: API roles can read the settings but not write them.
select table_privs_are('public', 'loyalty_settings', 'anon', array['SELECT']::name[], 'anon can only SELECT loyalty_settings');
select table_privs_are('public', 'loyalty_settings', 'authenticated', array['SELECT']::name[], 'authenticated can only SELECT loyalty_settings');
select table_privs_are('public', 'loyalty_settings', 'service_role', array['SELECT']::name[], 'service_role can only SELECT loyalty_settings');

-- Test 12: read-only policy set.
select policies_are(
  'public', 'loyalty_settings',
  array['Anyone can view loyalty settings'],
  'loyalty_settings has a single read policy'
);

select * from finish();
rollback;
