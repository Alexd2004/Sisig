-- DATA-04: reward redemptions.
-- One concern: the public.reward_redemptions table and its status and channel enums.
--
-- A redemption is issued with a short code that staff look up at the counter or pickup.
-- It spends points through one points_ledger entry (ledger_entry_id). The redemption RPC
-- (LOY-03) creates rows and moves them through issued, fulfilled, cancelled or expired;
-- this migration stores them and adds no state rules.
--
-- code is unique among issued redemptions, so a live code always finds one redemption.
-- A code can be reused once its redemption is no longer issued.
-- (user_id, idempotency_key) is unique so a retried redemption request cannot issue twice.
-- order_id links a pickup redemption to its order. It references the legacy orders table,
-- which DATA-06 must keep or migrate.
-- Deleting a member's profile sets user_id to NULL and keeps the redemption.
--
-- API roles get SELECT only: no client or service_role insert, update or delete grants.
--
-- Forward-only: no existing migration is edited.

create type public.redemption_status as enum ('issued', 'fulfilled', 'cancelled', 'expired');
create type public.redemption_channel as enum ('counter', 'pickup');

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  reward_id uuid not null references public.rewards(id) on delete restrict,
  points_spent integer not null,
  ledger_entry_id uuid not null references public.points_ledger(id) on delete restrict,
  code text not null,
  status public.redemption_status not null default 'issued',
  expires_at timestamp with time zone not null,
  fulfilled_at timestamp with time zone,
  fulfilled_by uuid references public.profiles(id) on delete set null,
  channel public.redemption_channel not null,
  order_id uuid references public.orders(id) on delete set null,
  idempotency_key text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint reward_redemptions_points_spent_positive check (points_spent > 0),
  constraint reward_redemptions_user_id_idempotency_key_key unique (user_id, idempotency_key)
);

-- Staff code lookup.
create index idx_reward_redemptions_code on public.reward_redemptions (code);

-- Foreign keys that every profile deletion (AUTH-05) follows: deleting a profile deletes
-- its orders and sets order_id and fulfilled_by to NULL here. Without these indexes each
-- of those actions scans the table. user_id is covered by the
-- (user_id, idempotency_key) unique index.
create index idx_reward_redemptions_order_id on public.reward_redemptions (order_id);
create index idx_reward_redemptions_fulfilled_by on public.reward_redemptions (fulfilled_by);

-- A code is unique among issued redemptions.
create unique index idx_reward_redemptions_code_issued
  on public.reward_redemptions (code)
  where status = 'issued';

comment on table public.reward_redemptions is
  'Reward redemptions. code is unique among issued redemptions; state changes are LOY-03 RPC work.';
comment on column public.reward_redemptions.idempotency_key is
  'Unique per member. Must not embed user_id, email, phone or other member identifiers: the row outlives the member, whose deletion only sets user_id to NULL';

-- RLS: members read their own redemptions, staff read all. No write policy.
alter table public.reward_redemptions enable row level security;

create policy "Members can view their own redemptions"
  on public.reward_redemptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Staff can view all redemptions"
  on public.reward_redemptions
  for select
  to authenticated
  using ((select public.is_staff()));

revoke all on public.reward_redemptions from anon, authenticated, service_role;
grant select on public.reward_redemptions to authenticated, service_role;
