-- pgTAP tests for the chain-wide menu (DATA-03 AC1-AC5).
-- Tests 34-37 read the PLACEHOLDER menu from supabase/seed.sql (ids 3e000000-...) before
-- any fixture is added; test 37 is the AC2 timing check on seed data. The other tests use
-- fixtures with ids 12000000-... and names starting with "Test 12", and filter on them, so
-- real menu rows added later do not break them.
-- Runs as postgres. Roles and JWT claims are switched with SET LOCAL inside the
-- transaction, which is rolled back at the end.

begin;
select plan(85);

-- Helpers ------------------------------------------------------------------

-- Act as an authenticated user with the given app_role claim (as the access token hook sets it).
create or replace function pg_temp.act_as(p_uid uuid, p_app_role text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated', 'app_role', p_app_role)::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
end $$;

-- Act as anon: no JWT at all.
create or replace function pg_temp.act_anon()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

-- The ids of a JSON array's elements, in array order, keeping only ids with the given prefix.
create or replace function pg_temp.ids(p_list jsonb, p_prefix text)
returns text[] language sql as $$
  select coalesce(array_agg(t.e ->> 'id' order by t.n), '{}'::text[])
    from jsonb_array_elements(p_list) with ordinality as t(e, n)
   where t.e ->> 'id' like p_prefix || '%'
$$;

-- One category, item or item's modifier group from menu_public, or NULL if it is absent.
create or replace function pg_temp.menu_category(p_id uuid)
returns jsonb language sql as $$
  select t.c
    from jsonb_array_elements(public.menu_public() -> 'categories') as t(c)
   where t.c ->> 'id' = p_id::text
$$;

create or replace function pg_temp.menu_item(p_id uuid)
returns jsonb language sql as $$
  select u.i
    from jsonb_array_elements(public.menu_public() -> 'categories') as t(c)
   cross join lateral jsonb_array_elements(t.c -> 'items') as u(i)
   where u.i ->> 'id' = p_id::text
$$;

create or replace function pg_temp.menu_item_group(p_item uuid, p_group uuid)
returns jsonb language sql as $$
  select v.g
    from jsonb_array_elements(pg_temp.menu_item(p_item) -> 'modifier_groups') as v(g)
   where v.g ->> 'id' = p_group::text
$$;

-- The sorted keys of a JSON object.
create or replace function pg_temp.keys(p_obj jsonb)
returns text[] language sql as $$
  select array_agg(k order by k collate "C") from jsonb_object_keys(p_obj) as k
$$;

-- Tests 1-5: the columns (AC5).
select columns_are(
  'public', 'menu_categories',
  array['id', 'name', 'description', 'image_path', 'sort_order', 'is_visible', 'translations',
        'archived_at', 'created_at', 'updated_at'],
  'menu_categories has the expected columns'
);

select columns_are(
  'public', 'menu_items',
  array['id', 'category_id', 'name', 'description', 'price_cents', 'image_path', 'is_available',
        'is_featured', 'dietary_tags', 'allergen_note', 'available_days', 'available_from',
        'available_until', 'pos_provider', 'pos_external_id', 'sort_order', 'translations',
        'archived_at', 'created_at', 'updated_at'],
  'menu_items has the expected columns'
);

select columns_are(
  'public', 'modifier_groups',
  array['id', 'name', 'min_select', 'max_select', 'is_required', 'translations', 'archived_at',
        'created_at', 'updated_at'],
  'modifier_groups has the expected columns'
);

select columns_are(
  'public', 'modifier_options',
  array['id', 'modifier_group_id', 'name', 'price_delta_cents', 'is_default', 'is_available',
        'pos_provider', 'pos_external_id', 'sort_order', 'translations', 'archived_at',
        'created_at', 'updated_at'],
  'modifier_options has the expected columns'
);

select columns_are(
  'public', 'menu_item_modifier_groups',
  array['menu_item_id', 'modifier_group_id', 'sort_order', 'created_at'],
  'menu_item_modifier_groups has the expected columns'
);

-- Tests 6-9: money is integer cents, tags are a text array, POS ids use the pos_type enum.
select col_type_is('public', 'menu_items', 'price_cents', 'integer', 'price_cents is an integer');
select col_type_is('public', 'modifier_options', 'price_delta_cents', 'integer', 'price_delta_cents is an integer');
select col_type_is('public', 'menu_items', 'dietary_tags', 'text[]', 'dietary_tags is a text array');
select col_type_is('public', 'menu_items', 'pos_provider', 'public', 'pos_type', 'pos_provider uses the public.pos_type enum');

-- Test 10: RLS is on for every menu table.
select is(
  (select count(*)::int
     from pg_class
    where oid in ('public.menu_categories'::regclass, 'public.menu_items'::regclass,
                  'public.modifier_groups'::regclass, 'public.modifier_options'::regclass,
                  'public.menu_item_modifier_groups'::regclass)
      and relrowsecurity),
  5,
  'RLS is enabled on all five menu tables'
);

-- Tests 11-25: every API role can only read the menu tables.
select table_privs_are('public', 'menu_categories', 'anon', array['SELECT']::name[], 'anon can only SELECT menu_categories');
select table_privs_are('public', 'menu_categories', 'authenticated', array['SELECT']::name[], 'authenticated can only SELECT menu_categories');
select table_privs_are('public', 'menu_categories', 'service_role', array['SELECT']::name[], 'service_role can only SELECT menu_categories');
select table_privs_are('public', 'menu_items', 'anon', array['SELECT']::name[], 'anon can only SELECT menu_items');
select table_privs_are('public', 'menu_items', 'authenticated', array['SELECT']::name[], 'authenticated can only SELECT menu_items');
select table_privs_are('public', 'menu_items', 'service_role', array['SELECT']::name[], 'service_role can only SELECT menu_items');
select table_privs_are('public', 'modifier_groups', 'anon', array['SELECT']::name[], 'anon can only SELECT modifier_groups');
select table_privs_are('public', 'modifier_groups', 'authenticated', array['SELECT']::name[], 'authenticated can only SELECT modifier_groups');
select table_privs_are('public', 'modifier_groups', 'service_role', array['SELECT']::name[], 'service_role can only SELECT modifier_groups');
select table_privs_are('public', 'modifier_options', 'anon', array['SELECT']::name[], 'anon can only SELECT modifier_options');
select table_privs_are('public', 'modifier_options', 'authenticated', array['SELECT']::name[], 'authenticated can only SELECT modifier_options');
select table_privs_are('public', 'modifier_options', 'service_role', array['SELECT']::name[], 'service_role can only SELECT modifier_options');
select table_privs_are('public', 'menu_item_modifier_groups', 'anon', array['SELECT']::name[], 'anon can only SELECT menu_item_modifier_groups');
select table_privs_are('public', 'menu_item_modifier_groups', 'authenticated', array['SELECT']::name[], 'authenticated can only SELECT menu_item_modifier_groups');
select table_privs_are('public', 'menu_item_modifier_groups', 'service_role', array['SELECT']::name[], 'service_role can only SELECT menu_item_modifier_groups');

-- Tests 26-30: read-only policy sets.
select policies_are(
  'public', 'menu_categories',
  array['Anyone can view visible categories', 'Staff can view all categories'],
  'menu_categories has the public and staff read policies'
);

select policies_are(
  'public', 'menu_items',
  array['Anyone can view listed menu items', 'Staff can view all menu items'],
  'menu_items has the public and staff read policies'
);

select policies_are(
  'public', 'modifier_groups',
  array['Anyone can view listed modifier groups', 'Staff can view all modifier groups'],
  'modifier_groups has the public and staff read policies'
);

select policies_are(
  'public', 'modifier_options',
  array['Anyone can view listed modifier options', 'Staff can view all modifier options'],
  'modifier_options has the public and staff read policies'
);

select policies_are(
  'public', 'menu_item_modifier_groups',
  array['Anyone can view links of listed items', 'Staff can view all menu item modifier groups'],
  'menu_item_modifier_groups has the public and staff read policies'
);

-- Tests 31-33: menu_public exists, runs as the caller with an empty search_path, and the
-- API roles can call it.
select has_function('public', 'menu_public', array[]::name[], 'menu_public() exists');

select ok(
  (select not p.prosecdef and p.proconfig = array['search_path=""']
     from pg_proc p
    where p.oid = 'public.menu_public()'::regprocedure),
  'menu_public is security invoker with search_path set to empty'
);

select ok(
  has_function_privilege('anon', 'public.menu_public()', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.menu_public()', 'EXECUTE')
  and has_function_privilege('service_role', 'public.menu_public()', 'EXECUTE'),
  'anon, authenticated and service_role can execute menu_public'
);

-- Tests 34-37: the seed. Every seeded menu row is a labelled PLACEHOLDER, the shared group
-- is defined once and linked to several items, and menu_public returns the seed menu.
select is(
  (select count(*)::int from (
     select name from public.menu_categories where id::text like '3e000000-%'
     union all select name from public.menu_items where id::text like '3e000000-%'
     union all select name from public.modifier_groups where id::text like '3e000000-%'
     union all select name from public.modifier_options where id::text like '3e000000-%'
   ) s
   where s.name not like 'PLACEHOLDER%'),
  0,
  'every seeded menu row is labelled PLACEHOLDER'
);

select is(
  (select count(*)::int from public.menu_item_modifier_groups
    where modifier_group_id = '3e000000-0000-4000-8000-000000000301'),
  3,
  'the seeded shared modifier group is linked to three items'
);

set local role anon;
select pg_temp.act_anon();

select is(
  pg_temp.ids(public.menu_public() -> 'categories', '3e000000-'),
  array['3e000000-0000-4000-8000-000000000101', '3e000000-0000-4000-8000-000000000102',
        '3e000000-0000-4000-8000-000000000103'],
  'menu_public returns the seeded categories in sort order'
);

-- AC2: one call, as anon (RLS included), on seed data. The seed menu is small (3
-- categories, 6 items, 1 group, 2 options), so this checks the AC as written, not real
-- menu sizes.
select performs_ok('select public.menu_public()', 100, 'menu_public runs in under 100 ms on seed data');

reset role;

-- Fixtures: plain inserts as postgres, not assertions.
-- Categories: C1 visible (sort 2), C2 visible with no items (sort 1), C3 hidden,
-- C4 visible but archived, C5 with is_visible left to its default.
insert into public.menu_categories (id, name, sort_order, is_visible, archived_at) values
  ('12000000-0000-4000-8000-000000000001', 'Test 12 cat B', 2, true, null),
  ('12000000-0000-4000-8000-000000000002', 'Test 12 cat A', 1, true, null),
  ('12000000-0000-4000-8000-000000000003', 'Test 12 cat hidden', 3, false, null),
  ('12000000-0000-4000-8000-000000000004', 'Test 12 cat archived', 4, true, now());
insert into public.menu_categories (id, name) values
  ('12000000-0000-4000-8000-000000000005', 'Test 12 cat default');

-- Items in C1: I2 (sort 1), I1 (sort 2, POS mapped), I3 (sort 3, sold out), I4 (archived,
-- POS mapped), I5 (sort 5, weekend 10:00-14:00). I6 is in hidden C3, I7 in archived C4.
insert into public.menu_items
  (id, category_id, name, price_cents, sort_order, is_available, archived_at, pos_provider, pos_external_id,
   available_days, available_from, available_until)
values
  ('12000000-0000-4000-8000-000000000011', '12000000-0000-4000-8000-000000000001', 'Test 12 item 1', 1000, 2, true, null, 'square', 'TEST-12-SQ-1', null, null, null),
  ('12000000-0000-4000-8000-000000000012', '12000000-0000-4000-8000-000000000001', 'Test 12 item 2', 1000, 1, true, null, null, null, null, null, null),
  ('12000000-0000-4000-8000-000000000013', '12000000-0000-4000-8000-000000000001', 'Test 12 item 3', 1000, 3, false, null, null, null, null, null, null),
  ('12000000-0000-4000-8000-000000000014', '12000000-0000-4000-8000-000000000001', 'Test 12 item 4', 1000, 4, true, now(), 'toast', 'TEST-12-TO-4', null, null, null),
  ('12000000-0000-4000-8000-000000000015', '12000000-0000-4000-8000-000000000001', 'Test 12 item 5', 1000, 5, true, null, null, null, '{6,7}', '10:00', '14:00'),
  ('12000000-0000-4000-8000-000000000016', '12000000-0000-4000-8000-000000000003', 'Test 12 item 6', 1000, 1, true, null, null, null, null, null, null),
  ('12000000-0000-4000-8000-000000000017', '12000000-0000-4000-8000-000000000004', 'Test 12 item 7', 1000, 1, true, null, null, null, null, null, null);

-- Groups: G1 shared, G2 archived, G3 linked only to I6 (hidden category).
insert into public.modifier_groups (id, name, min_select, max_select, archived_at) values
  ('12000000-0000-4000-8000-000000000021', 'Test 12 group 1', 0, 2, null),
  ('12000000-0000-4000-8000-000000000022', 'Test 12 group 2', 0, 1, now()),
  ('12000000-0000-4000-8000-000000000023', 'Test 12 group 3', 0, 1, null);

-- Options in G1: O2 (sort 1), O1 (sort 2, POS mapped), O3 (sort 3, sold out), O4 (archived).
-- O5 is in G3.
insert into public.modifier_options
  (id, modifier_group_id, name, price_delta_cents, sort_order, is_available, archived_at, pos_provider, pos_external_id)
values
  ('12000000-0000-4000-8000-000000000031', '12000000-0000-4000-8000-000000000021', 'Test 12 option 1', 250, 2, true, null, 'square', 'TEST-12-OPT-1'),
  ('12000000-0000-4000-8000-000000000032', '12000000-0000-4000-8000-000000000021', 'Test 12 option 2', 150, 1, true, null, null, null),
  ('12000000-0000-4000-8000-000000000033', '12000000-0000-4000-8000-000000000021', 'Test 12 option 3', 0, 3, false, null, null, null),
  ('12000000-0000-4000-8000-000000000034', '12000000-0000-4000-8000-000000000021', 'Test 12 option 4', 0, 4, true, now(), null, null),
  ('12000000-0000-4000-8000-000000000035', '12000000-0000-4000-8000-000000000023', 'Test 12 option 5', 0, 1, true, null, null, null);

-- G1 is shared by I1 and I2; archived G2 is linked to I1; G3 is linked to I6 only.
insert into public.menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) values
  ('12000000-0000-4000-8000-000000000011', '12000000-0000-4000-8000-000000000021', 1),
  ('12000000-0000-4000-8000-000000000012', '12000000-0000-4000-8000-000000000021', 1),
  ('12000000-0000-4000-8000-000000000011', '12000000-0000-4000-8000-000000000022', 2),
  ('12000000-0000-4000-8000-000000000016', '12000000-0000-4000-8000-000000000023', 1);

-- Tests 38-51: menu_public as anon (AC2, AC4).
set local role anon;
select pg_temp.act_anon();

select is(
  pg_temp.ids(public.menu_public() -> 'categories', '12000000-'),
  array['12000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000001'],
  'menu_public returns visible, non-archived categories in sort order (hidden, archived and default-hidden left out)'
);

select is(
  pg_temp.menu_category('12000000-0000-4000-8000-000000000002') -> 'items',
  '[]'::jsonb,
  'a visible category with no items is returned with an empty items array'
);

select is(
  pg_temp.ids(pg_temp.menu_category('12000000-0000-4000-8000-000000000001') -> 'items', '12000000-'),
  array['12000000-0000-4000-8000-000000000012', '12000000-0000-4000-8000-000000000011',
        '12000000-0000-4000-8000-000000000013', '12000000-0000-4000-8000-000000000015'],
  'items are in sort order, the archived item is left out and the sold-out item is kept'
);

select is(
  (pg_temp.menu_item('12000000-0000-4000-8000-000000000013') ->> 'is_available')::boolean,
  false,
  'a sold-out item is returned with is_available false'
);

select ok(
  strpos(public.menu_public()::text, '12000000-0000-4000-8000-000000000016') = 0
  and strpos(public.menu_public()::text, '12000000-0000-4000-8000-000000000017') = 0,
  'items in a hidden or archived category are not returned'
);

select is(
  pg_temp.ids(pg_temp.menu_item('12000000-0000-4000-8000-000000000011') -> 'modifier_groups', '12000000-'),
  array['12000000-0000-4000-8000-000000000021'],
  'an archived modifier group is left out of the item'
);

select is(
  pg_temp.ids(pg_temp.menu_item_group('12000000-0000-4000-8000-000000000011', '12000000-0000-4000-8000-000000000021') -> 'options', '12000000-'),
  array['12000000-0000-4000-8000-000000000032', '12000000-0000-4000-8000-000000000031',
        '12000000-0000-4000-8000-000000000033'],
  'options are in sort order, the archived option is left out and the sold-out option is kept'
);

select is(
  (select (o ->> 'is_available')::boolean
     from jsonb_array_elements(pg_temp.menu_item_group('12000000-0000-4000-8000-000000000011', '12000000-0000-4000-8000-000000000021') -> 'options') as t(o)
    where o ->> 'id' = '12000000-0000-4000-8000-000000000033'),
  false,
  'a sold-out option is returned with is_available false'
);

select ok(
  pg_temp.menu_item_group('12000000-0000-4000-8000-000000000011', '12000000-0000-4000-8000-000000000021') is not null
  and pg_temp.menu_item_group('12000000-0000-4000-8000-000000000012', '12000000-0000-4000-8000-000000000021') is not null,
  'one shared modifier group is returned under both items that use it'
);

select is(
  (select jsonb_build_object('days', i -> 'available_days', 'from', i -> 'available_from', 'until', i -> 'available_until')
     from pg_temp.menu_item('12000000-0000-4000-8000-000000000015') as i),
  '{"days": [6, 7], "from": "10:00:00", "until": "14:00:00"}'::jsonb,
  'the availability window is returned, not applied'
);

select is(
  pg_temp.keys(pg_temp.menu_category('12000000-0000-4000-8000-000000000001')),
  array['description', 'id', 'image_path', 'items', 'name', 'translations'],
  'a category has the expected keys'
);

select is(
  pg_temp.keys(pg_temp.menu_item('12000000-0000-4000-8000-000000000011')),
  array['allergen_note', 'available_days', 'available_from', 'available_until', 'description',
        'dietary_tags', 'id', 'image_path', 'is_available', 'is_featured', 'modifier_groups',
        'name', 'price_cents', 'translations'],
  'an item has the expected keys, including is_available'
);

select is(
  pg_temp.keys(pg_temp.menu_item_group('12000000-0000-4000-8000-000000000011', '12000000-0000-4000-8000-000000000021')),
  array['id', 'is_required', 'max_select', 'min_select', 'name', 'options', 'translations'],
  'a modifier group has the expected keys'
);

select is(
  pg_temp.keys(
    pg_temp.menu_item_group('12000000-0000-4000-8000-000000000011', '12000000-0000-4000-8000-000000000021') -> 'options' -> 0
  ),
  array['id', 'is_available', 'is_default', 'name', 'price_delta_cents', 'translations'],
  'a modifier option has the expected keys'
);

-- Tests 52-56: direct table reads as anon follow the same rules.
select results_eq(
  $$select id from public.menu_categories where name like 'Test 12%' order by sort_order$$,
  $$values ('12000000-0000-4000-8000-000000000002'::uuid), ('12000000-0000-4000-8000-000000000001'::uuid)$$,
  'anon reads only visible, non-archived categories'
);

select is(
  (select count(*)::int from public.menu_items where name like 'Test 12%'),
  4,
  'anon reads only non-archived items of visible, non-archived categories, sold-out included'
);

select is(
  (select count(*)::int from public.modifier_groups where name like 'Test 12%'),
  1,
  'anon reads only non-archived modifier groups linked to a listed item'
);

select is(
  (select count(*)::int from public.modifier_options where name like 'Test 12%'),
  3,
  'anon reads only non-archived options of readable groups, sold-out included'
);

select is(
  (select count(*)::int from public.menu_item_modifier_groups
    where menu_item_id::text like '12000000-%'),
  3,
  'anon reads only the modifier links of listed items'
);

-- Tests 57-62: staff read every row, and menu_public still returns the public menu.
set local role authenticated;
select pg_temp.act_as('12000000-0000-4000-8000-000000000099', 'staff');

select is(
  (select count(*)::int from public.menu_categories where name like 'Test 12%'),
  5,
  'staff read every category, including hidden and archived ones'
);

select is(
  (select count(*)::int from public.menu_items where name like 'Test 12%'),
  7,
  'staff read every item, including archived ones and those in hidden categories'
);

select is(
  (select count(*)::int from public.modifier_groups where name like 'Test 12%'),
  3,
  'staff read every modifier group, including archived and unlinked-to-listed ones'
);

select is(
  (select count(*)::int from public.modifier_options where name like 'Test 12%'),
  5,
  'staff read every modifier option, including archived ones'
);

select is(
  (select count(*)::int from public.menu_item_modifier_groups where menu_item_id::text like '12000000-%'),
  4,
  'staff read every modifier link, including links of unlisted items'
);

select is(
  pg_temp.ids(public.menu_public() -> 'categories', '12000000-'),
  array['12000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000001'],
  'menu_public returns the same public menu to staff'
);

-- Tests 63-67: archiving hides rows from menu_public and keeps them (AC3).
reset role;
update public.menu_items set archived_at = now() where id = '12000000-0000-4000-8000-000000000012';

set local role anon;
select pg_temp.act_anon();

select is(
  pg_temp.ids(pg_temp.menu_category('12000000-0000-4000-8000-000000000001') -> 'items', '12000000-'),
  array['12000000-0000-4000-8000-000000000011', '12000000-0000-4000-8000-000000000013',
        '12000000-0000-4000-8000-000000000015'],
  'an archived item disappears from menu_public'
);

reset role;

select is(
  (select count(*)::int from public.menu_items where id = '12000000-0000-4000-8000-000000000012'),
  1,
  'the archived item row is kept'
);

update public.menu_categories set archived_at = now() where id = '12000000-0000-4000-8000-000000000001';

set local role anon;
select pg_temp.act_anon();

select is(
  pg_temp.ids(public.menu_public() -> 'categories', '12000000-'),
  array['12000000-0000-4000-8000-000000000002'],
  'an archived category disappears from menu_public'
);

select is(
  pg_temp.menu_item('12000000-0000-4000-8000-000000000011'),
  null::jsonb,
  'items of an archived category disappear from menu_public'
);

reset role;

select is(
  (select count(*)::int from public.menu_items where category_id = '12000000-0000-4000-8000-000000000001'),
  5,
  'the archived category keeps its item rows'
);

-- Test 68: an item price can be changed. Orders keep their own price copy
-- (order_items.unit_price) and do not reference menu_items yet, so this test creates no order.
select lives_ok(
  $$ update public.menu_items set price_cents = 1250 where id = '12000000-0000-4000-8000-000000000011' $$,
  'an item price can be changed'
);

-- Tests 69-85: constraints (AC1 and the other menu checks). Each rejected write breaks
-- exactly one constraint.
select throws_ok(
  $$ insert into public.menu_items (category_id, name, price_cents)
     values ('12000000-0000-4000-8000-000000000002', 'Constraint 12 negative price', -1) $$,
  '23514', 'new row for relation "menu_items" violates check constraint "menu_items_price_cents_non_negative"',
  'a negative item price is rejected'
);

select throws_ok(
  $$ insert into public.modifier_options (modifier_group_id, name, price_delta_cents)
     values ('12000000-0000-4000-8000-000000000021', 'Constraint 12 negative delta', -1) $$,
  '23514', 'new row for relation "modifier_options" violates check constraint "modifier_options_price_delta_cents_non_negative"',
  'a negative option price delta is rejected'
);

select throws_ok(
  $$ insert into public.modifier_groups (name, min_select, max_select)
     values ('Constraint 12 min over max', 3, 2) $$,
  '23514', 'new row for relation "modifier_groups" violates check constraint "modifier_groups_min_select_within_max"',
  'min_select greater than max_select is rejected'
);

select throws_ok(
  $$ insert into public.menu_items (category_id, name, price_cents, pos_provider, pos_external_id)
     values ('12000000-0000-4000-8000-000000000002', 'Constraint 12 duplicate POS', 100, 'square', 'TEST-12-SQ-1') $$,
  '23505', 'duplicate key value violates unique constraint "menu_items_pos_provider_pos_external_id_key"',
  'a duplicate (pos_provider, pos_external_id) item pair is rejected'
);

select throws_ok(
  $$ insert into public.menu_items (category_id, name, price_cents, pos_provider, pos_external_id)
     values ('12000000-0000-4000-8000-000000000002', 'Constraint 12 archived POS', 100, 'toast', 'TEST-12-TO-4') $$,
  '23505', 'duplicate key value violates unique constraint "menu_items_pos_provider_pos_external_id_key"',
  'an archived item keeps its POS pair, so a new item cannot reuse it'
);

select lives_ok(
  $$ insert into public.menu_items (category_id, name, price_cents, pos_provider, pos_external_id)
     values ('12000000-0000-4000-8000-000000000002', 'Constraint 12 other provider', 100, 'toast', 'TEST-12-SQ-1') $$,
  'the same external id under another provider is accepted'
);

select lives_ok(
  $$ insert into public.menu_items (category_id, name, price_cents)
     values ('12000000-0000-4000-8000-000000000002', 'Constraint 12 no POS a', 100),
            ('12000000-0000-4000-8000-000000000002', 'Constraint 12 no POS b', 100) $$,
  'several items without POS ids are accepted'
);

select throws_ok(
  $$ insert into public.menu_items (category_id, name, price_cents, pos_external_id)
     values ('12000000-0000-4000-8000-000000000002', 'Constraint 12 POS id without provider', 100, 'TEST-12-X') $$,
  '23514', 'new row for relation "menu_items" violates check constraint "menu_items_pos_identity_complete"',
  'a POS id without a provider is rejected'
);

select throws_ok(
  $$ insert into public.modifier_options (modifier_group_id, name, pos_provider, pos_external_id)
     values ('12000000-0000-4000-8000-000000000021', 'Constraint 12 duplicate option POS', 'square', 'TEST-12-OPT-1') $$,
  '23505', 'duplicate key value violates unique constraint "modifier_options_pos_provider_pos_external_id_key"',
  'a duplicate (pos_provider, pos_external_id) option pair is rejected'
);

select throws_ok(
  $$ insert into public.menu_items (category_id, name, price_cents, available_days)
     values ('12000000-0000-4000-8000-000000000002', 'Constraint 12 bad day', 100, '{1,8}') $$,
  '23514', 'new row for relation "menu_items" violates check constraint "menu_items_available_days_valid"',
  'a weekday outside 1-7 is rejected'
);

select throws_ok(
  $$ insert into public.menu_items (category_id, name, price_cents, available_from, available_until)
     values ('12000000-0000-4000-8000-000000000002', 'Constraint 12 bad window', 100, '14:00', '10:00') $$,
  '23514', 'new row for relation "menu_items" violates check constraint "menu_items_available_window_order"',
  'a window that ends before it starts is rejected'
);

select throws_ok(
  $$ insert into public.menu_items (category_id, name, price_cents, available_from)
     values ('12000000-0000-4000-8000-000000000002', 'Constraint 12 half window', 100, '10:00') $$,
  '23514', 'new row for relation "menu_items" violates check constraint "menu_items_available_window_complete"',
  'a window with only a start time is rejected'
);

select throws_ok(
  $$ insert into public.menu_items (category_id, name, price_cents, available_days)
     values ('12000000-0000-4000-8000-000000000002', 'Constraint 12 no days', 100, '{}') $$,
  '23514', 'new row for relation "menu_items" violates check constraint "menu_items_available_days_valid"',
  'an empty weekday list is rejected (NULL means every day)'
);

select throws_ok(
  $$ insert into public.menu_items (category_id, name, price_cents, translations)
     values ('12000000-0000-4000-8000-000000000002', 'Constraint 12 bad translations', 100, '[]') $$,
  '23514', 'new row for relation "menu_items" violates check constraint "menu_items_translations_is_object"',
  'translations that are not a JSON object are rejected'
);

select throws_ok(
  $$ insert into public.modifier_groups (name, min_select, max_select)
     values ('Constraint 12 negative min', -1, 1) $$,
  '23514', 'new row for relation "modifier_groups" violates check constraint "modifier_groups_min_select_non_negative"',
  'a negative min_select is rejected'
);

select throws_ok(
  $$ insert into public.modifier_groups (name, min_select, max_select)
     values ('Constraint 12 zero max', 0, 0) $$,
  '23514', 'new row for relation "modifier_groups" violates check constraint "modifier_groups_max_select_positive"',
  'a max_select of zero is rejected'
);

select throws_ok(
  $$ insert into public.modifier_options (modifier_group_id, name, pos_provider)
     values ('12000000-0000-4000-8000-000000000021', 'Constraint 12 option provider without id', 'square') $$,
  '23514', 'new row for relation "modifier_options" violates check constraint "modifier_options_pos_identity_complete"',
  'an option POS provider without an id is rejected'
);

select * from finish();
rollback;
