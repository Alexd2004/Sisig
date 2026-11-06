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
