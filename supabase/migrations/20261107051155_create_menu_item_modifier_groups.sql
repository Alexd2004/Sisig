-- DATA-03: link menu items to shared modifier groups.
-- One concern: the public.menu_item_modifier_groups join table.
--
-- A shared group (for example Add egg, Extra rice) is defined once in
-- public.modifier_groups and linked to each item here. sort_order orders the groups on an
-- item. Both foreign keys use on delete restrict: items and groups are removed by
-- archiving them, not by deleting rows.
--
-- API roles (anon, authenticated, service_role) get SELECT only.
--
-- Forward-only: no existing migration is edited.

create table public.menu_item_modifier_groups (
  menu_item_id uuid not null references public.menu_items(id) on delete restrict,
  modifier_group_id uuid not null references public.modifier_groups(id) on delete restrict,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  primary key (menu_item_id, modifier_group_id)
);

-- Items that use a group. menu_item_id is covered by the primary key.
create index idx_menu_item_modifier_groups_modifier_group_id
  on public.menu_item_modifier_groups (modifier_group_id);

comment on table public.menu_item_modifier_groups is
  'Links items to shared modifier groups; sort_order orders the groups on an item.';

-- RLS: link rows hold only id pairs and a sort order; both ends are protected by their own
-- tables' policies. No write policy.
alter table public.menu_item_modifier_groups enable row level security;

create policy "Anyone can view menu item modifier groups"
  on public.menu_item_modifier_groups
  for select
  to anon, authenticated
  using (true);

revoke all on public.menu_item_modifier_groups from anon, authenticated, service_role;
grant select on public.menu_item_modifier_groups to anon, authenticated, service_role;
