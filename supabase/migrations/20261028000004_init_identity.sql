-- User identity and role management
-- One concern: User profiles with metadata
-- One concern: Role-based access control (RBAC)

create type public.app_role as enum ('customer', 'staff', 'admin', 'owner');

-- Profiles table: user metadata (separate from auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone_e164 text,
  check (
    phone_e164 is null or
    phone_e164 ~ '^\+[1-9]\d{1,14}$'  -- E.164 format validation
  ),
  birthday_month smallint,
  birthday_day smallint,
  check (
    (birthday_month is null and birthday_day is null) or
    (birthday_month between 1 and 12 and birthday_day between 1 and 31)
  ),
  birthday_locked_at timestamp with time zone,
  province text,
  locale text not null default 'en-CA' check (locale in ('en-CA', 'fr-CA')),
  email text not null unique,  -- Mirror from auth.users for admin search
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index idx_profiles_email on public.profiles(email);
create index idx_profiles_created_at on public.profiles(created_at desc);

comment on table public.profiles is 'User metadata, separate from auth.users for security';
comment on column public.profiles.phone_e164 is 'International format: +[country][number]';
comment on column public.profiles.birthday_month is 'Month only (1-12), no year for data minimisation';
comment on column public.profiles.birthday_day is 'Day only (1-31), no year';
comment on column public.profiles.locale is 'User language preference: en-CA or fr-CA';

-- User roles: kept separate from profiles so role changes never touch profile data
create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.app_role not null default 'customer',
  granted_by uuid references public.profiles(id),
  granted_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index idx_user_roles_role on public.user_roles(role);

comment on table public.user_roles is 'User roles kept separate from profiles for security';
comment on column public.user_roles.granted_by is 'User who granted this role (null for signup)';

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

-- Users can view their own profile
create policy "Users can view their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Staff and admins can view all profiles
create policy "Staff can view all profiles"
  on public.profiles
  for select
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role in ('staff', 'admin', 'owner')
    )
  );

-- Users can view their own role
create policy "Users can view their own role"
  on public.user_roles
  for select
  using (auth.uid() = user_id);

-- Staff and admins can view all roles
create policy "Staff can view all roles"
  on public.user_roles
  for select
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role in ('staff', 'admin', 'owner')
    )
  );

-- Create profile and customer role on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = '';

-- Sync email from auth.users to profiles on email change
create or replace function public.sync_profile_email()
returns trigger as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

-- Trigger to auto-create profile and role on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger to sync email changes
drop trigger if exists on_auth_email_changed on auth.users;
create trigger on_auth_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute procedure public.sync_profile_email();

-- Helper functions for RLS (read JWT claim for speed)
create or replace function public.is_staff()
returns boolean as $$
begin
  return auth.jwt() ->> 'app_role' in ('staff', 'admin', 'owner');
end;
$$ language plpgsql stable security definer set search_path = '';

create or replace function public.is_admin()
returns boolean as $$
begin
  return auth.jwt() ->> 'app_role' in ('admin', 'owner');
end;
$$ language plpgsql stable security definer set search_path = '';

create or replace function public.is_owner()
returns boolean as $$
begin
  return auth.jwt() ->> 'app_role' = 'owner';
end;
$$ language plpgsql stable security definer set search_path = '';

-- Set user role (only owner/admin can grant, with restrictions)
create or replace function public.set_user_role(
  p_user_id uuid,
  p_role public.app_role
)
returns void as $$
declare
  v_caller_role public.app_role;
  v_owner_count integer;
begin
  -- Check caller's actual role (not JWT, in case demoted)
  select role into v_caller_role from public.user_roles
  where user_id = auth.uid();

  if v_caller_role is null then
    raise exception 'Caller has no role' using errcode = 'PERM';
  end if;

  -- Only owner and admin can change roles
  if v_caller_role not in ('owner', 'admin') then
    raise exception 'Permission denied: insufficient role' using errcode = 'PERM';
  end if;

  -- Admin cannot grant admin/owner
  if v_caller_role = 'admin' and p_role in ('admin', 'owner') then
    raise exception 'Admin cannot grant admin or owner role' using errcode = 'PERM';
  end if;

  -- Nobody can change their own role
  if auth.uid() = p_user_id then
    raise exception 'Cannot change your own role' using errcode = 'PERM';
  end if;

  -- Cannot demote the last owner
  if p_role != 'owner' then
    select count(*) into v_owner_count from public.user_roles
    where role = 'owner';

    if v_owner_count = 1 and exists (
      select 1 from public.user_roles
      where user_id = p_user_id and role = 'owner'
    ) then
      raise exception 'Cannot demote the last remaining owner' using errcode = 'PERM';
    end if;
  end if;

  -- Update the role
  update public.user_roles
  set role = p_role, granted_by = auth.uid(), granted_at = now()
  where user_id = p_user_id;

  if not found then
    raise exception 'User not found' using errcode = 'NTFND';
  end if;
end;
$$ language plpgsql security definer set search_path = '';

-- Revoke direct write access to user_roles
revoke insert, update, delete on public.user_roles from authenticated;
