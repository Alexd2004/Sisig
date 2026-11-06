-- pgTAP tests for the legacy schema cleanup (DATA-04).
-- The legacy users and loyalty tables and the user_role enum are gone, orders reference
-- profiles, and the staff policies on products and orders use (select public.is_staff()).
-- Runs as postgres. Roles and JWT claims are switched with SET LOCAL inside the
-- transaction, which is rolled back at the end.

begin;
select plan(13);

-- Helpers ------------------------------------------------------------------

-- Act as an authenticated user with the given app_role claim (as the access token hook sets it).
create or replace function pg_temp.act_as(p_uid uuid, p_app_role text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated', 'app_role', p_app_role)::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
end $$;

-- Fixtures: plain inserts, not assertions. The auth sign-up trigger creates the profiles.
-- Member M owns order O1. Staff S and customer C get their role from the app_role claim
-- (act_as). Product P is unavailable, so only the staff policy can show it.
insert into auth.users (id, email) values
  ('06000000-0000-4000-8000-000000000001', 'legacy-member@example.test'),
  ('06000000-0000-4000-8000-000000000002', 'legacy-staff@example.test'),
  ('06000000-0000-4000-8000-000000000003', 'legacy-customer@example.test');

insert into public.products (id, name, category, price, is_available) values
  ('06000000-0000-4000-8000-000000000011', 'Hidden Burger', 'burger', 999, false);

insert into public.orders (id, user_id, total_amount) values
  ('06000000-0000-4000-8000-000000000021', '06000000-0000-4000-8000-000000000001', 999);

-- Tests 1-4: the legacy objects are gone.
select hasnt_table('public', 'users', 'public.users is dropped');
select hasnt_table('public', 'loyalty_points', 'public.loyalty_points is dropped');
select hasnt_table('public', 'loyalty_transactions', 'public.loyalty_transactions is dropped');
select hasnt_type('public', 'user_role', 'public.user_role enum is dropped');

-- Test 5: orders belong to profiles.
select fk_ok(
  'public', 'orders', 'user_id',
  'public', 'profiles', 'id',
  'orders.user_id references profiles.id'
);

-- Test 6: each of the four rewritten staff policies is exactly (select is_staff()), nothing more.
select is(
  (select count(*)::int
     from pg_policies
    where schemaname = 'public'
      and (tablename, policyname) in (
            ('products', 'Staff and admins can view all products'),
            ('products', 'Staff and admins can insert products'),
            ('products', 'Staff and admins can update products'),
            ('orders', 'Staff can view all orders')
          )
      and coalesce(qual, with_check) ~ '^\(\s*SELECT\s+(public\.)?is_staff\(\)\s+AS\s+is_staff\)$'),
  4,
  'the staff policies on products and orders are exactly (select is_staff())'
);

-- Tests 7-8: policy names are unchanged.
select policies_are(
  'public', 'products',
  array[
    'Anyone can view available products',
    'Staff and admins can view all products',
    'Staff and admins can insert products',
    'Staff and admins can update products'
  ],
  'products has the same policies'
);

select policies_are(
  'public', 'orders',
  array[
    'Users can view their own orders',
    'Users can create orders',
    'Staff can view all orders'
  ],
  'orders has the same policies'
);

-- Tests 9-12: staff (by JWT claim) read the unavailable product and another member's order;
-- a customer reads neither.
set local role authenticated;
select pg_temp.act_as('06000000-0000-4000-8000-000000000002', 'staff');

select is(
  (select count(*)::int from public.products where id = '06000000-0000-4000-8000-000000000011'),
  1,
  'staff can read an unavailable product'
);

select is(
  (select count(*)::int from public.orders where id = '06000000-0000-4000-8000-000000000021'),
  1,
  'staff can read another member''s order'
);

select pg_temp.act_as('06000000-0000-4000-8000-000000000003', 'customer');

select is(
  (select count(*)::int from public.products where id = '06000000-0000-4000-8000-000000000011'),
  0,
  'a customer cannot read an unavailable product'
);

select is(
  (select count(*)::int from public.orders where id = '06000000-0000-4000-8000-000000000021'),
  0,
  'a customer cannot read another member''s order'
);

reset role;

-- Test 13: deleting the member deletes their orders (cascade through profiles).
delete from auth.users where id = '06000000-0000-4000-8000-000000000001';

select is(
  (select count(*)::int from public.orders where user_id = '06000000-0000-4000-8000-000000000001'),
  0,
  'deleting a member deletes their orders through the profiles foreign key'
);

select * from finish();
rollback;
