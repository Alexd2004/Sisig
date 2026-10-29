-- pgTAP behaviour tests for the identity layer (DATA-02 acceptance criteria 1-5).
-- 02_identity.sql checks structure only. This file checks what the schema does.
-- Runs as postgres. Roles and JWT claims are switched with SET LOCAL inside the
-- transaction, which is rolled back at the end.

begin;
select plan(59);

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

-- Try to store a phone number on the customer test profile. Returns false on a check violation.
create or replace function pg_temp.phone_accepted(p_phone text)
returns boolean language plpgsql as $$
begin
  update public.profiles set phone_e164 = p_phone where id = '00000000-0000-0000-0000-00000000d005';
  return true;
exception when check_violation then
  return false;
end $$;

-- Try to store a birthday on the customer test profile. Returns false on a check violation.
create or replace function pg_temp.birthday_accepted(p_month integer, p_day integer)
returns boolean language plpgsql as $$
begin
  update public.profiles
  set birthday_month = p_month::smallint, birthday_day = p_day::smallint
  where id = '00000000-0000-0000-0000-00000000d005';
  return true;
exception when check_violation then
  return false;
end $$;

-- AC1: sign-up creates exactly one profile and one customer role --------------

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000d001', 'owner@example.test', null),
  ('00000000-0000-0000-0000-00000000d002', 'admin@example.test', '{}'),
  ('00000000-0000-0000-0000-00000000d003', 'staff@example.test', '{"first_name": "Sam"}'),
  ('00000000-0000-0000-0000-00000000d004', 'target@example.test', '{}'),
  ('00000000-0000-0000-0000-00000000d005', 'actor@example.test', null),
  ('00000000-0000-0000-0000-00000000d006', 'Mixed.Case@Example.test', '{}'),
  ('00000000-0000-0000-0000-00000000d007', 'owner2@example.test', null);

select is(
  (select count(*)::int from public.profiles where id::text like '00000000-0000-0000-0000-00000000d00%'),
  7,
  'AC1: one profiles row per new user, with null, empty or partial metadata'
);

select is(
  (select count(*)::int from public.user_roles where user_id::text like '00000000-0000-0000-0000-00000000d00%'),
  7,
  'AC1: one user_roles row per new user'
);

select is(
  (select count(*)::int from public.user_roles
   where user_id::text like '00000000-0000-0000-0000-00000000d00%' and role = 'customer'),
  7,
  'AC1: every new sign-up starts as customer'
);

select throws_ok(
  $$insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000d009', null)$$,
  '23502',
  'null value in column "email" of relation "profiles" violates not-null constraint',
  'AC1: sign-up without an email fails loudly'
);

select is(
  (select count(*)::int from auth.users where id = '00000000-0000-0000-0000-00000000d009'),
  0,
  'AC1: the failed sign-up leaves no auth.users row behind'
);

select is(
  (select email from public.profiles where id = '00000000-0000-0000-0000-00000000d006'),
  'mixed.case@example.test',
  'AC1: email is stored lower-cased on sign-up'
);

update auth.users set email = 'New.Address@Example.test' where id = '00000000-0000-0000-0000-00000000d005';

select is(
  (select email from public.profiles where id = '00000000-0000-0000-0000-00000000d005'),
  'new.address@example.test',
  'AC1: email change on auth.users is mirrored to profiles, lower-cased'
);

-- Role setup (postgres bypasses RLS and grants): owner d001, admin d002, staff d003.
update public.user_roles set role = 'owner' where user_id = '00000000-0000-0000-0000-00000000d001';
update public.user_roles set role = 'admin' where user_id = '00000000-0000-0000-0000-00000000d002';
update public.user_roles set role = 'staff' where user_id = '00000000-0000-0000-0000-00000000d003';

-- AC2: JWT carries app_role, and the RPCs re-check the table ------------------

select is(
  (private.custom_access_token_hook(jsonb_build_object(
     'user_id', '00000000-0000-0000-0000-00000000d003',
     'claims', jsonb_build_object('sub', '00000000-0000-0000-0000-00000000d003', 'role', 'authenticated')
   )) -> 'claims' ->> 'app_role'),
  'staff',
  'AC2: access token hook puts app_role into the claims object'
);

select is(
  (private.custom_access_token_hook(jsonb_build_object(
     'user_id', '00000000-0000-0000-0000-00000000d003',
     'claims', jsonb_build_object('sub', '00000000-0000-0000-0000-00000000d003', 'role', 'authenticated')
   )) -> 'claims' ->> 'sub'),
  '00000000-0000-0000-0000-00000000d003',
  'AC2: access token hook keeps the existing claims'
);

select ok(
  (private.custom_access_token_hook(jsonb_build_object(
     'user_id', '00000000-0000-0000-0000-00000000d003',
     'claims', jsonb_build_object('sub', '00000000-0000-0000-0000-00000000d003')
   )) -> 'app_role') is null,
  'AC2: access token hook does not add app_role at the top level of the event'
);

