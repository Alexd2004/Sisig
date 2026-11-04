-- pgTAP tests for the non-negative money and points checks.
-- Each rejected write must raise SQLSTATE 23514 (check_violation) and must name the
-- constraint that rejects it. Any other 23514 failure therefore fails the test.
-- The loyalty ledger sign check is tested in 06_loyalty_transactions_sign_check.sql.

begin;
select plan(10);

-- Fixtures: plain inserts, not assertions. public.users is not created by the
-- auth signup trigger on main, so the rows are inserted here.
insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-000000000001', 'money-checks@example.com'),
  ('a0000000-0000-4000-8000-000000000002', 'money-checks-2@example.com');

insert into public.users (id, email) values
  ('a0000000-0000-4000-8000-000000000001', 'money-checks@example.com'),
  ('a0000000-0000-4000-8000-000000000002', 'money-checks-2@example.com');

-- Test 1: a valid set of rows is accepted. Boundary values (0 points earned, a
-- fully redeemed balance) are included. The rows are kept for the rejection
-- tests below, which need them as parents.
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
  end
  $do$
  $$,
  'a valid set of money and points rows is accepted'
);

-- Tests 2-5: negative money and points values are rejected.
select throws_ok(
  $$ insert into public.products (name, category, price) values ('Bad Price', 'burger', -1) $$,
  '23514', 'new row for relation "products" violates check constraint "products_price_non_negative"',
  'negative product price is rejected'
);

select throws_ok(
  $$ insert into public.orders (user_id, total_amount) values ('a0000000-0000-4000-8000-000000000001', -1) $$,
  '23514', 'new row for relation "orders" violates check constraint "orders_total_amount_non_negative"',
  'negative order total_amount is rejected'
);

select throws_ok(
  $$ insert into public.orders (user_id, total_amount, points_earned) values ('a0000000-0000-4000-8000-000000000001', 1299, -1) $$,
  '23514', 'new row for relation "orders" violates check constraint "orders_points_earned_non_negative"',
  'negative order points_earned is rejected'
);

select throws_ok(
  $$ insert into public.order_items (order_id, product_id, quantity, unit_price) values ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 1, -1) $$,
  '23514', 'new row for relation "order_items" violates check constraint "order_items_unit_price_non_negative"',
  'negative order item unit_price is rejected'
);

-- Test 6: loyalty_points_total_points_non_negative, in isolation. A negative total
-- alone already violates loyalty_points_redeemed_within_total, because redeemed
-- can be neither negative nor above a negative total. To isolate this check, that
-- one constraint is dropped inside a savepoint, the insert is tested, and the
-- savepoint is rolled back, which restores the constraint with its NOT VALID status.
-- User 2 has no loyalty row, so only the checks can reject the insert.
savepoint isolate_total_points;
alter table public.loyalty_points drop constraint loyalty_points_redeemed_within_total;

select throws_ok(
  $$ insert into public.loyalty_points (user_id, total_points, redeemed_points) values ('a0000000-0000-4000-8000-000000000002', -1, 0) $$,
  '23514', 'new row for relation "loyalty_points" violates check constraint "loyalty_points_total_points_non_negative"',
  'negative loyalty total_points is rejected by its own check'
);

rollback to savepoint isolate_total_points;
release savepoint isolate_total_points;

-- Test 7: loyalty_points_redeemed_points_non_negative, in isolation. With total 10,
-- redeemed -1 violates only the non-negative check.
select throws_ok(
  $$ insert into public.loyalty_points (user_id, total_points, redeemed_points) values ('a0000000-0000-4000-8000-000000000002', 10, -1) $$,
  '23514', 'new row for relation "loyalty_points" violates check constraint "loyalty_points_redeemed_points_non_negative"',
  'negative loyalty redeemed_points is rejected'
);

-- Test 8: loyalty_points_redeemed_within_total, in isolation. Redeemed 11 against a
-- total of 10 violates only the within-total check.
select throws_ok(
  $$ insert into public.loyalty_points (user_id, total_points, redeemed_points) values ('a0000000-0000-4000-8000-000000000002', 10, 11) $$,
  '23514', 'new row for relation "loyalty_points" violates check constraint "loyalty_points_redeemed_within_total"',
  'loyalty redeemed_points above total_points is rejected'
);

-- Test 9: the within-total check also applies to updates, not only inserts. NOT VALID
-- does not exempt a row that is written again. User 1 has total 100 and redeemed 100.
select throws_ok(
  $$ update public.loyalty_points set redeemed_points = 101 where user_id = 'a0000000-0000-4000-8000-000000000001' $$,
  '23514', 'new row for relation "loyalty_points" violates check constraint "loyalty_points_redeemed_within_total"',
  'update that pushes redeemed_points above total_points is rejected'
);

-- Test 10: all seven money and points checks are present and NOT VALID.
-- A later migration validates them.
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
            'loyalty_points_redeemed_within_total'
          )
      and contype = 'c'
      and not convalidated),
  7,
  'all seven money and points checks are present and NOT VALID'
);

select * from finish();
rollback;
