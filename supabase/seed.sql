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

-- Test user (use in mobile app testing)
-- Note: In production, users are created via auth.users signup
-- For testing, we can insert directly if needed
-- insert into public.users (id, email, first_name, last_name, role) values
--   ('00000000-0000-0000-0000-000000000001'::uuid, 'test@example.com', 'Test', 'User', 'customer');

-- Sample loyalty points (after test user is created)
-- insert into public.loyalty_points (user_id, total_points) values
--   ('00000000-0000-0000-0000-000000000001'::uuid, 500);
