-- DATA-04: staff policies on products and orders use the role helper.
-- One concern: the staff policy set on products and orders.
--
-- The staff policies from 20261028000002_init_products.sql and
-- 20261028000003_init_orders_and_rewards.sql read public.users.role. public.users is no
-- longer filled on sign-up (20261028000004 replaced handle_new_user), and reading it from
-- a policy goes through the users staff policy, which reads its own table and recurses.
-- So these policies never matched a real staff member. They now call public.is_staff(),
-- which reads the app_role JWT claim (staff, admin or owner), the same helper the
-- profiles and user_roles policies use since 20261028000006.
--
-- Policy names and commands are unchanged. Rewriting them also removes their dependency
-- on public.users, so the next migration can drop that table. order_items has no staff
-- policy and is not touched.
--
-- Forward-only: no existing migration is edited.

alter policy "Staff and admins can view all products"
  on public.products
  using (public.is_staff());

alter policy "Staff and admins can insert products"
  on public.products
  with check (public.is_staff());

alter policy "Staff and admins can update products"
  on public.products
  using (public.is_staff());

alter policy "Staff can view all orders"
  on public.orders
  using (public.is_staff());
