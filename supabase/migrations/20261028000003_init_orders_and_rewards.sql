-- Initialize orders and rewards/loyalty system
-- One concern: Order management
-- One concern: Loyalty/rewards tracking

create type public.order_status as enum ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  total_amount integer not null,
  points_earned integer not null default 0,
  status public.order_status not null default 'pending',
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index idx_orders_user_id on public.orders(user_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_created_at on public.orders(created_at desc);

comment on table public.orders is 'Customer orders';
comment on column public.orders.total_amount is 'Order total in cents';
comment on column public.orders.points_earned is 'Loyalty points earned from this order';

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price integer not null,
  created_at timestamp with time zone not null default now()
);

create index idx_order_items_order_id on public.order_items(order_id);
create index idx_order_items_product_id on public.order_items(product_id);

comment on table public.order_items is 'Line items in an order';
comment on column public.order_items.unit_price is 'Price in cents at time of order';

-- Loyalty program
create table if not exists public.loyalty_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  total_points integer not null default 0,
  redeemed_points integer not null default 0,
  available_points integer generated always as (total_points - redeemed_points) stored,
  last_transaction_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

comment on table public.loyalty_points is 'Loyalty points balance per user';
comment on column public.loyalty_points.available_points is 'Points available to redeem (total - redeemed)';

create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  points_amount integer not null,
  transaction_type text not null check (transaction_type in ('earned', 'redeemed')),
  reason text,
  order_id uuid references public.orders(id),
  created_at timestamp with time zone not null default now()
);

create index idx_loyalty_transactions_user_id on public.loyalty_transactions(user_id);
create index idx_loyalty_transactions_created_at on public.loyalty_transactions(created_at desc);

comment on table public.loyalty_transactions is 'Log of all points transactions';

-- RLS Policies
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.loyalty_points enable row level security;
alter table public.loyalty_transactions enable row level security;

create policy "Users can view their own orders"
  on public.orders
  for select
  using (auth.uid() = user_id);

create policy "Users can create orders"
  on public.orders
  for insert
  with check (auth.uid() = user_id);

create policy "Staff can view all orders"
  on public.orders
  for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('staff', 'admin')
    )
  );

create policy "Users can view their order items"
  on public.order_items
  for select
  using (
    exists (
      select 1 from public.orders
      where id = order_items.order_id and user_id = auth.uid()
    )
  );

create policy "Users can view their loyalty points"
  on public.loyalty_points
  for select
  using (auth.uid() = user_id);

create policy "Users can view their loyalty transactions"
  on public.loyalty_transactions
  for select
  using (auth.uid() = user_id);
