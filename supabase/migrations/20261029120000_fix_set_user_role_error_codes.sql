-- Fix invalid error codes in public.set_user_role (DATA-02).
--
-- 20261028000004_init_identity.sql raised with errcode 'PERM' and 'NTFND'.
-- 'PERM' is neither a condition name nor a 5-character SQLSTATE, so every
-- denial failed with "unrecognized exception condition" (42704) instead of
-- a permission error. 'NTFND' is a non-standard code, so it is replaced with
-- the standard no_data_found too.
--
-- Forward-only: the original migration is not edited. This replaces the
-- function with the same logic; only the error codes change. create or
-- replace keeps the existing owner and grants.

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
    raise exception 'Caller has no role' using errcode = 'insufficient_privilege';
  end if;

  -- Only owner and admin can change roles
  if v_caller_role not in ('owner', 'admin') then
    raise exception 'Permission denied: insufficient role' using errcode = 'insufficient_privilege';
  end if;

  -- Admin cannot grant admin/owner
  if v_caller_role = 'admin' and p_role in ('admin', 'owner') then
    raise exception 'Admin cannot grant admin or owner role' using errcode = 'insufficient_privilege';
  end if;

  -- Nobody can change their own role
  if auth.uid() = p_user_id then
    raise exception 'Cannot change your own role' using errcode = 'insufficient_privilege';
  end if;

  -- Cannot demote the last owner
  if p_role != 'owner' then
    select count(*) into v_owner_count from public.user_roles
    where role = 'owner';

    if v_owner_count = 1 and exists (
      select 1 from public.user_roles
      where user_id = p_user_id and role = 'owner'
    ) then
      raise exception 'Cannot demote the last remaining owner' using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- Update the role
  update public.user_roles
  set role = p_role, granted_by = auth.uid(), granted_at = now()
  where user_id = p_user_id;

  if not found then
    raise exception 'User not found' using errcode = 'no_data_found';
  end if;
end;
$$ language plpgsql security definer set search_path = '';
