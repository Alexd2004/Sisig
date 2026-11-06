-- DATA-04: rewards catalogue.
-- One concern: the public.rewards table.
--
-- A reward costs point_cost points. It is shown to members while it is active, not
-- archived and inside its optional starts_at/ends_at window. menu_item_id optionally links
-- the reward to the menu item it gives away. Stock and per-user limits are stored here and
-- enforced by the redemption RPC (LOY-03), not by this migration.
--
-- Rewards are managed by staff tools through migrations or RPCs (ADM work); API roles get
-- SELECT only.
--
-- Forward-only: no existing migration is edited.

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_path text,
  point_cost integer not null,
  is_active boolean not null default false,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  stock integer,
  per_user_limit integer,
  menu_item_id uuid references public.products(id) on delete restrict,
  sort_order integer not null default 0,
  archived_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint rewards_point_cost_positive check (point_cost > 0)
);

comment on table public.rewards is 'Rewards members can redeem with points';
comment on column public.rewards.menu_item_id is 'Menu item this reward gives away, if any';

-- RLS: anyone sees the live catalogue, staff see every reward. No write policy.
alter table public.rewards enable row level security;

create policy "Anyone can view active rewards"
  on public.rewards
  for select
  to anon, authenticated
  using (
    is_active
    and archived_at is null
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

create policy "Staff can view all rewards"
  on public.rewards
  for select
  to authenticated
  using ((select public.is_staff()));

revoke all on public.rewards from anon, authenticated;
grant select on public.rewards to anon, authenticated;
