-- Fix function search path for set_updated_at
drop function if exists public.set_updated_at() cascade;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Recreate the trigger
create trigger set_forecast_cache_updated_at_trigger
before update on public.forecast_cache
for each row
execute function public.set_updated_at();