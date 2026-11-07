-- pgTAP tests for public.app_config (PLAT-06 AC5): everyone reads, only admins write.
-- Rejected writes assert the SQLSTATE and the message. Writes that RLS filters to zero rows
-- (customer UPDATE and DELETE) raise no error, so a check as postgres afterwards proves that
-- nothing changed. Test rows use keys starting zz_test_12, so real keys added later do not
-- clash. Runs as postgres; everything is rolled back at the end.

begin;
select plan(27);

-- Helpers ------------------------------------------------------------------

-- Act as an authenticated user with the given app_role claim (as the access token hook sets it).
create or replace function pg_temp.act_as(p_uid uuid, p_app_role text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated', 'app_role', p_app_role)::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
end $$;

-- Act as a request that carries only the publishable key.
create or replace function pg_temp.act_anon()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

-- Fixture: one test row, written as postgres.
insert into public.app_config (key, value, description)
values ('zz_test_12', '"before"', 'pgTAP fixture');

-- Tests 1-3: structure.
select columns_are(
  'public', 'app_config',
  array['key', 'value', 'description', 'updated_at'],
  'app_config has the expected columns'
);

select col_is_pk('public', 'app_config', 'key', 'key is the primary key of app_config');

select throws_ok(
  $$insert into public.app_config (key, value, description) values ('Bad-Key', 'true', 'x')$$,
  '23514', 'new row for relation "app_config" violates check constraint "app_config_key_format"',
  'keys must be snake_case'
);

-- Tests 4-8: RLS, policies and grants.
select ok(
  (select relrowsecurity from pg_class where oid = 'public.app_config'::regclass),
  'RLS is enabled on app_config'
);

select policies_are(
  'public', 'app_config',
  array[
    'Anyone can view app config',
    'Admins can insert app config',
    'Admins can update app config',
    'Admins can delete app config'
  ],
  'app_config has the public read policy and the admin write policies'
);

select table_privs_are('public', 'app_config', 'anon', array['SELECT']::name[], 'anon can only SELECT app_config');
select table_privs_are(
  'public', 'app_config', 'authenticated', array['SELECT', 'INSERT', 'UPDATE', 'DELETE']::name[],
  'authenticated can SELECT, INSERT, UPDATE and DELETE app_config (RLS limits writes to admins)'
);
select table_privs_are('public', 'app_config', 'service_role', array['SELECT']::name[], 'service_role can only SELECT app_config');

-- Tests 9-10: the baseline rows exist and are fail-open.
select is(
  (select count(*)::int from public.app_config
    where key = any (array[
      'ordering_enabled', 'ordering_paused_message', 'receipt_scan_enabled', 'uber_eats_url',
      'min_supported_version_ios', 'min_supported_version_android', 'recommended_version',
      'store_url_ios', 'store_url_android', 'announcement_message'
    ])),
  10,
  'the migration adds all ten baseline keys'
);

-- Must match DEFAULT_APP_CONFIG in packages/api/src/remote-config.ts.
select results_eq(
  $$select key, value from public.app_config
     where key = any (array[
       'ordering_enabled', 'ordering_paused_message', 'receipt_scan_enabled', 'uber_eats_url',
       'min_supported_version_ios', 'min_supported_version_android', 'recommended_version',
       'store_url_ios', 'store_url_android', 'announcement_message'
     ])
     order by key collate "C"$$,
  $$values
      ('announcement_message'::text, 'null'::jsonb),
      ('min_supported_version_android', '"0.0.0"'),
      ('min_supported_version_ios', '"0.0.0"'),
      ('ordering_enabled', 'true'),
      ('ordering_paused_message', 'null'),
      ('receipt_scan_enabled', 'true'),
      ('recommended_version', '"0.0.0"'),
      ('store_url_android', '"https://play.google.com/store/apps/details?id=com.sisig.mobile"'),
      ('store_url_ios', 'null'),
      ('uber_eats_url', 'null')$$,
  'the baseline is fail-open and matches the defaults bundled in the app'
);

-- Tests 11-14: anon reads but cannot write (no write grant).
set local role anon;
select pg_temp.act_anon();

select is(
  (select value from public.app_config where key = 'zz_test_12'),
  '"before"'::jsonb,
  'anon can read app_config'
);

select throws_ok(
  $$insert into public.app_config (key, value, description) values ('zz_test_12_anon', 'true', 'x')$$,
  '42501', 'permission denied for table app_config',
  'anon cannot insert into app_config'
);

select throws_ok(
  $$update public.app_config set value = '"anon"' where key = 'zz_test_12'$$,
  '42501', 'permission denied for table app_config',
  'anon cannot update app_config'
);

select throws_ok(
  $$delete from public.app_config where key = 'zz_test_12'$$,
  '42501', 'permission denied for table app_config',
  'anon cannot delete from app_config'
);

reset role;

-- Tests 15-18: a customer reads but RLS blocks every write.
set local role authenticated;
select pg_temp.act_as('12000000-0000-4000-8000-000000000001', 'customer');

select is(
  (select value from public.app_config where key = 'zz_test_12'),
  '"before"'::jsonb,
  'a customer can read app_config'
);

select throws_ok(
  $$insert into public.app_config (key, value, description) values ('zz_test_12_customer', 'true', 'x')$$,
  '42501', 'new row violates row-level security policy for table "app_config"',
  'a customer cannot insert into app_config'
);

select lives_ok(
  $$update public.app_config set value = '"customer"' where key = 'zz_test_12'$$,
  'a customer update runs but RLS matches no rows'
);

select lives_ok(
  $$delete from public.app_config where key = 'zz_test_12'$$,
  'a customer delete runs but RLS matches no rows'
);

reset role;

-- Test 19: the customer's update and delete changed nothing.
select is(
  (select value from public.app_config where key = 'zz_test_12'),
  '"before"'::jsonb,
  'the customer update and delete left the row unchanged'
);

-- Test 20: staff are not admins, so they cannot write either.
set local role authenticated;
select pg_temp.act_as('12000000-0000-4000-8000-000000000002', 'staff');

select throws_ok(
  $$insert into public.app_config (key, value, description) values ('zz_test_12_staff', 'true', 'x')$$,
  '42501', 'new row violates row-level security policy for table "app_config"',
  'staff cannot insert into app_config'
);

-- Tests 21-25: an admin can insert, update and delete.
select pg_temp.act_as('12000000-0000-4000-8000-000000000003', 'admin');

select lives_ok(
  $$insert into public.app_config (key, value, description) values ('zz_test_12_admin', 'false', 'admin row')$$,
  'an admin can insert into app_config'
);

select results_eq(
  $$select value from public.app_config where key = 'zz_test_12_admin'$$,
  $$values ('false'::jsonb)$$,
  'the admin insert is visible'
);

select lives_ok(
  $$update public.app_config set value = '"after"', updated_at = now() where key = 'zz_test_12'$$,
  'an admin can update app_config'
);

select results_eq(
  $$select value from public.app_config where key = 'zz_test_12'$$,
  $$values ('"after"'::jsonb)$$,
  'the admin update is visible'
);

select lives_ok(
  $$delete from public.app_config where key = 'zz_test_12_admin'$$,
  'an admin can delete from app_config'
);

-- Test 26: an owner can write too (is_admin() covers admin and owner).
select pg_temp.act_as('12000000-0000-4000-8000-000000000004', 'owner');

select lives_ok(
  $$update public.app_config set value = '"owner"' where key = 'zz_test_12'$$,
  'an owner can update app_config'
);

reset role;

-- Test 27: the admin and owner writes took effect.
select results_eq(
  $$select key, value from public.app_config where key like 'zz\_test\_12%' order by key$$,
  $$values ('zz_test_12'::text, '"owner"'::jsonb)$$,
  'the admin delete removed its row and the owner update changed the fixture'
);

select * from finish();
rollback;
