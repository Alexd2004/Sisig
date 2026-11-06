-- DATA-18 (slim): store locations.
-- One concern: the public.locations table and its POS type enum.
--
-- Sisig runs one store for now, so this is the single-location slice of DATA-18: a store
-- record that the points ledger can reference (location_id) and that ordering can read
-- (hours, pickup lead time, Uber Eats link, POS identifiers, ordering switch).
-- Deferred: per-location staff RLS (DATA-18 AC4) and per-location settings with a chain
-- fallback (DATA-18 AC5). location_id on orders and receipts belongs to DATA-06/07.
--
-- No real store data is added here. supabase/seed.sql adds one placeholder store for local
-- development; real values come from the client.
--
-- API roles (anon, authenticated, service_role) get SELECT only. Store data is changed by
-- migrations or, later, admin RPCs.
--
-- Forward-only: no existing migration is edited.

create type public.pos_type as enum ('square', 'toast');

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  timezone text not null default 'America/Edmonton',
  phone_e164 text,
  hours jsonb not null default '{}',
  pickup_lead_time_minutes integer not null default 15,
  uber_eats_url text,
  pos_type public.pos_type,
  pos_location_id text,
  ordering_enabled boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint locations_phone_e164_format
    check (phone_e164 is null or phone_e164 ~ '^\+[1-9]\d{1,14}$')
);

comment on table public.locations is
  'Store locations. One store for now; per-location staff RLS and per-location settings are deferred (DATA-18 AC4/AC5).';
comment on column public.locations.hours is
  'Opening hours in the store''s time zone: {"mon":[{"open":"HH:MM","close":"HH:MM"}],...}';

-- RLS: store details are public. No write policy.
alter table public.locations enable row level security;

create policy "Anyone can view locations"
  on public.locations
  for select
  to anon, authenticated
  using (true);

revoke all on public.locations from anon, authenticated, service_role;
grant select on public.locations to anon, authenticated, service_role;
