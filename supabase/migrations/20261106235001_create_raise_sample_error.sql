-- DATA-13 AC1: sample RPC that always raises INSUFFICIENT_POINTS.
-- One concern: the public.raise_sample_error function.
--
-- SAMPLE ONLY. It exists to prove the error contract end to end (SQL -> PostgREST ->
-- packages/api normalizeError -> typed DomainError). Remove it in a new migration once
-- LOY-01 ships a real caller of INSUFFICIENT_POINTS, and regenerate database.types.ts.
--
-- SECURITY DEFINER because authenticated has no USAGE on the private schema. This is the
-- same path LOY-01 functions use to reach private.raise_app_error.
--
-- Forward-only: no existing migration is edited.

create or replace function public.raise_sample_error()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.raise_app_error('INSUFFICIENT_POINTS');
end
$$;

comment on function public.raise_sample_error() is
  'DATA-13 AC1 sample: always raises INSUFFICIENT_POINTS (SQLSTATE SS001). Remove once LOY-01 ships.';

revoke execute on function public.raise_sample_error() from public, anon;
grant execute on function public.raise_sample_error() to authenticated;
