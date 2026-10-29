-- DATA-02 follow-up: harden the identity layer.
-- Forward-only: fixes 20261028000004_init_identity.sql and 20261028000005_custom_access_token_hook.sql
-- without editing them (both are already on main).
--
-- Fixes:
--   1. The staff policy on user_roles queried user_roles from inside a user_roles policy, and
--      the staff policy on profiles queried user_roles. Postgres rejects both as infinite
--      recursion, so every authenticated read of profiles or user_roles failed.
--   2. is_staff/is_admin/is_owner returned NULL (not false) when there is no app_role claim.
--   3. set_user_role used SQLSTATE 'PERM', which plpgsql rejects (42704). Permission errors now
--      raise 42501. Owner rows are locked so two concurrent demotions cannot both pass the
--      last-owner check.
--   4. The access token hook wrote app_role at the top level of the event. Supabase reads the
--      claims object, so the claim never reached the JWT. The hook also needs grants for
--      supabase_auth_admin, otherwise token issuance fails once the hook is enabled.
--   5. user_roles was only revoked from authenticated. anon still held write grants.
--   6. Users could write profiles.email (the auth.users mirror) and any column they liked.
--   7. Email casing was not normalised. Birthday pairs could be half-filled, and Feb 30 or
--      Apr 31 were accepted.

-- 1. RLS: use the JWT helper for staff reads, as the ticket specifies for RLS.
drop policy if exists "Staff can view all profiles" on public.profiles;
create policy "Staff can view all profiles"
  on public.profiles
  for select
  using (public.is_staff());

drop policy if exists "Staff can view all roles" on public.user_roles;
create policy "Staff can view all roles"
  on public.user_roles
  for select
  using (public.is_staff());

-- 2. Helpers return false, not NULL, when the claim is missing (anon).
create or replace function public.is_staff()
returns boolean as $$
begin
  return coalesce(auth.jwt() ->> 'app_role' in ('staff', 'admin', 'owner'), false);
end;
$$ language plpgsql stable security definer set search_path = '';

create or replace function public.is_admin()
returns boolean as $$
begin
  return coalesce(auth.jwt() ->> 'app_role' in ('admin', 'owner'), false);
end;
$$ language plpgsql stable security definer set search_path = '';

create or replace function public.is_owner()
returns boolean as $$
begin
  return coalesce(auth.jwt() ->> 'app_role' = 'owner', false);
end;
$$ language plpgsql stable security definer set search_path = '';

-- 3. set_user_role: same rules as before, with valid SQLSTATEs and a lock on owner rows.
create or replace function public.set_user_role(
  p_user_id uuid,
  p_role public.app_role
)
returns void as $$
declare
  v_caller_role public.app_role;
  v_owner_count integer;
begin
  -- Re-check the caller's role in the table, not the JWT: a demoted staff member must be
  -- rejected before the JWT expires.
  select role into v_caller_role from public.user_roles
  where user_id = auth.uid();

  if v_caller_role is null then
    raise exception 'Caller has no role' using errcode = '42501';
  end if;

  if v_caller_role not in ('owner', 'admin') then
    raise exception 'Permission denied: insufficient role' using errcode = '42501';
  end if;

  if v_caller_role = 'admin' and p_role in ('admin', 'owner') then
    raise exception 'Admin cannot grant admin or owner role' using errcode = '42501';
  end if;

  if auth.uid() = p_user_id then
    raise exception 'Cannot change your own role' using errcode = '42501';
  end if;

  -- Lock every owner row before counting, so concurrent demotions serialise.
  perform 1 from public.user_roles where role = 'owner' for update;

  if p_role <> 'owner' then
    select count(*) into v_owner_count from public.user_roles
    where role = 'owner';

    if v_owner_count = 1 and exists (
      select 1 from public.user_roles
      where user_id = p_user_id and role = 'owner'
    ) then
      raise exception 'Cannot demote the last remaining owner' using errcode = '42501';
    end if;
  end if;

  update public.user_roles
  set role = p_role, granted_by = auth.uid(), granted_at = now(), updated_at = now()
  where user_id = p_user_id;

  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
end;
$$ language plpgsql security definer set search_path = '';

revoke execute on function public.set_user_role(uuid, public.app_role) from public, anon;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;

-- 4. Access token hook: add app_role inside the claims object that Supabase reads.
create or replace function private.custom_access_token_hook(event jsonb)
returns jsonb as $$
declare
  v_role public.app_role;
  v_claims jsonb;
begin
  select role into v_role from public.user_roles
  where user_id = (event->>'user_id')::uuid;

  v_claims := coalesce(event->'claims', '{}'::jsonb)
    || jsonb_build_object('app_role', v_role);

  return jsonb_set(event, '{claims}', v_claims);
end;
$$ language plpgsql security definer set search_path = '';

revoke execute on function private.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant usage on schema private to supabase_auth_admin;
grant execute on function private.custom_access_token_hook(jsonb) to supabase_auth_admin;

-- 5. Only the RLS-protected read path is open to clients. Writes are not granted to anon or
--    authenticated, and no write policy exists on user_roles.
revoke all on public.user_roles from anon;
revoke insert, update, delete, truncate on public.user_roles from authenticated;

-- 6. Clients may update only their own profile fields. email mirrors auth.users and
--    birthday_locked_at is server-owned.
revoke update on public.profiles from anon, authenticated;
grant update (first_name, last_name, phone_e164, birthday_month, birthday_day, province, locale)
  on public.profiles to authenticated;

-- 7a. Email casing is normalised on sign-up and on email change.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = '';

create or replace function public.sync_profile_email()
returns trigger as $$
begin
  update public.profiles
  set email = lower(new.email)
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

-- 7b. Birthday: month and day are both set or both null, and the day must exist in that month.
--     (Leap day is allowed.) The existing combined check passed when one side was null.
alter table public.profiles
  add constraint profiles_birthday_both_or_neither
  check ((birthday_month is null) = (birthday_day is null));

alter table public.profiles
  add constraint profiles_birthday_day_fits_month
  check (
    birthday_month is null or
    birthday_day <= (array[31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31])[birthday_month]
  );
