-- pgTAP tests for database initialization

begin;
select plan(16);

-- Test 1: Schemas exist
select has_schema('public', 'public schema should exist');
select has_schema('private', 'private schema should exist');

-- Test 2: Extensions enabled
select has_extension('uuid-ossp', 'uuid-ossp extension should be enabled');
select has_extension('pg_cron', 'pg_cron extension should be enabled');
select has_extension('pgcrypto', 'pgcrypto extension should be enabled');

-- Test 3: Tables exist
select has_table('private', 'job_runs', 'private.job_runs table should exist');
select has_table('public', 'users', 'public.users table should exist');
select has_table('public', 'products', 'public.products table should exist');
select has_table('public', 'orders', 'public.orders table should exist');
select has_table('public', 'order_items', 'public.order_items table should exist');
select has_table('public', 'loyalty_points', 'public.loyalty_points table should exist');
select has_table('public', 'loyalty_transactions', 'public.loyalty_transactions table should exist');

-- Test 4: Key columns exist
select has_column('public', 'users', 'id', 'users table should have id column');
select has_column('public', 'products', 'price', 'products table should have price column');
select has_column('public', 'orders', 'status', 'orders table should have status column');

-- Test 5: RLS enabled
select policies_are(
  'public', 'users',
  array[
    'Users can view their own profile',
    'Users can update their own profile',
    'Admins can view all users'
  ],
  'users table should have correct RLS policies'
);

select * from finish();
rollback;
