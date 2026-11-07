-- DATA-03: modifier options (for example Mild, Add egg).
-- One concern: the public.modifier_options table.
--
-- Each option belongs to one modifier group. price_delta_cents is added to the item price
-- in integer cents and cannot be negative (no discount options for now). is_available is
-- the sold-out toggle and is independent of archived_at, the soft delete.
--
-- POS mapping: pos_provider (public.pos_type) is stored next to pos_external_id so the
-- pair can be unique across providers, as on menu_items. Both are set or both are NULL.
-- translations is reserved for fr-CA (Q-A2-01) and is not populated.
--
-- API roles (anon, authenticated, service_role) get SELECT only.
--
-- Forward-only: no existing migration is edited.

create table public.modifier_options (
  id uuid primary key default gen_random_uuid(),
  modifier_group_id uuid not null references public.modifier_groups(id) on delete restrict,
  name text not null,
  price_delta_cents integer not null default 0,
  is_default boolean not null default false,
  is_available boolean not null default true,
  pos_provider public.pos_type,
  pos_external_id text,
  sort_order integer not null default 0,
  translations jsonb,
  archived_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint modifier_options_price_delta_cents_non_negative check (price_delta_cents >= 0),
  constraint modifier_options_pos_identity_complete
    check ((pos_provider is null) = (pos_external_id is null)),
  constraint modifier_options_pos_provider_pos_external_id_key unique (pos_provider, pos_external_id),
  constraint modifier_options_translations_is_object
    check (translations is null or jsonb_typeof(translations) = 'object')
);

-- Options of a group in menu order.
create index idx_modifier_options_modifier_group_id_sort_order
  on public.modifier_options (modifier_group_id, sort_order);

comment on table public.modifier_options is
  'Options of a modifier group. archived_at is the soft delete; is_available is the sold-out toggle.';
comment on column public.modifier_options.price_delta_cents is
  'Added to the item price, in integer cents; never negative';
comment on column public.modifier_options.translations is
  'Reserved for fr-CA, not populated: {"fr-CA": {"name": "..."}}';

-- RLS: anyone sees non-archived options (sold-out included) of groups they can see, staff
-- see every option. The group subquery applies the modifier_groups policies, which do not
-- read modifier_options, so there is no recursion. No write policy.
alter table public.modifier_options enable row level security;

create policy "Anyone can view listed modifier options"
  on public.modifier_options
  for select
  to anon, authenticated
  using (
    archived_at is null
    and exists (
      select 1
        from public.modifier_groups g
       where g.id = modifier_options.modifier_group_id
    )
  );

create policy "Staff can view all modifier options"
  on public.modifier_options
  for select
  to authenticated
  using ((select public.is_staff()));

revoke all on public.modifier_options from anon, authenticated, service_role;
grant select on public.modifier_options to anon, authenticated, service_role;
