-- Restore the DATA-02 hardening of public.set_user_role, which
-- 20261029120000_fix_set_user_role_error_codes.sql overwrote.
--
-- That migration recreated the function from the pre-hardening body, which dropped:
--   1. the FOR UPDATE lock on owner rows before the last-owner count, so two concurrent
--      demotions could both pass the check; and
--   2. the updated_at update when a role changes.
--
-- This migration recreates the function with the body of
-- 20261028000006_identity_hardening.sql, unchanged, and re-asserts that migration's grants.
-- The hardened body already raises 42501 for permission denials and P0002 for a missing
-- user, so the error-code fix is kept.
--
-- Forward-only: no existing migration is edited.

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
