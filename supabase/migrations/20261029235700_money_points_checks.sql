-- Non-negative money and points checks, and the loyalty ledger sign rule.
-- One concern: money and points integrity

-- Every check is added NOT VALID. Postgres enforces a NOT VALID check on each
-- new row and each updated row, but it does not scan the rows that already exist.
-- Rows written before this migration were never checked, so a scan could fail.
-- VALIDATE CONSTRAINT is deliberately NOT run here. A later migration validates
-- each constraint once the existing data has been cleaned.
-- Until then, an existing row that holds a bad value cannot be updated at all,
-- even to change an unrelated column, because the whole new row is checked.

-- Money: integer cents, never negative.
alter table public.products
  add constraint products_price_non_negative
  check (price >= 0) not valid;

alter table public.orders
  add constraint orders_total_amount_non_negative
  check (total_amount >= 0) not valid;

alter table public.order_items
  add constraint order_items_unit_price_non_negative
  check (unit_price >= 0) not valid;

-- Points earned on an order, never negative.
alter table public.orders
  add constraint orders_points_earned_non_negative
  check (points_earned >= 0) not valid;

-- Loyalty balance: redeemed points can never exceed the points earned.
alter table public.loyalty_points
  add constraint loyalty_points_total_points_non_negative
  check (total_points >= 0) not valid,
  add constraint loyalty_points_redeemed_points_non_negative
  check (redeemed_points >= 0) not valid,
  add constraint loyalty_points_redeemed_within_total
  check (redeemed_points <= total_points) not valid;

-- Loyalty ledger sign rule: an earned row adds points (positive), a redeemed
-- row removes them (negative). A zero-point row is never valid.
-- The sign convention is a decision. The schema does not document it. If the
-- redeem flow stores magnitudes instead, this check must change before that flow ships.
alter table public.loyalty_transactions
  add constraint loyalty_transactions_points_amount_matches_type
  check (
    (transaction_type = 'earned' and points_amount > 0)
    or (transaction_type = 'redeemed' and points_amount < 0)
  ) not valid;
