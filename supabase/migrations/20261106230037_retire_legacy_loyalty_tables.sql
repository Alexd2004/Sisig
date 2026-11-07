-- DATA-04: retire the legacy loyalty tables.
-- One concern: remove public.loyalty_transactions and public.loyalty_points.
--
-- Product-owner decision: the legacy balance table and transaction log are dropped, not
-- migrated. DATA-04 replaces them with an append-only points_ledger and a point_balances
-- table (later migrations). No client code reads either legacy table.
--
-- Dropping the tables also removes their policies, indexes and checks: the
-- loyalty_points_* checks from 20261104180526_money_points_checks.sql and the sign check
-- from 20261104180530_loyalty_transactions_sign_check.sql. Those migrations stay as history.
--
-- Data loss: every row in both tables is deleted. Run the row-count audit in the PR
-- description against each shared environment before this migration is applied there.
--
-- Forward-only: no existing migration is edited.

drop table public.loyalty_transactions;
drop table public.loyalty_points;
