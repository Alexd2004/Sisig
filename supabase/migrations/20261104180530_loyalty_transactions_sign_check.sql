-- Loyalty ledger sign rule: each loyalty_transactions row must agree with its type.
-- One concern: loyalty ledger sign

-- Convention (decided): an earned row adds points, so points_amount > 0.
-- A redeemed row removes points, so points_amount < 0. A zero-point row is never valid.
-- A future writer that records earned points for an order must skip orders where
-- points_earned = 0, because this check rejects a zero-point earned row.

-- NOT VALID for the same reason as the money and points checks: existing rows are not
-- scanned, and new and updated rows are checked. VALIDATE CONSTRAINT is deliberately NOT
-- run here. A later migration validates it once the existing data has been cleaned.
-- Run the ledger audit query in the PR description and fix every offending row before
-- this migration is applied to a shared environment.
alter table public.loyalty_transactions
  add constraint loyalty_transactions_points_amount_matches_type
  check (
    (transaction_type = 'earned' and points_amount > 0)
    or (transaction_type = 'redeemed' and points_amount < 0)
  ) not valid;
