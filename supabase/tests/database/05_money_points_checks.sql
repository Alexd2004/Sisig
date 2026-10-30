-- pgTAP tests for the non-negative money and points checks (20261029235700).
-- Each rejected write must raise SQLSTATE 23514 (check_violation).

begin;
select plan(14);

-- Fixtures: plain inserts, not assertions. public.users is not created by the
-- auth signup trigger on main, so the rows are inserted here.
insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-000000000001', 'money-checks@example.com'),
  ('a0000000-0000-4000-8000-000000000002', 'money-checks-2@example.com');

insert into public.users (id, email) values
  ('a0000000-0000-4000-8000-000000000001', 'money-checks@example.com'),
  ('a0000000-0000-4000-8000-000000000002', 'money-checks-2@example.com');

-- Test 1: a valid set of rows is accepted. Boundary values (0 points earned, a
-- fully redeemed balance, an earned row and a redeemed row) are included.
-- The rows are kept for the rejection tests below, which need them as parents.
select lives_ok(
  $$
  do $do$
  begin
    insert into public.products (id, name, category, price)
      values ('b0000000-0000-4000-8000-000000000001', 'Classic Burger', 'burger', 1299);
    insert into public.orders (id, user_id, total_amount, points_earned)
      values ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 1299, 0);
    insert into public.order_items (order_id, product_id, quantity, unit_price)
      values ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 1, 1299);
    insert into public.loyalty_points (user_id, total_points, redeemed_points)
      values ('a0000000-0000-4000-8000-000000000001', 100, 100);
    insert into public.loyalty_transactions (user_id, points_amount, transaction_type)
      values ('a0000000-0000-4000-8000-000000000001', 100, 'earned'),
             ('a0000000-0000-4000-8000-000000000001', -100, 'redeemed');
  end
  $do$
  $$,
  'a valid set of money and points rows is accepted'
);

-- Tests 2-5: negative money and points values are rejected.
select throws_ok(
  $$ insert into public.products (name, category, price) values ('Bad Price', 'burger', -1) $$,
  '23514', null,
  'negative product price is rejected'
);

select throws_ok(
  $$ insert into public.orders (user_id, total_amount) values ('a0000000-0000-4000-8000-000000000001', -1) $$,
  '23514', null,
  'negative order total_amount is rejected'
);

select throws_ok(
  $$ insert into public.orders (user_id, total_amount, points_earned) values ('a0000000-0000-4000-8000-000000000001', 1299, -1) $$,
  '23514', null,
  'negative order points_earned is rejected'
);

select throws_ok(
  $$ insert into public.order_items (order_id, product_id, quantity, unit_price) values ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 1, -1) $$,
  '23514', null,
  'negative order item unit_price is rejected'
);

-- Tests 6-8: loyalty balance rows. User 2 has no loyalty row, so only the check can reject these.
select throws_ok(
  $$ insert into public.loyalty_points (user_id, total_points, redeemed_points) values ('a0000000-0000-4000-8000-000000000002', -1, 0) $$,
  '23514', null,
  'negative loyalty total_points is rejected'
);

select throws_ok(
  $$ insert into public.loyalty_points (user_id, total_points, redeemed_points) values ('a0000000-0000-4000-8000-000000000002', 10, -1) $$,
  '23514', null,
  'negative loyalty redeemed_points is rejected'
);

select throws_ok(
  $$ insert into public.loyalty_points (user_id, total_points, redeemed_points) values ('a0000000-0000-4000-8000-000000000002', 10, 11) $$,
  '23514', null,
  'loyalty redeemed_points above total_points is rejected'
);

-- Test 9: the check also applies to updates, not only inserts. NOT VALID does
-- not exempt a row that is written again.
select throws_ok(
  $$ update public.loyalty_points set redeemed_points = 101 where user_id = 'a0000000-0000-4000-8000-000000000001' $$,
  '23514', null,
  'update that pushes redeemed_points above total_points is rejected'
);

-- Tests 10-13: the ledger sign must match transaction_type. Zero is never valid.
select throws_ok(
  $$ insert into public.loyalty_transactions (user_id, points_amount, transaction_type) values ('a0000000-0000-4000-8000-000000000001', -5, 'earned') $$,
  '23514', null,
  'earned loyalty transaction with a negative amount is rejected'
);

select throws_ok(
  $$ insert into public.loyalty_transactions (user_id, points_amount, transaction_type) values ('a0000000-0000-4000-8000-000000000001', 0, 'earned') $$,
  '23514', null,
  'earned loyalty transaction with a zero amount is rejected'
);

select throws_ok(
  $$ insert into public.loyalty_transactions (user_id, points_amount, transaction_type) values ('a0000000-0000-4000-8000-000000000001', 40, 'redeemed') $$,
  '23514', null,
  'redeemed loyalty transaction with a positive amount is rejected'
);

select throws_ok(
  $$ insert into public.loyalty_transactions (user_id, points_amount, transaction_type) values ('a0000000-0000-4000-8000-000000000001', 0, 'redeemed') $$,
  '23514', null,
  'redeemed loyalty transaction with a zero amount is rejected'
);

-- Test 14: every new check is in place and still NOT VALID. A later migration validates them.
select is(
  (select count(*)::int
     from pg_constraint
    where conname in (
            'products_price_non_negative',
            'orders_total_amount_non_negative',
            'orders_points_earned_non_negative',
            'order_items_unit_price_non_negative',
            'loyalty_points_total_points_non_negative',
            'loyalty_points_redeemed_points_non_negative',
            'loyalty_points_redeemed_within_total',
            'loyalty_transactions_points_amount_matches_type'
          )
      and contype = 'c'
      and not convalidated),
  8,
  'all eight money and points checks are present and NOT VALID'
);

select * from finish();
rollback;
