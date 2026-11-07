-- DATA-03: chain-wide menu items.
-- One concern: the public.menu_items table.
--
-- Each item belongs to one category. Two independent flags control what customers see:
--   - archived_at is the soft delete. An archived item leaves the public menu but its row
--     stays, so past references remain valid.
--   - is_available is the sold-out toggle. A sold-out item stays on the public menu with
--     is_available false, so clients can show it as sold out.
-- An item is also hidden from the public when its category is hidden or archived.
--
-- Prices are integer cents (CAD), never floats, and cannot be negative. A price can be
-- changed at any time: orders keep their own copy (order_items.unit_price is the price at
-- the time of the order), and order_items does not reference menu_items yet (DATA-06).
--
-- Availability window (optional): available_days lists ISO weekdays (1 = Monday ...
-- 7 = Sunday; NULL = every day). available_from and available_until are a same-day window
-- in the ordering store's local time (locations.timezone; NULL = all day). The window is
-- data for clients and for order placement; public.menu_public returns it and does not
-- filter by the current time.
--
-- POS mapping: pos_provider reuses public.pos_type. A (pos_provider, pos_external_id) pair
-- is unique across all rows, archived ones included, and both columns are set or both NULL.
--
-- dietary_tags are free-form lowercase tags (for example spicy, contains-pork).
-- translations is reserved for fr-CA (Q-A2-01) and is not populated.
--
-- API roles (anon, authenticated, service_role) get SELECT only.
--
-- Forward-only: no existing migration is edited.

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id) on delete restrict,
  name text not null,
  description text,
  price_cents integer not null,
  image_path text,
  is_available boolean not null default true,
  is_featured boolean not null default false,
  dietary_tags text[] not null default '{}',
  allergen_note text,
  available_days smallint[],
  available_from time,
  available_until time,
  pos_provider public.pos_type,
  pos_external_id text,
  sort_order integer not null default 0,
  translations jsonb,
  archived_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint menu_items_price_cents_non_negative check (price_cents >= 0),
  constraint menu_items_pos_identity_complete
    check ((pos_provider is null) = (pos_external_id is null)),
  constraint menu_items_pos_provider_pos_external_id_key unique (pos_provider, pos_external_id),
  constraint menu_items_available_days_valid
    check (
      available_days is null
      or (cardinality(available_days) > 0
          and available_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[])
    ),
  constraint menu_items_available_window_complete
    check ((available_from is null) = (available_until is null)),
  constraint menu_items_available_window_order
    check (available_from is null or available_from < available_until),
  constraint menu_items_translations_is_object
    check (translations is null or jsonb_typeof(translations) = 'object')
);

-- Items of a category in menu order.
create index idx_menu_items_category_id_sort_order on public.menu_items (category_id, sort_order);

comment on table public.menu_items is
  'Chain-wide menu items. archived_at is the soft delete; is_available is the sold-out toggle, independent of archiving.';
comment on column public.menu_items.price_cents is 'Price in integer cents (CAD), never negative';
comment on column public.menu_items.is_available is
  'Sold-out toggle. Sold-out items stay on the public menu with this flag false';
comment on column public.menu_items.available_days is
  'ISO weekdays the item is offered (1 = Monday ... 7 = Sunday); NULL = every day';
comment on column public.menu_items.available_from is
  'Start of the daily window in the store''s local time; NULL = all day';
comment on column public.menu_items.available_until is
  'End of the daily window (exclusive) in the store''s local time; NULL = all day';
comment on column public.menu_items.pos_external_id is
  'Item id in the POS named by pos_provider; the pair is unique';
comment on column public.menu_items.translations is
  'Reserved for fr-CA, not populated: {"fr-CA": {"name": "...", "description": "..."}}';

-- RLS: anyone sees non-archived items of published categories (sold-out included), staff
-- see every item. The category subquery does not recurse: the menu_categories policies do
-- not read menu_items. No write policy.
alter table public.menu_items enable row level security;

create policy "Anyone can view listed menu items"
  on public.menu_items
  for select
  to anon, authenticated
  using (
    archived_at is null
    and exists (
      select 1
        from public.menu_categories c
       where c.id = menu_items.category_id
         and c.is_visible
         and c.archived_at is null
    )
  );

create policy "Staff can view all menu items"
  on public.menu_items
  for select
  to authenticated
  using ((select public.is_staff()));

revoke all on public.menu_items from anon, authenticated, service_role;
grant select on public.menu_items to anon, authenticated, service_role;
