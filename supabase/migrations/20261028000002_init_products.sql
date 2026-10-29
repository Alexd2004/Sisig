-- Initialize products/menu items
-- One concern: Product catalog and ordering

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null,
  price integer not null,
  image_url text,
  is_available boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index idx_products_category on public.products(category);
create index idx_products_is_available on public.products(is_available);

comment on table public.products is 'Menu items available for ordering';
comment on column public.products.price is 'Price in cents (e.g., 1999 = $19.99)';
comment on column public.products.category is 'Product category (e.g., burger, side, drink)';

-- RLS Policies
alter table public.products enable row level security;

create policy "Anyone can view available products"
  on public.products
  for select
  using (is_available = true);

create policy "Staff and admins can view all products"
  on public.products
  for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('staff', 'admin')
    )
  );

create policy "Staff and admins can insert products"
  on public.products
  for insert
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('staff', 'admin')
    )
  );

create policy "Staff and admins can update products"
  on public.products
  for update
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('staff', 'admin')
    )
  );
