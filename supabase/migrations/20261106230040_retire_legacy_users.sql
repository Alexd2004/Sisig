-- DATA-04: retire the legacy public.users table and the public.user_role enum.
-- One concern: move orders onto profiles and drop the legacy user store.
--
-- public.users and public.user_role predate the identity layer (DATA-02). Profiles and
-- roles now live in public.profiles and public.user_roles, and sign-up no longer writes
-- public.users. The last dependants were the orders foreign key, the loyalty tables
-- (dropped in 20261106230037) and the staff policies (rewritten in 20261106230039).
-- The handle_new_user function that wrote public.users was replaced in 20261028000004 and
-- 20261028000006, so no function or trigger reads the table any more.
--
-- 1. orders.user_id now references public.profiles(id), still on delete cascade. Every
--    profile id is an auth.users id, so the column keeps its meaning.
--    Adding the constraint validates the existing rows. If an order belongs to a user who
--    has no profile, this migration fails with 23503 (foreign_key_violation). That is
--    intended: it fails loudly and deletes nothing. Run the audit queries in the PR
--    description against each shared environment before it is applied there. If any
--    order has no profile, a product-owner-approved backfill migration must run first.
-- 2. public.users and public.user_role are dropped. Their rows are not migrated (no
--    backfill): roles are granted again through public.set_user_role where needed.
--
-- Forward-only: no existing migration is edited.

-- 1. orders.user_id references profiles.
alter table public.orders drop constraint orders_user_id_fkey;

alter table public.orders
  add constraint orders_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- 2. Drop the legacy user store.
drop table public.users;
drop type public.user_role;
