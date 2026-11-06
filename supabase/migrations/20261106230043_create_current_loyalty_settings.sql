-- DATA-04: look up the loyalty settings version in effect at a given time.
-- One concern: the public.current_loyalty_settings function.
--
-- Returns the version with the latest effective_from at or before p_at (default now()).
-- The -infinity baseline row and the unique effective_from constraint mean exactly one
-- version is returned for every non-null timestamp. A version takes effect at its
-- effective_from, inclusive.
--
-- The function runs as the caller (security invoker), so it reads only what the caller
-- may read. API roles hold SELECT only on public.loyalty_settings.
--
-- Forward-only: no existing migration is edited.

create or replace function public.current_loyalty_settings(
  p_at timestamp with time zone default now()
)
returns public.loyalty_settings
language sql
stable
strict
set search_path = ''
as $$
  select s.*
  from public.loyalty_settings s
  where s.effective_from <= p_at
  order by s.effective_from desc
  limit 1
$$;

comment on function public.current_loyalty_settings(timestamp with time zone) is
  'Loyalty settings version in effect at p_at (default now()). The -infinity baseline and unique effective_from give exactly one version for every timestamp.';

revoke execute on function public.current_loyalty_settings(timestamp with time zone) from public;
grant execute on function public.current_loyalty_settings(timestamp with time zone)
  to anon, authenticated, service_role;
