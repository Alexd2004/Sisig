-- pgTAP tests for public.locations (DATA-18, single store).
-- Tests 6-7 read the placeholder store from supabase/seed.sql. This file inserts nothing.

begin;
select plan(7);

-- Test 1: the columns.
select columns_are(
  'public', 'locations',
  array[
    'id',
    'name',
    'address',
    'latitude',
    'longitude',
    'timezone',
    'phone_e164',
    'hours',
    'pickup_lead_time_minutes',
    'uber_eats_url',
    'pos_type',
    'pos_location_id',
    'ordering_enabled',
    'created_at',
    'updated_at'
  ],
  'locations has the expected columns'
);

-- Test 2: stores default to Edmonton time.
select col_default_is('public', 'locations', 'timezone', 'America/Edmonton', 'timezone defaults to America/Edmonton');

-- Tests 3-4: the POS type enum.
select col_type_is('public', 'locations', 'pos_type', 'public', 'pos_type', 'pos_type column uses the public.pos_type enum');

select enum_has_labels(
  'public'::name,
  'pos_type'::name,
  array['square', 'toast'],
  'pos_type enum has square and toast'
);

-- Test 5: read-only policy set.
select policies_are(
  'public', 'locations',
  array['Anyone can view locations'],
  'locations has a single read policy'
);

-- Tests 6-7: the seed adds exactly one clearly labelled placeholder Edmonton store.
select is(
  (select count(*)::int from public.locations),
  1,
  'the seed adds exactly one store'
);

select ok(
  (select name like 'PLACEHOLDER%'
          and address like '%Edmonton%'
          and timezone = 'America/Edmonton'
          and ordering_enabled = false
     from public.locations
    where id = '10ca7100-0000-4000-8000-000000000001'),
  'the seeded store is a labelled PLACEHOLDER in Edmonton with ordering off'
);

select * from finish();
rollback;
