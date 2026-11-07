-- DATA-03: chain-wide menu categories.
-- One concern: the public.menu_categories table.
--
-- The menu is chain-wide (DATA-18 is single-store), so categories have no location column.
-- A category is on the public menu while is_visible is true and archived_at is NULL. Rows
-- are never deleted: archived_at is the soft delete, so anything that references a category
-- stays valid. New categories start hidden (is_visible false) until they are published,
-- the same explicit-publish choice as rewards.is_active.
--
-- translations is reserved for fr-CA (Q-A2-01) and is not populated. When used it holds an
-- object keyed by locale, for example {"fr-CA": {"name": "...", "description": "..."}}.
--
-- The legacy public.products table is not touched: orders and order_items still use it.
--
-- Categories are managed through migrations or, later, CMS RPCs (CMS-01). API roles (anon,
-- authenticated, service_role) get SELECT only.
--
-- Forward-only: no existing migration is edited.

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_path text,
  sort_order integer not null default 0,
  is_visible boolean not null default false,
  translations jsonb,
  archived_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint menu_categories_translations_is_object
    check (translations is null or jsonb_typeof(translations) = 'object')
);

comment on table public.menu_categories is
  'Chain-wide menu categories. Shown publicly while is_visible and not archived; archived_at is the soft delete.';
comment on column public.menu_categories.translations is
  'Reserved for fr-CA, not populated: {"fr-CA": {"name": "...", "description": "..."}}';

-- RLS: anyone sees published categories, staff see every category. No write policy.
alter table public.menu_categories enable row level security;

create policy "Anyone can view visible categories"
  on public.menu_categories
  for select
  to anon, authenticated
  using (is_visible and archived_at is null);

create policy "Staff can view all categories"
  on public.menu_categories
  for select
  to authenticated
  using ((select public.is_staff()));

revoke all on public.menu_categories from anon, authenticated, service_role;
grant select on public.menu_categories to anon, authenticated, service_role;
