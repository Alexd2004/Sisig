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
