-- DATA-04: append-only points ledger.
-- One concern: the public.points_ledger table, its source enum and its append-only guard.
--
-- Every change to a member's points is one ledger row. Rows are never updated or deleted,
-- by any role, service_role and the table owner included. A mistake is corrected with a
-- new 'reversal' row that points at the original through reversal_of.
--
-- The only change allowed is the AUTH-05 anonymisation path: deleting a member's profile
-- sets user_id to NULL through the foreign key (on delete set null), and nothing else in
-- the row changes. The guard trigger allows exactly that update, and only when it comes
-- from the foreign key action (pg_trigger_depth() > 1). A direct
-- "update ... set user_id = null" is rejected like any other update.
--
-- Sources:
--   in-store, location_id required: pos_purchase, qr_counter, receipt
--   chain-level, location_id optional: signup_bonus, offer_bonus, expiry, admin_adjust,
--     reward_redeem, redemption_refund, reversal
-- Balances are chain-wide: points earned at one store can be redeemed at another.
--
-- Posting, sign rules and reversal logic are LOY-01/03/04 work (security definer RPCs).
-- API roles get SELECT only. TRUNCATE is revoked from them; the table owner can still
-- truncate (see the PR notes).
--
-- Forward-only: no existing migration is edited.

create type public.points_source_type as enum (
  'pos_purchase',
  'qr_counter',
  'receipt',
  'admin_adjust',
  'reward_redeem',
  'redemption_refund',
  'offer_bonus',
  'expiry',
  'reversal',
  'signup_bonus'
);

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  location_id uuid references public.locations(id) on delete restrict,
  delta integer not null,
  source_type public.points_source_type not null,
  source_id text,
  idempotency_key text not null,
  reversal_of uuid references public.points_ledger(id) on delete restrict,
  reason text,
  settings_version_id uuid references public.loyalty_settings(id) on delete restrict,
  metadata jsonb not null default '{}',
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  constraint points_ledger_delta_non_zero check (delta <> 0),
  constraint points_ledger_delta_bounded check (delta between -1000000 and 1000000),
  constraint points_ledger_in_store_requires_location
    check (source_type not in ('pos_purchase', 'qr_counter', 'receipt') or location_id is not null),
  constraint points_ledger_reversal_of_matches_source
    check ((source_type = 'reversal') = (reversal_of is not null)),
  constraint points_ledger_source_type_idempotency_key_key unique (source_type, idempotency_key),
  constraint points_ledger_reversal_of_key unique (reversal_of)
);

-- Member history, newest first, with a stable tie-break for keyset pagination.
create index idx_points_ledger_user_id_created_at_id
  on public.points_ledger (user_id, created_at desc, id desc);

comment on table public.points_ledger is
  'Append-only points ledger. The only allowed change is AUTH-05 anonymisation: deleting the profile sets user_id NULL through the foreign key, and nothing else changes. In-store sources (pos_purchase, qr_counter, receipt) require location_id; chain-level sources (signup_bonus, offer_bonus, expiry, admin_adjust, reward_redeem, redemption_refund, reversal) do not.';
comment on column public.points_ledger.reason is
  'Must not contain personal data: anonymisation clears only user_id';
comment on column public.points_ledger.metadata is
  'No personal data: anonymisation clears only user_id';
comment on column public.points_ledger.created_by is
  'Staff or admin actor, set only for staff/admin actions. No foreign key on purpose, so the row outlives the actor';

-- Append-only guard. Runs as the caller (security invoker).
create or replace function private.points_ledger_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- AUTH-05 anonymisation: the foreign key action sets user_id to NULL and nothing else
  -- changes. pg_trigger_depth() > 1 means the update comes from that action (or another
  -- trigger), not from a statement a client or admin typed.
  if tg_op = 'UPDATE'
    and old.user_id is not null
    and new.user_id is null
    and (to_jsonb(new) - 'user_id') = (to_jsonb(old) - 'user_id')
    and pg_catalog.pg_trigger_depth() > 1
  then
    return new;
  end if;

  raise exception 'points_ledger is append-only: % is not allowed', tg_op
    using errcode = '23001';
end;
$$;

revoke all on function private.points_ledger_guard() from public;

create trigger points_ledger_guard
  before update or delete on public.points_ledger
  for each row execute function private.points_ledger_guard();

-- RLS: members read their own entries, staff read all. No write policy.
alter table public.points_ledger enable row level security;

create policy "Members can view their own ledger entries"
  on public.points_ledger
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Staff can view all ledger entries"
  on public.points_ledger
  for select
  to authenticated
  using ((select public.is_staff()));

-- SELECT only for the API roles. Revoking all also revokes TRUNCATE, which skips triggers.
revoke all on public.points_ledger from anon, authenticated, service_role;
grant select on public.points_ledger to authenticated, service_role;