select ok(
  not has_function_privilege('anon', 'private.custom_access_token_hook(jsonb)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.custom_access_token_hook(jsonb)', 'EXECUTE'),
  'AC2: clients cannot call the access token hook'
);

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin nologin;
  end if;
end $$;

select ok(
  has_schema_privilege('supabase_auth_admin', 'private', 'USAGE')
  and has_function_privilege('supabase_auth_admin', 'private.custom_access_token_hook(jsonb)', 'EXECUTE'),
  'AC2: supabase_auth_admin can reach and run the access token hook'
);

-- Demote staff d003 in the table only. Its JWT still says staff until it refreshes.
update public.user_roles set role = 'customer' where user_id = '00000000-0000-0000-0000-00000000d003';

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000d003', 'staff');

select ok(
  public.is_staff(),
  'AC2: the stale JWT still says staff, so the RPC re-check is what protects'
);

select throws_ok(
  $$select public.set_user_role('00000000-0000-0000-0000-00000000d005', 'staff')$$,
  '42501',
  'Permission denied: insufficient role',
  'AC2: demoted staff is rejected by set_user_role before the JWT expires'
);

reset role;

-- AC3: role rules and direct writes -------------------------------------------

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000d005', 'customer');

select throws_ok(
  $$select public.set_user_role('00000000-0000-0000-0000-00000000d004', 'staff')$$,
  '42501',
  'Permission denied: insufficient role',
  'AC3: a customer cannot call set_user_role'
);

reset role;
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000d002', 'admin');

select throws_ok(
  $$select public.set_user_role('00000000-0000-0000-0000-00000000d004', 'admin')$$,
  '42501',
  'Admin cannot grant admin or owner role',
  'AC3: an admin cannot grant admin'
);

select throws_ok(
  $$select public.set_user_role('00000000-0000-0000-0000-00000000d004', 'owner')$$,
  '42501',
  'Admin cannot grant admin or owner role',
  'AC3: an admin cannot grant owner'
);

select lives_ok(
  $$select public.set_user_role('00000000-0000-0000-0000-00000000d004', 'staff')$$,
  'AC3: an admin can grant staff'
);

select throws_ok(
  $$select public.set_user_role('00000000-0000-0000-0000-00000000d002', 'customer')$$,
  '42501',
  'Cannot change your own role',
  'AC3: an admin cannot change their own role'
);

select throws_ok(
  $$select public.set_user_role('00000000-0000-0000-0000-00000000d001', 'staff')$$,
  '42501',
  'Cannot demote the last remaining owner',
  'AC3: an admin cannot demote the last owner'
);

reset role;

