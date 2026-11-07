-- PLAT-06: remote config, kill switches and the forced-update gate.
-- One concern: the public.app_config table, its policies and its baseline rows.
--
-- The restaurant needs to switch off ordering or receipt scanning at once (for example
-- during a POS outage) and to force outdated apps to update, without shipping a build.
-- Each row is one setting: a snake_case key and a JSON value. The app reads every row on
-- launch and on foreground, validates each value, and falls back to its bundled default
-- for any value it cannot use. The set of keys is deliberately open: a newer app version
-- can read a key that an older one ignores.
--
-- The baseline rows below are fail-open: ordering and receipt scanning on, every minimum
-- and recommended version 0.0.0 (nothing is blocked). The app bundles the same values.
-- They reach every environment this migration is applied to, so they live here rather
-- than in seed.sql. No existing data is touched.
--
-- Everyone (anon included) may read the config, because the app needs it before sign-in.
-- Only admins and owners (public.is_admin(), read from the JWT) may write it through the
-- API. Until the admin UI exists, values are changed with SQL as described in
-- docs/runbooks/remote-config.md.
--
-- Forward-only: no existing migration is edited.

create table public.app_config (
  key text primary key,
  value jsonb not null,
  description text not null,
  updated_at timestamp with time zone not null default now(),
  constraint app_config_key_format check (key ~ '^[a-z][a-z0-9_]*$')
);

comment on table public.app_config is
  'Remote config read by the apps (PLAT-06). One row per key; values are JSON. Readable by everyone, writable only by admins. See docs/runbooks/remote-config.md.';
comment on column public.app_config.value is
  'JSON value. The app validates each key and uses its bundled default when a value is missing or malformed. Strings must be JSON strings, for example ''"1.2.0"''::jsonb.';
comment on column public.app_config.updated_at is
  'Not maintained by a trigger: set it to now() in the same UPDATE.';

-- Baseline: fail-open values, identical to the defaults bundled in the app.
insert into public.app_config (key, value, description) values
  ('ordering_enabled', 'true',
   'Kill switch for pickup ordering. false hides ordering in the app and shows ordering_paused_message.'),
  ('ordering_paused_message', 'null',
   'Message shown while ordering is off (string, at most 280 characters). null uses the app''s default text.'),
  ('receipt_scan_enabled', 'true',
   'Kill switch for receipt scanning.'),
  ('uber_eats_url', 'null',
   'https link on ubereats.com to the store page, or null.'),
  ('min_supported_version_ios', '"0.0.0"',
   'Lowest iOS app version (x.y.z) that may run. Older installs see a blocking update screen.'),
  ('min_supported_version_android', '"0.0.0"',
   'Lowest Android app version (x.y.z) that may run. Older installs see a blocking update screen.'),
  ('recommended_version', '"0.0.0"',
   'Installs older than this version (x.y.z) see a dismissible update banner, at most once a day.'),
  ('store_url_ios', 'null',
   'https link on apps.apple.com to the App Store listing, or null. Required before raising min_supported_version_ios.'),
  ('store_url_android', '"https://play.google.com/store/apps/details?id=com.sisig.mobile"',
   'https link on play.google.com to the Google Play listing, or null. Required before raising min_supported_version_android.'),
  ('announcement_message', 'null',
   'Announcement banner shown on the Home tab (string, at most 280 characters), or null for none.');

-- RLS: everyone may read; only admins may write.
alter table public.app_config enable row level security;

create policy "Anyone can view app config"
  on public.app_config
  for select
  to anon, authenticated
  using (true);

create policy "Admins can insert app config"
  on public.app_config
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update app config"
  on public.app_config
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete app config"
  on public.app_config
  for delete
  to authenticated
  using ((select public.is_admin()));

revoke all on public.app_config from anon, authenticated, service_role;
grant select on public.app_config to anon, authenticated, service_role;
grant insert, update, delete on public.app_config to authenticated;
