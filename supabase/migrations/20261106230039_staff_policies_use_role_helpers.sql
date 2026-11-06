-- DATA-04: staff policies on products and orders use the role helper.
-- One concern: the staff policy set on products and orders.
--
-- The staff policies from 20261028000002_init_products.sql and
-- 20261028000003_init_orders_and_rewards.sql read public.users.role. Reading public.users
-- from a policy goes through the users staff policy, which reads its own table, so Postgres
-- failed every client read of products and orders with "infinite recursion detected in
-- policy" (supabase/README.md known issue 1). That broke the public menu as well as staff
-- access. public.users is also no longer filled on sign-up (20261028000004 replaced
-- handle_new_user), so the policies could never have matched a real staff member.
--
-- The policies now call public.is_staff(), which reads the app_role JWT claim (staff,
-- admin or owner), the same helper the profiles and user_roles policies use since
-- 20261028000006. The call is wrapped in a scalar subquery, (select public.is_staff()), so
-- Postgres evaluates it once per statement instead of once per row.
--
-- Policy names and commands are unchanged. Rewriting them also removes their dependency
-- on public.users, so the next migration can drop that table. order_items has no staff
-- policy and is not touched.
--
-- Forward-only: no existing migration is edited.

alter policy "Staff and admins can view all products"
  on public.products
  using ((select public.is_staff()));

alter policy "Staff and admins can insert products"
  on public.products
  with check ((select public.is_staff()));

alter policy "Staff and admins can update products"
  on public.products
  using ((select public.is_staff()));

alter policy "Staff can view all orders"
  on public.orders
  using ((select public.is_staff()));
