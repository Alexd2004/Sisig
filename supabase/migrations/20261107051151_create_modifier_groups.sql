-- DATA-03: modifier groups (for example Spice level, Add-ons).
-- One concern: the public.modifier_groups table.
--
-- A group is defined once and shared by any number of items through
-- public.menu_item_modifier_groups (a later migration). A customer picks between min_select
-- and max_select options; min_select cannot exceed max_select. is_required is stored as
-- its own flag for clients and is not derived from min_select.
--
-- archived_at is the soft delete: an archived group leaves the public menu and its row
-- stays. translations is reserved for fr-CA (Q-A2-01) and is not populated.
--
-- API roles (anon, authenticated, service_role) get SELECT only.
--
-- Forward-only: no existing migration is edited.

create table public.modifier_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_select integer not null default 0,
  max_select integer not null default 1,
  is_required boolean not null default false,
  translations jsonb,
  archived_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint modifier_groups_min_select_non_negative check (min_select >= 0),
  constraint modifier_groups_max_select_positive check (max_select >= 1),
  constraint modifier_groups_min_select_within_max check (min_select <= max_select),
  constraint modifier_groups_translations_is_object
    check (translations is null or jsonb_typeof(translations) = 'object')
);

comment on table public.modifier_groups is
  'Shared modifier groups, defined once and linked to items through menu_item_modifier_groups. archived_at is the soft delete.';
comment on column public.modifier_groups.translations is
  'Reserved for fr-CA, not populated: {"fr-CA": {"name": "..."}}';

-- RLS: anyone sees non-archived groups, staff see every group. No write policy.
alter table public.modifier_groups enable row level security;

create policy "Anyone can view active modifier groups"
  on public.modifier_groups
  for select
  to anon, authenticated
  using (archived_at is null);

create policy "Staff can view all modifier groups"
  on public.modifier_groups
  for select
  to authenticated
  using ((select public.is_staff()));

revoke all on public.modifier_groups from anon, authenticated, service_role;
grant select on public.modifier_groups to anon, authenticated, service_role;
