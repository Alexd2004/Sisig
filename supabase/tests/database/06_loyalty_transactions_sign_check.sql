-- pgTAP tests for the loyalty ledger sign check. Convention (decided): earned rows have
-- points_amount > 0, redeemed rows have points_amount < 0, and zero is never valid.
-- Each rejected write must raise SQLSTATE 23514 and must name the constraint that
-- rejects it, so any other 23514 failure fails the test.

begin;
select plan(6);

-- Fixtures: plain inserts, not assertions. public.users is not created by the
-- auth signup trigger on main, so the row is inserted here.
insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-000000000001', 'ledger-checks@example.com');

insert into public.users (id, email) values
  ('a0000000-0000-4000-8000-000000000001', 'ledger-checks@example.com');

-- Test 1: a valid earned row and a valid redeemed row are accepted.
select lives_ok(
  $$
  insert into public.loyalty_transactions (user_id, points_amount, transaction_type)
    values ('a0000000-0000-4000-8000-000000000001', 100, 'earned'),
           ('a0000000-0000-4000-8000-000000000001', -100, 'redeemed')
  $$,
  'a valid earned row and a valid redeemed row are accepted'
);

-- Test 2: an earned row must add points, so a negative amount is rejected.
select throws_ok(
  $$ insert into public.loyalty_transactions (user_id, points_amount, transaction_type) values ('a0000000-0000-4000-8000-000000000001', -5, 'earned') $$,
  '23514', 'new row for relation "loyalty_transactions" violates check constraint "loyalty_transactions_points_amount_matches_type"',
  'earned loyalty transaction with a negative amount is rejected'
);

-- Test 3: zero points is never valid for an earned row.
select throws_ok(
  $$ insert into public.loyalty_transactions (user_id, points_amount, transaction_type) values ('a0000000-0000-4000-8000-000000000001', 0, 'earned') $$,
  '23514', 'new row for relation "loyalty_transactions" violates check constraint "loyalty_transactions_points_amount_matches_type"',
  'earned loyalty transaction with a zero amount is rejected'
);

-- Test 4: a redeemed row must remove points, so a positive amount is rejected.
select throws_ok(
  $$ insert into public.loyalty_transactions (user_id, points_amount, transaction_type) values ('a0000000-0000-4000-8000-000000000001', 40, 'redeemed') $$,
  '23514', 'new row for relation "loyalty_transactions" violates check constraint "loyalty_transactions_points_amount_matches_type"',
  'redeemed loyalty transaction with a positive amount is rejected'
);

-- Test 5: zero points is never valid for a redeemed row.
select throws_ok(
  $$ insert into public.loyalty_transactions (user_id, points_amount, transaction_type) values ('a0000000-0000-4000-8000-000000000001', 0, 'redeemed') $$,
  '23514', 'new row for relation "loyalty_transactions" violates check constraint "loyalty_transactions_points_amount_matches_type"',
  'redeemed loyalty transaction with a zero amount is rejected'
);

-- Test 6: the check is present and still NOT VALID. A later migration validates it.
select is(
  (select count(*)::int
     from pg_constraint
    where conname = 'loyalty_transactions_points_amount_matches_type'
      and contype = 'c'
      and not convalidated),
  1,
  'loyalty ledger sign check is present and NOT VALID'
);

select * from finish();
rollback;
