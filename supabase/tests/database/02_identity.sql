-- pgTAP tests for identity and role system

begin;
select plan(25);

-- Test 1: Tables exist
select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'user_roles', 'user_roles table exists');

-- Test 2: Columns exist
select has_column('public', 'profiles', 'id', 'profiles has id');
select has_column('public', 'profiles', 'email', 'profiles has email');
select has_column('public', 'profiles', 'phone_e164', 'profiles has phone_e164');
select has_column('public', 'profiles', 'birthday_month', 'profiles has birthday_month');
select has_column('public', 'profiles', 'locale', 'profiles has locale');
select has_column('public', 'user_roles', 'role', 'user_roles has role');
select has_column('public', 'user_roles', 'granted_by', 'user_roles has granted_by');

-- Test 3: Enums exist
select enum_has_labels(
  'public'::name,
  'app_role'::name,
  array['customer', 'staff', 'admin', 'owner'],
  'app_role enum has all labels'
);

-- Test 4: RLS enabled
select policies_are(
  'public', 'profiles',
  array[
    'Users can view their own profile',
    'Users can update their own profile',
    'Staff can view all profiles'
  ],
  'profiles has correct policies'
);

select policies_are(
  'public', 'user_roles',
  array[
    'Users can view their own role',
    'Staff can view all roles'
  ],
  'user_roles has correct policies'
);

-- Test 5: Functions exist
select has_function('public', 'is_staff', array[]::name[], 'is_staff() function exists');
select has_function('public', 'is_admin', array[]::name[], 'is_admin() function exists');
select has_function('public', 'is_owner', array[]::name[], 'is_owner() function exists');
select has_function('public', 'set_user_role', array['uuid', 'app_role']::name[], 'set_user_role() function exists');

-- Test 6: Constraints
select col_has_check('public', 'profiles', 'phone_e164', 'phone_e164 has E.164 check');
select col_has_check('public', 'profiles', 'birthday_month', 'birthday_month has range check');

-- Test 7: Defaults
select col_default_is('public', 'profiles', 'locale', "'en-CA'::text", 'locale defaults to en-CA');
select col_default_is('public', 'user_roles', 'role', "'customer'::app_role", 'role defaults to customer');

select * from finish();
rollback;