select is(
  (select role::text from public.user_roles where user_id = '00000000-0000-0000-0000-00000000d004'),
  'staff',
  'AC3: the admin grant to staff was applied'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000d001', 'owner');

select throws_ok(
  $$select public.set_user_role('00000000-0000-0000-0000-00000000d001', 'customer')$$,
  '42501',
  'Cannot change your own role',
  'AC3: an owner cannot change their own role'
);

select lives_ok(
  $$select public.set_user_role('00000000-0000-0000-0000-00000000d007', 'owner')$$,
  'AC3: an owner can grant owner'
);

reset role;

select is(
  (select role::text from public.user_roles where user_id = '00000000-0000-0000-0000-00000000d007'),
  'owner',
  'AC3: the owner grant was applied'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000d007', 'owner');

select lives_ok(
  $$select public.set_user_role('00000000-0000-0000-0000-00000000d001', 'staff')$$,
  'AC3: an owner can demote another owner while two owners exist'
);

reset role;

select is(
  (select role::text from public.user_roles where user_id = '00000000-0000-0000-0000-00000000d001'),
  'staff',
  'AC3: the demotion of the other owner was applied'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000d002', 'admin');

select throws_ok(
  $$select public.set_user_role('00000000-0000-0000-0000-00000000d007', 'customer')$$,
  '42501',
  'Cannot demote the last remaining owner',
  'AC3: the last remaining owner cannot be demoted, even by an admin'
);

reset role;

set local role anon;
select pg_temp.act_anon();

select throws_ok(
  $$select public.set_user_role('00000000-0000-0000-0000-00000000d004', 'staff')$$,
  '42501',
  'permission denied for function set_user_role',
  'AC3: anon cannot execute set_user_role'
);

reset role;

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000d005', 'customer');

select throws_ok(
  $$update public.user_roles set role = 'owner' where user_id = '00000000-0000-0000-0000-00000000d005'$$,
  '42501',
  'permission denied for table user_roles',
  'AC3: a customer cannot update user_roles directly'
);

select throws_ok(
  $$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000d005', 'owner')$$,
  '42501',
  'permission denied for table user_roles',
  'AC3: a customer cannot insert into user_roles directly'
);

select throws_ok(
  $$delete from public.user_roles where user_id = '00000000-0000-0000-0000-00000000d005'$$,
  '42501',
  'permission denied for table user_roles',
  'AC3: a customer cannot delete from user_roles directly'
);

select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_roles'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ),
  'AC3: user_roles has no write policy, so RLS alone also blocks writes'
);

-- Defence in depth: if a grant were ever added back, RLS must still block the write.
reset role;
grant insert, update, delete on public.user_roles to authenticated;
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000d005', 'customer');
update public.user_roles set role = 'owner' where user_id = '00000000-0000-0000-0000-00000000d005';
reset role;
revoke insert, update, delete on public.user_roles from authenticated;

select is(
  (select role::text from public.user_roles where user_id = '00000000-0000-0000-0000-00000000d005'),
  'customer',
  'AC3: with the grant restored, RLS still stops a customer from changing their role'
);

-- Reads: RLS policies must work, without recursion
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000d005', 'customer');

select is(
  (select count(*)::int from public.user_roles),
  1,
  'AC3: a customer reads only their own role row'
);

select is(
  (select count(*)::int from public.profiles),
  1,
  'AC3: a customer reads only their own profile'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000d002', 'admin');

select is(
  (select count(*)::int from public.user_roles where user_id::text like '00000000-0000-0000-0000-00000000d00%'),
  7,
  'AC3: an admin reads all role rows'
);

select is(
  (select count(*)::int from public.profiles where id::text like '00000000-0000-0000-0000-00000000d00%'),
  7,
  'AC3: an admin reads all profiles'
);

reset role;

-- AC4: is_staff, is_admin, is_owner truth table --------------------------------

set local role authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-00000000d005', 'customer');
select results_eq(
  $$select public.is_staff(), public.is_admin(), public.is_owner()$$,
  $$values (false, false, false)$$,
  'AC4: customer -> is_staff, is_admin, is_owner all false'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000d003', 'staff');
select results_eq(
  $$select public.is_staff(), public.is_admin(), public.is_owner()$$,
  $$values (true, false, false)$$,
  'AC4: staff -> is_staff true only'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000d002', 'admin');
select results_eq(
  $$select public.is_staff(), public.is_admin(), public.is_owner()$$,
  $$values (true, true, false)$$,
  'AC4: admin -> is_staff and is_admin true, is_owner false'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000d007', 'owner');
select results_eq(
  $$select public.is_staff(), public.is_admin(), public.is_owner()$$,
  $$values (true, true, true)$$,
  'AC4: owner -> all three true'
);

reset role;
set local role anon;

select pg_temp.act_anon();
select results_eq(
  $$select public.is_staff(), public.is_admin(), public.is_owner()$$,
  $$values (false, false, false)$$,
  'AC4: anon with no JWT -> all three false, not NULL'
);

select set_config('request.jwt.claims', '{"role": "anon"}', true);
select results_eq(
  $$select public.is_staff(), public.is_admin(), public.is_owner()$$,
  $$values (false, false, false)$$,
  'AC4: anon with a JWT that has no app_role -> all three false, not NULL'
);

reset role;

-- AC5: birthday and phone check constraints --------------------------------------

select ok(pg_temp.phone_accepted('+14165551234'), 'AC5: E.164 phone number is accepted');
select is(pg_temp.phone_accepted('4165551234'), false, 'AC5: phone without a leading + is rejected');
select is(pg_temp.phone_accepted('+0123456'), false, 'AC5: phone with a country code starting at 0 is rejected');
select is(pg_temp.phone_accepted('+1234567890123456'), false, 'AC5: phone with more than 15 digits is rejected');
select is(pg_temp.phone_accepted('+1 416 555 1234'), false, 'AC5: phone with spaces is rejected');

select ok(pg_temp.birthday_accepted(2, 29), 'AC5: 29 February is accepted');
select ok(pg_temp.birthday_accepted(12, 31), 'AC5: 31 December is accepted');
select ok(pg_temp.birthday_accepted(null, null), 'AC5: no birthday is accepted');
select is(pg_temp.birthday_accepted(13, 1), false, 'AC5: month 13 is rejected');
select is(pg_temp.birthday_accepted(6, 0), false, 'AC5: day 0 is rejected');
select is(pg_temp.birthday_accepted(6, 32), false, 'AC5: day 32 is rejected');
select is(pg_temp.birthday_accepted(null, 5), false, 'AC5: a day without a month is rejected');
select is(pg_temp.birthday_accepted(6, null), false, 'AC5: a month without a day is rejected');
select is(pg_temp.birthday_accepted(2, 30), false, 'AC5: 30 February is rejected');
select is(pg_temp.birthday_accepted(4, 31), false, 'AC5: 31 April is rejected');

select hasnt_column('public', 'profiles', 'birthday_year', 'AC5: birthday is stored without a year');

select * from finish();
rollback;
