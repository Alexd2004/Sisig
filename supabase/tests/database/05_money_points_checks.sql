-- pgTAP tests for the non-negative money and points checks.
-- Each rejected write must raise SQLSTATE 23514 (check_violation) and must name the
-- constraint that rejects it. Any other 23514 failure therefore fails the test.
-- The legacy loyalty_points checks were dropped with that table (DATA-04).

begin;
select plan(6);

-- Fixtures: plain inserts, not assertions. The auth sign-up trigger creates the
-- profile that orders.user_id references.
insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-000000000001', 'money-checks@example.com');

-- Test 1: a valid set of rows is accepted. The boundary value 0 points earned is
-- included. The rows are kept for the rejection tests below, which need them as
-- parents.
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

-- Test 6: the four money and points checks are present and NOT VALID.
-- A later migration validates them.
select is(
  (select count(*)::int
     from pg_constraint
    where conname in (
            'products_price_non_negative',
            'orders_total_amount_non_negative',
            'orders_points_earned_non_negative',
            'order_items_unit_price_non_negative'
          )
      and contype = 'c'
      and not convalidated),
  4,
  'all four money and points checks are present and NOT VALID'
);

select * from finish();
rollback;
