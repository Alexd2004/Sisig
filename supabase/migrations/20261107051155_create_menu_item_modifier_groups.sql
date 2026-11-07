-- DATA-03: link menu items to shared modifier groups.
-- One concern: the public.menu_item_modifier_groups join table, and the public read
-- policy of modifier_groups that depends on it.
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

-- RLS: anyone sees the links of items they can see (listed items: not archived, in a
-- visible, non-archived category); staff see every link. The item subquery applies the
-- menu_items policies, which do not read this table. No write policy.
alter table public.menu_item_modifier_groups enable row level security;

create policy "Anyone can view links of listed items"
  on public.menu_item_modifier_groups
  for select
  to anon, authenticated
  using (
    exists (
      select 1
        from public.menu_items i
       where i.id = menu_item_modifier_groups.menu_item_id
    )
  );

create policy "Staff can view all menu item modifier groups"
  on public.menu_item_modifier_groups
  for select
  to authenticated
  using ((select public.is_staff()));

-- The public read policy of public.modifier_groups lives here because it needs this
-- table: a non-archived group is public while it is linked to at least one listed item.
-- The link subquery applies the policies above, which read menu_items, whose policies read
-- menu_categories; none of them read modifier_groups, so there is no recursion.
create policy "Anyone can view listed modifier groups"
  on public.modifier_groups
  for select
  to anon, authenticated
  using (
    archived_at is null
    and exists (
      select 1
        from public.menu_item_modifier_groups l
       where l.modifier_group_id = modifier_groups.id
    )
  );

revoke all on public.menu_item_modifier_groups from anon, authenticated, service_role;
grant select on public.menu_item_modifier_groups to anon, authenticated, service_role;
