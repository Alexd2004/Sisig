-- Seed data for local development and testing

-- Products (menu items)
insert into public.products (name, description, category, price, is_available) values
  ('Classic Burger', 'Juicy beef patty with lettuce, tomato, and mayo', 'burger', 1299, true),
  ('Sisig Bowl', 'Spicy chopped pork with liver and onions', 'bowl', 1099, true),
  ('Sweet Potato Fries', 'Crispy sweet potato fries with sea salt', 'side', 599, true),
  ('Iced Lemonade', 'Fresh lemonade over ice', 'drink', 399, true),
  ('Mango Shake', 'Creamy mango milkshake', 'drink', 699, true),
  ('Chocolate Cake', 'Rich chocolate cake slice', 'dessert', 499, true),
  ('Salmon Poke Bowl', 'Sushi-grade salmon with rice and vegetables', 'bowl', 1599, true)
on conflict do nothing;

-- Store location (DATA-18): one PLACEHOLDER Edmonton store for local development only.
-- Real store data comes from the client. Do not add a second store.
-- The placeholder loyalty settings live in a migration (create_loyalty_settings), not here.
insert into public.locations (id, name, address, latitude, longitude, timezone, hours, ordering_enabled) values
  ('10ca7100-0000-4000-8000-000000000001', 'PLACEHOLDER Sisig Edmonton', 'PLACEHOLDER address, Edmonton, AB', 53.546100, -113.493800, 'America/Edmonton', '{}', false)
on conflict do nothing;

-- Menu (DATA-03): a small PLACEHOLDER chain-wide menu for local development and CI only.
-- Names, prices and tags are not real; the real menu comes from the client (CMS-01).
-- Every id starts with 3e000000- and every name with PLACEHOLDER. One shared modifier
-- group (Add-ons) is linked to three items. One item is weekend-only and one is sold out.
insert into public.menu_categories (id, name, description, sort_order, is_visible) values
  ('3e000000-0000-4000-8000-000000000101', 'PLACEHOLDER Mains', 'PLACEHOLDER category', 10, true),
  ('3e000000-0000-4000-8000-000000000102', 'PLACEHOLDER Sides', 'PLACEHOLDER category', 20, true),
  ('3e000000-0000-4000-8000-000000000103', 'PLACEHOLDER Drinks', 'PLACEHOLDER category', 30, true)
on conflict do nothing;

insert into public.menu_items
  (id, category_id, name, description, price_cents, is_available, is_featured, dietary_tags, allergen_note, available_days, sort_order)
values
  ('3e000000-0000-4000-8000-000000000201', '3e000000-0000-4000-8000-000000000101', 'PLACEHOLDER Sisig Rice Bowl',
   'PLACEHOLDER item', 1499, true, true, '{spicy,contains-pork}', 'PLACEHOLDER: contains egg and soy', null, 10),
  ('3e000000-0000-4000-8000-000000000202', '3e000000-0000-4000-8000-000000000101', 'PLACEHOLDER Tocilog',
   'PLACEHOLDER item', 1599, true, false, '{contains-pork}', null, null, 20),
  ('3e000000-0000-4000-8000-000000000203', '3e000000-0000-4000-8000-000000000101', 'PLACEHOLDER Weekend Lechon Kawali',
   'PLACEHOLDER item, weekends only', 1899, true, false, '{contains-pork}', null, '{6,7}', 30),
  ('3e000000-0000-4000-8000-000000000204', '3e000000-0000-4000-8000-000000000102', 'PLACEHOLDER Garlic Rice',
   'PLACEHOLDER item', 399, true, false, '{vegetarian}', null, null, 10),
  ('3e000000-0000-4000-8000-000000000205', '3e000000-0000-4000-8000-000000000103', 'PLACEHOLDER Calamansi Juice',
   'PLACEHOLDER item', 449, true, false, '{vegan}', null, null, 10),
  ('3e000000-0000-4000-8000-000000000206', '3e000000-0000-4000-8000-000000000103', 'PLACEHOLDER Ube Shake',
   'PLACEHOLDER item, sold out', 699, false, false, '{}', null, null, 20)
on conflict do nothing;

insert into public.modifier_groups (id, name, min_select, max_select, is_required) values
  ('3e000000-0000-4000-8000-000000000301', 'PLACEHOLDER Add-ons', 0, 2, false)
on conflict do nothing;

insert into public.modifier_options (id, modifier_group_id, name, price_delta_cents, sort_order) values
  ('3e000000-0000-4000-8000-000000000401', '3e000000-0000-4000-8000-000000000301', 'PLACEHOLDER Add egg', 150, 10),
  ('3e000000-0000-4000-8000-000000000402', '3e000000-0000-4000-8000-000000000301', 'PLACEHOLDER Extra rice', 250, 20)
on conflict do nothing;

insert into public.menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) values
  ('3e000000-0000-4000-8000-000000000201', '3e000000-0000-4000-8000-000000000301', 10),
  ('3e000000-0000-4000-8000-000000000202', '3e000000-0000-4000-8000-000000000301', 10),
  ('3e000000-0000-4000-8000-000000000203', '3e000000-0000-4000-8000-000000000301', 10)
on conflict do nothing;
