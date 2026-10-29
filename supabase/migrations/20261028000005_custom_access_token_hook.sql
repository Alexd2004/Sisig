-- Custom JWT claim hook to add app_role to access tokens
-- This hook runs when a token is issued or refreshed

create or replace function private.custom_access_token_hook(event jsonb)
returns jsonb as $$
declare
  v_role public.app_role;
begin
  -- Fetch the user's role
  select role into v_role from public.user_roles
  where user_id = (event->>'user_id')::uuid;

  -- Add app_role claim to JWT
  event := event || jsonb_build_object('app_role', v_role);

  return event;
end;
$$ language plpgsql security definer set search_path = '';
