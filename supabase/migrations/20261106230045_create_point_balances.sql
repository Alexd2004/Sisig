-- DATA-04: point balances.
-- One concern: the public.point_balances table.
--
-- One chain-wide balance per member: points earned at one store can be redeemed at
-- another, so there is no location column. The balance is maintained from the ledger by
-- the LOY-01/03/04 RPCs (security definer); this migration adds no maintenance trigger.
-- A member's balance row is deleted with their profile.
--
-- API roles get SELECT only: no client or service_role insert, update or delete grants.
--
-- Forward-only: no existing migration is edited.

create table public.point_balances (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0,
  lifetime_earned integer not null default 0,
  lifetime_redeemed integer not null default 0,
  last_activity_at timestamp with time zone,
  updated_at timestamp with time zone not null default now(),
  constraint point_balances_balance_non_negative check (balance >= 0),
  constraint point_balances_lifetime_earned_non_negative check (lifetime_earned >= 0),
  constraint point_balances_lifetime_redeemed_non_negative check (lifetime_redeemed >= 0)
);

comment on table public.point_balances is
  'One chain-wide points balance per member, maintained from points_ledger by the LOY RPCs';

-- RLS: members read their own balance, staff read all. No write policy.
alter table public.point_balances enable row level security;

create policy "Members can view their own balance"
  on public.point_balances
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Staff can view all balances"
  on public.point_balances
  for select
  to authenticated
  using ((select public.is_staff()));

revoke all on public.point_balances from anon, authenticated, service_role;
grant select on public.point_balances to authenticated, service_role;
