-- Initialize user-related tables
-- One concern: User profiles and authentication metadata

create type public.user_role as enum ('customer', 'staff', 'admin');

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role public.user_role not null default 'customer',
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index idx_users_email on public.users(email);
create index idx_users_role on public.users(role);
create index idx_users_is_active on public.users(is_active);

comment on table public.users is 'User profiles linked to auth.users';
comment on column public.users.role is 'User role: customer, staff, or admin';
comment on column public.users.is_active is 'Soft delete flag for user accounts';

-- Function to create user profile on auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

-- Trigger to auto-create user profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS Policies
alter table public.users enable row level security;

create policy "Users can view their own profile"
  on public.users
  for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = 'customer');

create policy "Admins can view all users"
  on public.users
  for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('staff', 'admin')
    )
  );
