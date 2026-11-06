-- DATA-04: versioned loyalty settings.
-- One concern: the public.loyalty_settings table, its enums and its baseline version.
--
-- Each row is one version of the programme rules, in effect from effective_from until the
-- next version starts. A new version is added by a new migration; rows are not edited.
-- public.current_loyalty_settings(at) (next migration) returns the version in effect at a
-- given time.
--
-- The baseline row starts at -infinity, so every timestamp has a version. Its values are
-- PLACEHOLDERS until the client signs off the programme rules (LOY-06): is_placeholder is
-- true and the label says so. They reach every environment this migration is applied to.
--
-- API roles can read the settings but cannot write them.
--
-- Forward-only: no existing migration is edited.

create type public.loyalty_rounding_mode as enum ('down', 'nearest', 'up');
create type public.loyalty_earn_base as enum ('pre_tax_subtotal', 'post_tax_total');
create type public.loyalty_expiry_policy as enum ('none', 'inactivity');

create table public.loyalty_settings (
  id uuid primary key default gen_random_uuid(),
  effective_from timestamp with time zone not null,
  label text not null,
  is_placeholder boolean not null default false,
  points_per_dollar numeric(10, 4) not null,
  rounding_mode public.loyalty_rounding_mode not null default 'down',
  earn_base public.loyalty_earn_base not null default 'pre_tax_subtotal',
  min_spend_cents integer not null default 0,
  max_points_per_transaction integer,
  daily_points_cap integer,
  daily_receipt_claims_cap integer,
  purchase_age_limit_days integer not null,
  signup_bonus_points integer not null default 0,
  expiry_policy public.loyalty_expiry_policy not null default 'none',
  inactivity_months integer,
  expiry_warning_days integer[] not null default '{}',
  redemption_code_ttl_minutes integer not null,
  multipliers jsonb not null default '{}',
  created_at timestamp with time zone not null default now(),
  constraint loyalty_settings_effective_from_key unique (effective_from)
);

comment on table public.loyalty_settings is
  'Versioned loyalty rules. Versions are added by new migrations; the -infinity baseline covers every timestamp. Values are placeholders until client sign-off (LOY-06).';

-- Baseline version: placeholder values pending client sign-off.
insert into public.loyalty_settings (
  effective_from, label, is_placeholder, points_per_dollar, rounding_mode, earn_base,
  min_spend_cents, max_points_per_transaction, daily_points_cap, daily_receipt_claims_cap,
  purchase_age_limit_days, signup_bonus_points, expiry_policy, inactivity_months,
  expiry_warning_days, redemption_code_ttl_minutes, multipliers
) values (
  '-infinity',
  'PLACEHOLDER pending client sign-off: 1 pt per $1 pre-tax subtotal, round down, 200/day cap, 25 signup bonus, no expiry, 14-day purchase age',
  true, 1, 'down', 'pre_tax_subtotal',
  0, null, 200, null,
  14, 25, 'none', null,
  '{}', 15, '{}'
);

-- RLS: everyone may read the rules. No write policy, so clients cannot write.
alter table public.loyalty_settings enable row level security;

create policy "Anyone can view loyalty settings"
  on public.loyalty_settings
  for select
  to anon, authenticated
  using (true);

revoke all on public.loyalty_settings from anon, authenticated, service_role;
grant select on public.loyalty_settings to anon, authenticated, service_role;
